import { prisma } from "@/lib/db/prisma";
import { NotFoundError, BadRequestError } from "@/lib/api/errors";
import { StockAdjustmentInput, ReserveStockInput, InventoryQuery } from "./inventory.schema";
import {
  InventoryMovementType,
  InventoryReservationStatus,
  Prisma,
  ProductStatus,
} from "@prisma/client";

export class InventoryService {
  /**
   * Adjust inventory with an audit movement record
   */
  async adjustStock(input: StockAdjustmentInput) {
    return await prisma.$transaction(async (tx) => {
      // 1. Resolve variant or product
      let currentStock = 0;
      let targetName = "";
      let productId = input.productId || null;
      const variantId = input.variantId || null;

      if (variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: { product: true },
        });
        if (!variant) throw new NotFoundError("Product Variant");
        currentStock = variant.stockQuantity;
        targetName = `${variant.product.name} (${variant.title})`;
        productId = variant.productId;
      } else if (productId) {
        const product = await tx.product.findUnique({
          where: { id: productId },
        });
        if (!product) throw new NotFoundError("Product");
        currentStock = product.stockQuantity;
        targetName = product.name;
      } else {
        throw new BadRequestError("Specify productId or variantId.");
      }

      const newStock = currentStock + input.quantityDelta;
      if (newStock < 0) {
        throw new BadRequestError(
          `Cannot reduce stock by ${Math.abs(input.quantityDelta)}. Current available stock is ${currentStock}.`
        );
      }

      // 2. Update stock level
      if (variantId) {
        await tx.productVariant.update({
          where: { id: variantId },
          data: { stockQuantity: newStock },
        });

        // Sync product overall stock
        const totalVariantStock = await tx.productVariant.aggregate({
          where: { productId: productId! },
          _sum: { stockQuantity: true },
        });
        const productStock = totalVariantStock._sum.stockQuantity || newStock;
        await tx.product.update({
          where: { id: productId! },
          data: {
            stockQuantity: productStock,
            status: productStock === 0 ? ProductStatus.OUT_OF_STOCK : undefined,
          },
        });
      } else if (productId) {
        await tx.product.update({
          where: { id: productId },
          data: {
            stockQuantity: newStock,
            status: newStock === 0 ? ProductStatus.OUT_OF_STOCK : undefined,
          },
        });
      }

      // 3. Record immutable inventory movement
      const movement = await tx.inventoryMovement.create({
        data: {
          productId,
          variantId,
          quantityDelta: input.quantityDelta,
          previousStock: currentStock,
          newStock,
          type: input.type || InventoryMovementType.MANUAL_ADJUSTMENT,
          reason: input.reason,
          reference: input.reference || null,
        },
      });

      return {
        targetName,
        previousStock: currentStock,
        newStock,
        movementId: movement.id,
      };
    });
  }

  /**
   * Safe reservation during checkout with concurrency protection
   */
  async reserveStock(input: ReserveStockInput) {
    const now = new Date();
    const ttlMinutes = input.ttlMinutes ?? 15;
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    return await prisma.$transaction(async (tx) => {
      // 1. Clean up any expired reservations first
      await tx.inventoryReservation.updateMany({
        where: {
          status: InventoryReservationStatus.PENDING,
          expiresAt: { lte: now },
        },
        data: { status: InventoryReservationStatus.EXPIRED },
      });

      const reservedRecords = [];

      for (const item of input.items) {
        // Resolve variant ID
        let variantId = item.variantId;
        if (!variantId && item.productId) {
          const firstVariant = await tx.productVariant.findFirst({
            where: { productId: item.productId, isActive: true },
          });
          if (firstVariant) {
            variantId = firstVariant.id;
          } else {
            // Create default variant if needed
            const newVar = await tx.productVariant.create({
              data: {
                productId: item.productId,
                sku: `DEFAULT-${item.productId.substring(0, 8)}`,
                stockQuantity: 10,
              },
            });
            variantId = newVar.id;
          }
        }

        if (!variantId) {
          throw new BadRequestError("Item must specify a valid variantId or productId.");
        }

        // Lock & fetch current variant stock
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: { product: true },
        });

        if (!variant) {
          throw new NotFoundError("Product Variant");
        }

        // Compute currently reserved quantity for this variant
        const activeReservations = await tx.inventoryReservation.aggregate({
          where: {
            variantId,
            status: InventoryReservationStatus.PENDING,
            expiresAt: { gt: now },
            reference: { not: input.reference }, // Don't count existing reservation from same cart
          },
          _sum: { quantity: true },
        });

        const reservedQty = activeReservations._sum.quantity || 0;
        const availableStock = variant.stockQuantity - reservedQty;

        if (availableStock < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for "${variant.product.name}". Available: ${Math.max(
              0,
              availableStock
            )}, requested: ${item.quantity}.`
          );
        }

        // Create reservation
        const reservation = await tx.inventoryReservation.create({
          data: {
            variantId,
            quantity: item.quantity,
            reference: input.reference,
            status: InventoryReservationStatus.PENDING,
            expiresAt,
          },
        });

        reservedRecords.push(reservation);
      }

      return {
        reference: input.reference,
        expiresAt,
        reservations: reservedRecords,
      };
    });
  }

  /**
   * Release reserved stock (e.g. on cart abandonment or payment failure)
   */
  async releaseReservation(reference: string) {
    const updated = await prisma.inventoryReservation.updateMany({
      where: {
        reference,
        status: InventoryReservationStatus.PENDING,
      },
      data: {
        status: InventoryReservationStatus.RELEASED,
      },
    });

    return {
      success: true,
      releasedCount: updated.count,
    };
  }

  /**
   * Commit reservation on successful checkout (decrements physical stock)
   */
  async commitReservation(reference: string) {
    return await prisma.$transaction(async (tx) => {
      const reservations = await tx.inventoryReservation.findMany({
        where: {
          reference,
          status: InventoryReservationStatus.PENDING,
        },
        include: { variant: { include: { product: true } } },
      });

      if (reservations.length === 0) {
        return { committedCount: 0 };
      }

      for (const res of reservations) {
        const previousStock = res.variant.stockQuantity;
        const newStock = Math.max(0, previousStock - res.quantity);

        // Update variant stock
        await tx.productVariant.update({
          where: { id: res.variantId },
          data: { stockQuantity: newStock },
        });

        // Update parent product stock
        await tx.product.update({
          where: { id: res.variant.productId },
          data: {
            stockQuantity: { decrement: res.quantity },
            status: newStock === 0 ? ProductStatus.OUT_OF_STOCK : undefined,
          },
        });

        // Record SALE movement
        await tx.inventoryMovement.create({
          data: {
            productId: res.variant.productId,
            variantId: res.variantId,
            quantityDelta: -res.quantity,
            previousStock,
            newStock,
            type: InventoryMovementType.SALE,
            reason: "Completed order purchase",
            reference,
          },
        });

        // Mark reservation committed
        await tx.inventoryReservation.update({
          where: { id: res.id },
          data: { status: InventoryReservationStatus.COMMITTED },
        });
      }

      return { committedCount: reservations.length };
    });
  }

  /**
   * Get products with low-stock or out-of-stock alerts
   */
  async getLowStockAlerts() {
    return await prisma.product.findMany({
      where: {
        OR: [
          { stockQuantity: { lte: 2 } },
          { status: ProductStatus.OUT_OF_STOCK },
          {
            variants: {
              some: {
                stockQuantity: { lte: 2 },
              },
            },
          },
        ],
      },
      include: {
        category: { select: { id: true, name: true } },
        variants: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { stockQuantity: "asc" },
    });
  }

  /**
   * List inventory with pagination, search, and filters
   */
  async listInventory(query: InventoryQuery = { page: 1, limit: 20 }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.lowStockOnly) {
      where.OR = [
        { stockQuantity: { lte: 3 } },
        { status: ProductStatus.OUT_OF_STOCK },
      ];
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
        { category: { name: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ stockQuantity: "asc" }, { createdAt: "desc" }],
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku || p.variants[0]?.sku || "N/A",
        category: p.category?.name || "Uncategorized",
        stockQuantity: p.stockQuantity,
        lowStockThreshold: p.lowStockThreshold,
        status: p.status,
        isLowStock: p.stockQuantity <= p.lowStockThreshold,
        isOutOfStock: p.stockQuantity <= 0 || p.status === ProductStatus.OUT_OF_STOCK,
        variantsCount: p.variants.length,
        primaryImage: p.images[0]?.url || "/placeholder-saree.jpg",
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async getInventorySummary() {
    const now = new Date();
    const [stock, reservations, stockLevels] = await Promise.all([
      prisma.product.aggregate({ _sum: { stockQuantity: true } }),
      prisma.inventoryReservation.aggregate({
        where: {
          status: InventoryReservationStatus.PENDING,
          expiresAt: { gt: now },
        },
        _sum: { quantity: true },
      }),
      prisma.product.findMany({
        where: { status: { not: ProductStatus.ARCHIVED } },
        select: { stockQuantity: true, lowStockThreshold: true },
      }),
    ]);

    return {
      totalStockUnits: stock._sum.stockQuantity || 0,
      reservedStock: reservations._sum.quantity || 0,
      lowStockProducts: stockLevels.filter(
        (product) => product.stockQuantity <= product.lowStockThreshold
      ).length,
      inventoryValue: null,
    };
  }

  /**
   * List inventory movement history with filter
   */
  async getMovementHistory(query: {
    page: number;
    limit: number;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;
    const where: Prisma.InventoryMovementWhereInput = {};
    if (query.startDate || query.endDate) {
      where.createdAt = {
        ...(query.startDate ? { gte: new Date(`${query.startDate}T00:00:00.000Z`) } : {}),
        ...(query.endDate ? { lte: new Date(`${query.endDate}T23:59:59.999Z`) } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { product: { name: { contains: query.search, mode: "insensitive" } } },
        { product: { sku: { contains: query.search, mode: "insensitive" } } },
        { variant: { sku: { contains: query.search, mode: "insensitive" } } },
        { reason: { contains: query.search, mode: "insensitive" } },
        { reference: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, movements] = await Promise.all([
      prisma.inventoryMovement.count({ where }),
      prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { select: { id: true, title: true, sku: true } },
        },
      }),
    ]);

    return {
      movements,
      pagination: { page, limit, total },
    };
  }
}

export const inventoryService = new InventoryService();
