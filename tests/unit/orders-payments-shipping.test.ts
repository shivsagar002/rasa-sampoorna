import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrderService } from "@/modules/orders/order.service";
import { ReturnService } from "@/modules/returns/return.service";
import { AdminOrderService } from "@/modules/admin/admin-order.service";
import {
  ALLOWED_ORDER_TRANSITIONS,
  ALLOWED_PAYMENT_TRANSITIONS,
  ALLOWED_SHIPMENT_TRANSITIONS,
  ALLOWED_RETURN_TRANSITIONS,
  isNewerShipmentStatus,
  validateOrderStatusTransition,
  validatePaymentStatusTransition,
  validateReturnStatusTransition,
} from "@/modules/orders/order-state";
import { razorpayClient } from "@/lib/integrations/razorpay";
import { shiprocketClient } from "@/lib/integrations/shiprocket";
import { prisma } from "@/lib/db/prisma";
import { BadRequestError, ValidationError, ForbiddenError, NotFoundError } from "@/lib/api/errors";
import {
  OrderStatus,
  PaymentStatus,
  ShipmentStatus,
  ReturnStatus,
  ProductStatus,
} from "@prisma/client";
import crypto from "crypto";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    orderItem: {
      findUnique: vi.fn(),
    },
    productVariant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refund: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    shipment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    trackingEvent: {
      create: vi.fn(),
    },
    return: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    webhookEvent: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

vi.mock("@/modules/cart/cart.service", () => ({
  cartService: {
    addItem: vi.fn().mockResolvedValue({ id: "cart-1" }),
    getOrCreateCart: vi.fn().mockResolvedValue({ id: "cart-1", items: [] }),
  },
}));

vi.mock("@/modules/inventory/inventory.service", () => ({
  inventoryService: {
    adjustStock: vi.fn().mockResolvedValue({ success: true }),
    releaseReservation: vi.fn().mockResolvedValue({ success: true }),
  },
}));

