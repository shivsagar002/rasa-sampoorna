import { describe, it, expect, vi, beforeEach } from "vitest";
import { InventoryService } from "@/modules/inventory/inventory.service";
import { prisma } from "@/lib/db/prisma";
import { BadRequestError } from "@/lib/api/errors";
import { InventoryMovementType, InventoryReservationStatus, ProductStatus } from "@prisma/client";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    inventoryMovement: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    inventoryReservation: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));

describe("Inventory Management & Reservation Concurrency Tests", () => {
  const inventoryService = new InventoryService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Stock Adjustments & Audit Movements", () => {
    it("should increase stock on restock and record InventoryMovement", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
        name: "Lotus Bloom Saree",
        stockQuantity: 5,
        status: ProductStatus.ACTIVE,
      } as any);

      vi.mocked(prisma.inventoryMovement.create).mockResolvedValueOnce({
        id: "mov-123",
      } as any);

      const result = await inventoryService.adjustStock({
        productId: "prod-1",
        quantityDelta: 10,
        type: InventoryMovementType.RESTOCK,
        reason: "Diwali festival batch shipment received",
        reference: "PO-9002",
      });

      expect(result.previousStock).toBe(5);
      expect(result.newStock).toBe(15);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: "prod-1" },
        data: { stockQuantity: 15, status: undefined },
      });
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId: "prod-1",
          quantityDelta: 10,
          previousStock: 5,
          newStock: 15,
          type: InventoryMovementType.RESTOCK,
        }),
      });
    });

    it("should prevent reducing stock below zero", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
        name: "Lotus Bloom Saree",
        stockQuantity: 3,
      } as any);

      await expect(
        inventoryService.adjustStock({
          productId: "prod-1",
          quantityDelta: -5, // Excess reduction
          reason: "Damaged pieces write-off",
        })
      ).rejects.toThrow(BadRequestError);
    });

    it("should trigger OUT_OF_STOCK status when stock reaches 0", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({
        id: "prod-1",
        name: "Lotus Bloom Saree",
        stockQuantity: 2,
      } as any);

      vi.mocked(prisma.inventoryMovement.create).mockResolvedValueOnce({ id: "mov-0" } as any);

      await inventoryService.adjustStock({
        productId: "prod-1",
        quantityDelta: -2,
        reason: "Sold out",
      });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: "prod-1" },
        data: { stockQuantity: 0, status: ProductStatus.OUT_OF_STOCK },
      });
    });

    it("reports physical and reserved units without inventing inventory cost", async () => {
      vi.mocked(prisma.product.aggregate).mockResolvedValue({
        _sum: { stockQuantity: 18 },
      } as any);
      vi.mocked(prisma.inventoryReservation.aggregate).mockResolvedValue({
        _sum: { quantity: 3 },
      } as any);
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        { stockQuantity: 1, lowStockThreshold: 2 },
        { stockQuantity: 6, lowStockThreshold: 2 },
      ] as any);

      const result = await inventoryService.getInventorySummary();

      expect(result).toEqual({
        totalStockUnits: 18,
        reservedStock: 3,
        lowStockProducts: 1,
        inventoryValue: null,
      });
    });
  });

  describe("Checkout Stock Reservation & Overselling Prevention", () => {
    it("should reserve available stock during checkout", async () => {
      vi.mocked(prisma.inventoryReservation.updateMany).mockResolvedValueOnce({ count: 0 }); // expiry cleanup
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce({
        id: "var-1",
        stockQuantity: 5,
        product: { name: "Coral Whispers Saree" },
      } as any);

      vi.mocked(prisma.inventoryReservation.aggregate).mockResolvedValueOnce({
        _sum: { quantity: 1 }, // 1 currently held by another cart
      } as any);

      vi.mocked(prisma.inventoryReservation.create).mockResolvedValueOnce({
        id: "res-01",
        variantId: "var-1",
        quantity: 2,
        reference: "cart-abc",
        status: InventoryReservationStatus.PENDING,
      } as any);

      const result = await inventoryService.reserveStock({
        items: [{ variantId: "var-1", quantity: 2 }],
        reference: "cart-abc",
        ttlMinutes: 15,
      });

      expect(result.reservations.length).toBe(1);
      expect(prisma.inventoryReservation.create).toHaveBeenCalled();
    });

    it("should reject reservation and prevent overselling when requested > available", async () => {
      vi.mocked(prisma.inventoryReservation.updateMany).mockResolvedValueOnce({ count: 0 });
      vi.mocked(prisma.productVariant.findUnique).mockResolvedValueOnce({
        id: "var-1",
        stockQuantity: 3, // Total stock: 3
        product: { name: "Coral Whispers Saree" },
      } as any);

      vi.mocked(prisma.inventoryReservation.aggregate).mockResolvedValueOnce({
        _sum: { quantity: 2 }, // 2 already reserved
      } as any);

      // Remaining available = 3 - 2 = 1. Requesting 2 must fail!
      await expect(
        inventoryService.reserveStock({
          items: [{ variantId: "var-1", quantity: 2 }],
          reference: "cart-xyz",
          ttlMinutes: 15,
        })
      ).rejects.toThrow(BadRequestError);
    });

    it("should release reserved stock upon cancellation", async () => {
      vi.mocked(prisma.inventoryReservation.updateMany).mockResolvedValueOnce({ count: 2 });

      const result = await inventoryService.releaseReservation("cart-abandoned");
      expect(result.success).toBe(true);
      expect(result.releasedCount).toBe(2);
      expect(prisma.inventoryReservation.updateMany).toHaveBeenCalledWith({
        where: { reference: "cart-abandoned", status: InventoryReservationStatus.PENDING },
        data: { status: InventoryReservationStatus.RELEASED },
      });
    });

    it("should commit reservation and decrement physical inventory on order success", async () => {
      vi.mocked(prisma.inventoryReservation.findMany).mockResolvedValueOnce([
        {
          id: "res-1",
          variantId: "var-1",
          quantity: 2,
          variant: {
            productId: "prod-1",
            stockQuantity: 10,
            product: { name: "Silk Saree" },
          },
        },
      ] as any);

      const result = await inventoryService.commitReservation("order-confirmed-101");
      expect(result.committedCount).toBe(1);

      // Verify physical variant stock decremented
      expect(prisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: "var-1" },
        data: { stockQuantity: 8 },
      });

      // Verify SALE movement logged
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quantityDelta: -2,
          previousStock: 10,
          newStock: 8,
          type: InventoryMovementType.SALE,
        }),
      });

      // Verify reservation status marked COMMITTED
      expect(prisma.inventoryReservation.update).toHaveBeenCalledWith({
        where: { id: "res-1" },
        data: { status: InventoryReservationStatus.COMMITTED },
      });
    });
  });
});