describe("Orders, Razorpay Payments, Shiprocket & Returns Suite", () => {
  let orderService: OrderService;
  let returnService: ReturnService;
  let adminOrderService: AdminOrderService;

  beforeEach(() => {
    vi.clearAllMocks();
    orderService = new OrderService();
    returnService = new ReturnService();
    adminOrderService = new AdminOrderService();
  });

  // =========================================================================
  // 1. STATE MACHINE TRANSITIONS & STALE EVENT PROTECTION
  // =========================================================================
  describe("State Machine & Transition Validation", () => {
    it("allows valid Order transitions (PENDING_PAYMENT -> CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED)", () => {
      expect(() =>
        validateOrderStatusTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.CONFIRMED)
      ).not.toThrow();
      expect(() =>
        validateOrderStatusTransition(OrderStatus.CONFIRMED, OrderStatus.PROCESSING)
      ).not.toThrow();
      expect(() =>
        validateOrderStatusTransition(OrderStatus.PROCESSING, OrderStatus.SHIPPED)
      ).not.toThrow();
      expect(() =>
        validateOrderStatusTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED)
      ).not.toThrow();
    });

    describe("Admin Order Dashboard Workflows", () => {
      it("aggregates order and awaiting-payment totals by database status", async () => {
        vi.mocked(prisma.order.groupBy)
          .mockResolvedValueOnce([
            { status: OrderStatus.PROCESSING, _count: { id: 3 } },
            { status: OrderStatus.SHIPPED, _count: { id: 2 } },
            { status: OrderStatus.DELIVERED, _count: { id: 5 } },
          ] as any)
          .mockResolvedValueOnce([
            { paymentStatus: PaymentStatus.PENDING, _count: { id: 2 } },
            { paymentStatus: PaymentStatus.AUTHORIZED, _count: { id: 1 } },
          ] as any);

        await expect(adminOrderService.getOrderSummary()).resolves.toEqual({
          total: 10,
          pendingPayments: 3,
          processing: 3,
          shippedDelivered: 7,
        });
      });

      it("exports all matching orders with database-backed financial columns", async () => {
        vi.mocked(prisma.order.findMany).mockResolvedValue([
          {
            orderNumber: "RASA-1001",
            createdAt: new Date("2025-01-02T00:00:00.000Z"),
            status: OrderStatus.PROCESSING,
            paymentStatus: PaymentStatus.CAPTURED,
            paymentMethod: "RAZORPAY",
            subtotalMinorUnits: 10000,
            discountAmountMinorUnits: 500,
            taxAmountMinorUnits: 900,
            shippingFeeMinorUnits: 250,
            totalAmountMinorUnits: 10650,
            _count: { items: 2 },
            shipments: [{
              carrier: "SHIPROCKET",
              trackingNumber: "TRACK-1",
              awbCode: null,
              estimatedDeliveryAt: new Date("2025-01-05T00:00:00.000Z"),
            }],
          },
        ] as any);

        const csv = await adminOrderService.exportOrdersCsv({
          status: OrderStatus.PROCESSING,
          search: "RASA-1001",
        });

        expect(csv).toContain('"Subtotal (INR)"');
        expect(csv).toContain('"100.00","5.00","9.00","2.50","106.50"');
        expect(csv).toContain('"SHIPROCKET","TRACK-1"');
        expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
          where: expect.objectContaining({ status: OrderStatus.PROCESSING }),
          take: 5001,
        }));
      });

      it("rejects filtered CSV exports above the supported order limit", async () => {
        vi.mocked(prisma.order.findMany).mockResolvedValue(
          Array.from({ length: 5001 }, () => ({})) as any
        );

        await expect(adminOrderService.exportOrdersCsv({})).rejects.toThrow(BadRequestError);
      });

      it("bulk advances captured orders transactionally and records an audit event per order", async () => {
        vi.mocked(prisma.order.findMany).mockResolvedValue([
          { id: "order-1", status: OrderStatus.CONFIRMED, paymentStatus: PaymentStatus.CAPTURED },
          { id: "order-2", status: OrderStatus.CONFIRMED, paymentStatus: PaymentStatus.CAPTURED },
        ] as any);

        await expect(
          adminOrderService.bulkUpdateStatus(
            ["order-1", "order-2"],
            OrderStatus.PROCESSING,
            "admin-1"
          )
        ).resolves.toEqual({ updatedCount: 2 });
        expect(prisma.order.update).toHaveBeenCalledTimes(2);
        expect(prisma.auditLog.create).toHaveBeenCalledTimes(2);
      });

      it("rejects bulk status changes for orders without captured payment", async () => {
        vi.mocked(prisma.order.findMany).mockResolvedValue([
          { id: "order-1", status: OrderStatus.CONFIRMED, paymentStatus: PaymentStatus.PENDING },
        ] as any);

        await expect(
          adminOrderService.bulkUpdateStatus(["order-1"], OrderStatus.PROCESSING, "admin-1")
        ).rejects.toThrow(ValidationError);
        expect(prisma.order.update).not.toHaveBeenCalled();
      });
    });

    it("rejects invalid Order transitions (e.g. DELIVERED directly back to PENDING_PAYMENT or CANCELLED)", () => {
      expect(() =>
        validateOrderStatusTransition(OrderStatus.DELIVERED, OrderStatus.PENDING_PAYMENT)
      ).toThrow(ValidationError);
      expect(() =>
        validateOrderStatusTransition(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)
      ).toThrow(ValidationError);
    });

    it("allows valid Payment transitions (PENDING -> CAPTURED -> REFUNDED)", () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.PENDING, PaymentStatus.CAPTURED)
      ).not.toThrow();
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.CAPTURED, PaymentStatus.REFUNDED)
      ).not.toThrow();
    });

    it("rejects invalid Payment transitions (FAILED -> CAPTURED)", () => {
      expect(() =>
        validatePaymentStatusTransition(PaymentStatus.FAILED, PaymentStatus.CAPTURED)
      ).toThrow(ValidationError);
    });

    it("protects against stale/out-of-order shipment webhooks using hierarchy rank", () => {
      // IN_TRANSIT (rank 3) vs DELIVERED (rank 7)
      expect(isNewerShipmentStatus(ShipmentStatus.DELIVERED, ShipmentStatus.IN_TRANSIT)).toBe(false);

      // DELIVERED cannot be reversed by any earlier event
      expect(isNewerShipmentStatus(ShipmentStatus.DELIVERED, ShipmentStatus.PICKED_UP)).toBe(false);

      // Newer status advances normally
      expect(isNewerShipmentStatus(ShipmentStatus.LABEL_CREATED, ShipmentStatus.PICKED_UP)).toBe(true);
      expect(isNewerShipmentStatus(ShipmentStatus.PICKED_UP, ShipmentStatus.IN_TRANSIT)).toBe(true);
      expect(isNewerShipmentStatus(ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED)).toBe(true);
    });
  });

  // =========================================================================
  // 2. RAZORPAY PAYMENT GATEWAY INTEGRATION
  // =========================================================================
  describe("Razorpay Signature Verification & Gateway Handling", () => {
    it("verifies valid payment signature using timing-safe comparison", () => {
      const orderId = "order_12345";
      const paymentId = "pay_67890";
      const validSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "razorpay_secret_placeholder")
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const isValid = razorpayClient.verifyPaymentSignature(orderId, paymentId, validSignature);
      expect(isValid).toBe(true);
    });

    it("rejects tampered payment signature", () => {
      const isValid = razorpayClient.verifyPaymentSignature(
        "order_12345",
        "pay_67890",
        "invalid_tampered_signature_12345"
      );
      expect(isValid).toBe(false);
    });

    it("verifies webhook signature against raw request body", () => {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "razorpay_webhook_secret_placeholder";
      const rawBody = JSON.stringify({ event: "payment.captured", id: "evt_1" });
      const validSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      const isValid = razorpayClient.verifyWebhookSignature(rawBody, validSignature);
      expect(isValid).toBe(true);
    });

    it("rejects tampered webhook payload or signature", () => {
      const isValid = razorpayClient.verifyWebhookSignature(
        '{"event":"payment.captured"}',
        "invalid_signature_hex"
      );
      expect(isValid).toBe(false);
    });

    it("initiates refund successfully in mock sandbox mode when credentials are unconfigured", async () => {
      const refund = await razorpayClient.initiateRefund({
        paymentId: "pay_mock_123",
        amountMinorUnits: 500000,
        reason: "Customer cancellation",
      });

      expect(refund.id).toBeDefined();
      expect(refund.id.startsWith("rfnd_")).toBe(true);
      expect(refund.amount).toBe(500000);
      expect(refund.isMock).toBe(true);
    });
  });

  // =========================================================================
  // 3. SHIPROCKET SHIPPING & LOGISTICS
  // =========================================================================
  describe("Shiprocket Logistics Integration", () => {
    it("creates shipment with AWB and tracking URL in sandbox/mock fallback", async () => {
      const shipment = await shiprocketClient.createShipment({
        orderId: "order_abc",
        orderNumber: "RASA-2026-0001",
        orderDate: new Date(),
        customerName: "Radha Devi",
        customerEmail: "radha@example.com",
        customerPhone: "9876543210",
        shippingAddress: {
          street: "123 Temple Road",
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560038",
          country: "India",
        },
        items: [
          {
            name: "Kanjivaram Pure Silk Saree",
            sku: "KANJI-RED-01",
            units: 1,
            selling_price: 18500,
          },
        ],
        subtotal: 18500,
      });

      expect(shipment.awbCode).toBeDefined();
      expect(shipment.trackingUrl).toContain(shipment.awbCode);
      expect(shipment.courierName).toBeDefined();
      expect(shipment.isMock).toBe(true);
    });

    it("creates reverse pickup for returns with valid reverse AWB", async () => {
      const reverse = await shiprocketClient.createReversePickup({
        shiprocketOrderId: "SR-ORDER-001",
        orderNumber: "RASA-2026-0001",
        customerName: "Radha Devi",
        customerPhone: "9876543210",
        pickupAddress: {
          street: "123 Temple Road",
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560038",
        },
        reason: "Defective weave",
      });

      expect(reverse.reverseAwb).toBeDefined();
      expect(reverse.reverseAwb.startsWith("RAW")).toBe(true);
      expect(reverse.status).toBe("PICKUP_SCHEDULED");
    });
  });

  // =========================================================================
  // 4. GUEST ORDER SECURITY
  // =========================================================================
  describe("Guest Order Cryptographic Access Security", () => {
    it("generates and verifies valid HMAC-SHA256 guest access tokens", () => {
      const orderId = "order_uuid_12345";
      const guestEmail = "guest.patron@example.com";

      const token = orderService.generateGuestOrderAccessToken(orderId, guestEmail);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const isVerified = orderService.verifyGuestOrderAccessToken(orderId, guestEmail, token);
      expect(isVerified).toBe(true);
    });

    it("rejects unauthorized guest access attempts with forged tokens", () => {
      const orderId = "order_uuid_12345";
      const guestEmail = "guest.patron@example.com";

      const isVerified = orderService.verifyGuestOrderAccessToken(
        orderId,
        guestEmail,
        "forged_token_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      );
      expect(isVerified).toBe(false);
    });

    it("rejects unauthorized access when patron is neither owner nor has guest token", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "order_1",
        userId: "user_owner",
        guestEmail: null,
      } as any);

      await expect(
        orderService.getOrderDetails("order_1", "different_user", undefined, undefined, false)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // =========================================================================
  // 5. REORDERING USING CURRENT PRICES & LIVE STOCK
  // =========================================================================
  describe("Reordering Previous Purchases", () => {
    it("reorders using CURRENT prices and live stock, never restoring historical prices or expired coupons", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "order_historical",
        userId: "user_1",
        items: [
          {
            id: "item_1",
            productId: "prod_1",
            productName: "Banarasi Silk Saree",
            quantity: 2,
            unitPriceMinorUnits: 1200000, // Historical price: ₹12,000
            selectedSize: "Free size",
            variant: {
              id: "var_1",
              isActive: true,
              stockQuantity: 5, // Available live stock
              priceAdjustmentMinorUnits: 100000, // Current adjustment: +₹1,000
              product: {
                id: "prod_1",
                name: "Banarasi Silk Saree",
                status: ProductStatus.ACTIVE,
                basePriceInMinorUnits: 1400000, // Current live price: ₹14,000 (rose from ₹12,000)
              },
            },
          },
        ],
      } as any);

      const result = await orderService.reorder("order_historical", "user_1");

      expect(result.addedItems.length).toBe(1);
      // Current live price is basePrice (14,000) + adjustment (1,000) = ₹15,000
      expect(result.addedItems[0].currentPrice).toBe(15000);
      expect(result.addedItems[0].quantity).toBe(2);
      expect(result.skippedItems.length).toBe(0);
    });

    it("safely skips inactive or out-of-stock items during reorder", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "order_historical_2",
        userId: "user_1",
        items: [
          {
            id: "item_out_of_stock",
            productId: "prod_sold_out",
            productName: "Antique Zari Saree",
            quantity: 1,
            variant: {
              id: "var_sold_out",
              isActive: true,
              stockQuantity: 0, // Out of stock!
              product: {
                id: "prod_sold_out",
                name: "Antique Zari Saree",
                status: ProductStatus.ACTIVE,
                basePriceInMinorUnits: 2500000,
              },
            },
          },
        ],
      } as any);

      const result = await orderService.reorder("order_historical_2", "user_1");

      expect(result.addedItems.length).toBe(0);
      expect(result.skippedItems.length).toBe(1);
      expect(result.skippedItems[0].reason).toContain("out of stock");
    });
  });

  // =========================================================================
  // 6. RETURNS & REFUNDS WORKFLOW
  // =========================================================================
  describe("Returns Eligibility, Admin Review & Refunds", () => {
    it("rejects return request if order is not delivered yet", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "order_in_transit",
        status: OrderStatus.SHIPPED, // Not delivered
        items: [{ id: "item_1", subtotalMinorUnits: 1500000 }],
        shipments: [],
      } as any);

      const eligibility = await returnService.checkReturnEligibility("order_in_transit", "item_1");
      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.reason).toContain("delivered");
    });

    it("rejects return request if return window (7 days) has expired", async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "order_expired",
        status: OrderStatus.DELIVERED,
        items: [{ id: "item_1", subtotalMinorUnits: 1500000 }],
        shipments: [{ deliveredAt: tenDaysAgo }],
        updatedAt: tenDaysAgo,
      } as any);

      const eligibility = await returnService.checkReturnEligibility("order_expired", "item_1");
      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.reason).toContain("expired");
    });

    it("approves return and triggers reverse pickup with Shiprocket", async () => {
      vi.mocked(prisma.return.findUnique).mockResolvedValue({
        id: "ret_1",
        status: ReturnStatus.REQUESTED,
        reason: "Fabric texture differs from display",
        orderId: "order_del",
        order: {
          orderNumber: "RASA-2026-0005",
          shippingAddress: {
            name: "Meera",
            phone: "9876543210",
            street: "MG Road",
            city: "Bengaluru",
            state: "Karnataka",
            postalCode: "560001",
          },
        },
      } as any);

      vi.mocked(prisma.return.update).mockResolvedValue({
        id: "ret_1",
        status: ReturnStatus.APPROVED,
      } as any);

      const reviewed = await returnService.reviewReturn(
        { returnId: "ret_1", action: "APPROVE", adminNotes: "Approved for return" },
        "admin_1"
      );

      expect(reviewed.status).toBe(ReturnStatus.APPROVED);
      expect(reviewed.reverseAwb).toBeDefined();
    });

    it("processes warehouse received return: triggers gateway refund, updates DB and restocks inventory", async () => {
      vi.mocked(prisma.return.findUnique).mockResolvedValue({
        id: "ret_approved",
        status: ReturnStatus.APPROVED,
        orderId: "order_to_refund",
        refundAmountMinorUnits: 1500000,
        reason: "Fit issue",
        orderItem: {
          variantId: "var_to_restock",
          productName: "Chanderi Silk Saree",
          quantity: 1,
          subtotalMinorUnits: 1500000,
        },
        order: {
          orderNumber: "RASA-2026-0009",
          currency: "INR",
          user: { email: "customer@example.com" },
          payments: [
            {
              id: "pay_db_1",
              status: PaymentStatus.CAPTURED,
              paymentProvider: "RAZORPAY",
              transactionId: "pay_gateway_id_123",
            },
          ],
        },
      } as any);

      vi.mocked(prisma.return.update).mockResolvedValue({
        id: "ret_approved",
        status: ReturnStatus.REFUNDED,
      } as any);

      const result = await returnService.processReturnRefund("ret_approved", true, "admin_1");

      expect(result.status).toBe(ReturnStatus.REFUNDED);
      expect(prisma.refund.create).toHaveBeenCalled();
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: OrderStatus.REFUNDED }),
        })
      );
    });
  });

  // =========================================================================
  // 7. TAX INVOICE STRUCTURE
  // =========================================================================
  describe("Tax Invoice Generation", () => {
    it("computes accurate HSN 5007 Handloom Silk 5% GST (2.5% CGST + 2.5% SGST) breakdown", async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({
        id: "order_inv",
        orderNumber: "RASA-2026-0010",
        userId: "user_sita",
        createdAt: new Date(),
        status: OrderStatus.CONFIRMED,
        paymentStatus: PaymentStatus.CAPTURED,
        paymentMethod: "RAZORPAY",
        subtotalMinorUnits: 2100000, // ₹21,000 inclusive of 5% GST
        totalAmountMinorUnits: 2100000,
        shippingFeeMinorUnits: 0,
        discountAmountMinorUnits: 0,
        taxAmountMinorUnits: 100000,
        currency: "INR",
        items: [
          {
            productName: "Kanjivaram Bridal Silk Saree",
            sku: "KANJI-001",
            quantity: 1,
            selectedSize: "Free size",
            unitPriceMinorUnits: 2100000,
            subtotalMinorUnits: 2100000,
          },
        ],
        shippingAddress: {
          name: "Sita Sharma",
          phone: "9123456789",
          street: "Lavelle Road",
          city: "Bengaluru",
          state: "Karnataka",
          postalCode: "560001",
        },
        user: { id: "user_sita", email: "sita@example.com", name: "Sita Sharma" },
        shipments: [],
        payments: [],
        refunds: [],
        returns: [],
        couponRedemptions: [],
      } as any);

      const invoice = await orderService.getInvoiceData("order_inv", "user_sita");

      expect(invoice.invoiceNumber).toBe("INV-2026-0010");
      expect(invoice.seller.hsnCode).toBe("5007");
      expect(invoice.seller.legalName).toContain("RASA Sampoorna");
      expect(invoice.financials.totalPaid).toBe(21000);
      expect(invoice.financials.totalGstAmount).toBeGreaterThan(0);
      expect(invoice.financials.cgstAmount).toBe(invoice.financials.sgstAmount);
    });
  });
});
