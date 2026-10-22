import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/api/errors";
import { OrderStatus, PaymentStatus, Prisma, ProductStatus } from "@prisma/client";
import { cartService } from "@/modules/cart/cart.service";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { razorpayClient } from "@/lib/integrations/razorpay";
import { validateOrderStatusTransition } from "./order-state";
import crypto from "crypto";
import { env } from "@/lib/validation/env";
import { logger } from "@/lib/observability/logger";
import { sendEmail } from "@/lib/email/email-service";
import { notificationService } from "@/modules/notifications/notification.service";

export interface ReorderResult {
  addedItems: Array<{ productName: string; quantity: number; currentPrice: number }>;
  skippedItems: Array<{ productName: string; reason: string }>;
  cart: any;
}

export class OrderService {
  /**
   * Secure guest access token generator using HMAC-SHA256
   */
  generateGuestOrderAccessToken(orderId: string, guestEmail: string): string {
    return crypto
      .createHmac("sha256", env.AUTH_SECRET)
      .update(`${orderId}:${guestEmail.toLowerCase().trim()}`)
      .digest("hex");
  }

  /**
   * Verify secure guest access
   */
  verifyGuestOrderAccessToken(orderId: string, guestEmail: string, token: string): boolean {
    const expected = this.generateGuestOrderAccessToken(orderId, guestEmail);
    if (token.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  }

  /**
   * Get order details with security check (supports user auth, guest token, or secure signature)
   */
  async getOrderDetails(
    orderId: string,
    userId?: string,
    guestToken?: string,
    guestAccessToken?: string,
    isAdmin = false
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
        user: { select: { id: true, name: true, email: true, phone: true } },
        shippingAddress: true,
        payments: true,
        refunds: true,
        returns: true,
        couponRedemptions: { include: { coupon: true } },
        shipments: {
          include: { trackingEvents: { orderBy: { timestamp: "desc" } } },
        },
      },
    });

    if (!order) {
      throw new NotFoundError("Order");
    }

    // Authorization verification
    if (!isAdmin) {
      const isOwnerUser = userId && order.userId === userId;
      let isVerifiedGuest = false;

      if (!isOwnerUser && order.guestEmail && guestAccessToken) {
        isVerifiedGuest = this.verifyGuestOrderAccessToken(
          order.id,
          order.guestEmail,
          guestAccessToken
        );
      }

      if (!isOwnerUser && !isVerifiedGuest) {
        throw new ForbiddenError("You are not authorized to access this order.");
      }
    }

    return {
      ...order,
      totalAmount: order.totalAmountMinorUnits / 100,
      subtotal: order.subtotalMinorUnits / 100,
      shippingFee: order.shippingFeeMinorUnits / 100,
      discountAmount: order.discountAmountMinorUnits / 100,
      taxAmount: order.taxAmountMinorUnits / 100,
      items: order.items.map((item) => ({
        ...item,
        unitPrice: item.unitPriceMinorUnits / 100,
        subtotal: item.subtotalMinorUnits / 100,
        // Check current stock and price for reorder guidance
        currentStockAvailable: item.variant?.stockQuantity || 0,
        currentBasePrice: item.variant?.product?.basePriceInMinorUnits
          ? item.variant.product.basePriceInMinorUnits / 100
          : item.unitPriceMinorUnits / 100,
        isCurrentlyAvailable:
          item.variant?.isActive &&
          item.variant?.product?.status === ProductStatus.ACTIVE &&
          (item.variant?.stockQuantity || 0) > 0,
      })),
    };
  }

  /**
   * List customer orders with pagination & optional status filter
   */
  async getUserOrders(userId: string, page = 1, limit = 10, status?: OrderStatus) {
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = { userId };
    if (status) where.status = status;

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          items: true,
          shippingAddress: true,
          shipments: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
    ]);

    return {
      items: orders.map((o) => ({
        ...o,
        totalAmount: o.totalAmountMinorUnits / 100,
        subtotal: o.subtotalMinorUnits / 100,
        shippingFee: o.shippingFeeMinorUnits / 100,
        discountAmount: o.discountAmountMinorUnits / 100,
        itemCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
        latestShipment: o.shipments[0] || null,
        items: o.items.map((i) => ({
          ...i,
          unitPrice: i.unitPriceMinorUnits / 100,
          subtotal: i.subtotalMinorUnits / 100,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Reorder items from a historical purchase using CURRENT prices and CURRENT stock
   */
  async reorder(orderId: string, userId?: string, guestToken?: string): Promise<ReorderResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundError("Order");

    if (userId && order.userId && order.userId !== userId) {
      throw new ForbiddenError("Not authorized to reorder this purchase.");
    }

    const addedItems: Array<{ productName: string; quantity: number; currentPrice: number }> = [];
    const skippedItems: Array<{ productName: string; reason: string }> = [];

    for (const item of order.items) {
      // Re-verify current live product & variant
      let currentVariant = item.variant;
      if (!currentVariant && item.productId) {
        currentVariant = await prisma.productVariant.findFirst({
          where: { productId: item.productId, isActive: true },
          include: { product: true },
        });
      }

      if (
        !currentVariant ||
        !currentVariant.isActive ||
        !currentVariant.product ||
        currentVariant.product.status !== ProductStatus.ACTIVE
      ) {
        skippedItems.push({
          productName: item.productName,
          reason: "Product is no longer active or cataloged.",
        });
        continue;
      }

      if (currentVariant.stockQuantity <= 0) {
        skippedItems.push({
          productName: item.productName,
          reason: "Currently out of stock.",
        });
        continue;
      }

      // Add to cart with current purchasable quantity capped at current available stock
      const addQty = Math.min(item.quantity, currentVariant.stockQuantity);
      const currentPriceMinorUnits =
        currentVariant.product.basePriceInMinorUnits + currentVariant.priceAdjustmentMinorUnits;

      await cartService.addItem(
        {
          variantId: currentVariant.id,
          quantity: addQty,
          selectedSize: item.selectedSize || "Free size",
        },
        userId,
        guestToken
      );

      addedItems.push({
        productName: currentVariant.product.name,
        quantity: addQty,
        currentPrice: currentPriceMinorUnits / 100,
      });
    }

    const updatedCart = await cartService.getOrCreateCart(userId, guestToken);

    return {
      addedItems,
      skippedItems,
      cart: updatedCart,
    };
  }

  /**
   * Request customer cancellation (eligible before dispatch)
   */
  async requestCancellation(orderId: string, reason: string, userId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true, items: true, user: true, shippingAddress: true },
    });

    if (!order) throw new NotFoundError("Order");

    if (userId && order.userId && order.userId !== userId) {
      throw new ForbiddenError("Not authorized to cancel this order.");
    }

    // Validate transition
    validateOrderStatusTransition(order.status, OrderStatus.CANCELLED);

    // If payment was captured, initiate refund
    const capturedPayment = order.payments.find((p) => p.status === PaymentStatus.CAPTURED);
    let refundGatewayId = null;

    if (capturedPayment) {
      try {
        const rzpRefund = await razorpayClient.initiateRefund({
          paymentId: capturedPayment.transactionId,
          amountMinorUnits: order.totalAmountMinorUnits,
          reason: `Customer cancellation: ${reason}`,
        });
        refundGatewayId = rzpRefund.id;
      } catch (err) {
        logger.warn("[CancelRefundWarning]", { err });
      }
    }

    // Release reserved inventory
    await inventoryService.releaseReservation(order.orderNumber);

    const updated = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: capturedPayment ? PaymentStatus.REFUNDED : PaymentStatus.FAILED,
          notes: `Cancelled by customer: ${reason}`,
        },
      });

      if (capturedPayment && refundGatewayId) {
        await tx.refund.create({
          data: {
            orderId,
            paymentId: capturedPayment.id,
            refundId: refundGatewayId,
            amountMinorUnits: order.totalAmountMinorUnits,
            currency: order.currency,
            reason: `Customer cancellation: ${reason}`,
            status: "PROCESSED",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: userId || null,
          action: "ORDER_CANCELLED",
          entity: "Order",
          entityId: orderId,
          details: JSON.stringify({ reason, refundGatewayId }),
        },
      });

      return ord;
    });

    // Dispatch cancellation notification asynchronously
    const recipient = order.user?.email || order.guestEmail;
    if (recipient) {
      notificationService
        .notifyOrderCancelled({
          recipient,
          customerName: order.shippingAddress?.name || "Patron",
          orderNumber: order.orderNumber,
          reason,
          refundNote: capturedPayment
            ? `A full refund of ₹${(order.totalAmountMinorUnits / 100).toLocaleString("en-IN")} has been initiated to your original payment method.`
            : undefined,
          userId: order.userId || undefined,
        })
        .catch((e) => logger.warn("[CancellationNotificationFailed]", { error: e }));
    }

    return updated;
  }

  /**
   * Generate structured Tax Invoice / Printable Receipt data
   */
  async getInvoiceData(orderId: string, userId?: string, guestAccessToken?: string) {
    const order = await this.getOrderDetails(orderId, userId, undefined, guestAccessToken);

    const invoiceNumber = `INV-${order.orderNumber.replace("RASA-", "")}`;
    const invoiceDate = order.createdAt;

    // Saree GST is 5% in India (CGST 2.5% + SGST 2.5%)
    const taxableValueMinorUnits = Math.round(order.subtotalMinorUnits / 1.05);
    const totalGstMinorUnits = order.subtotalMinorUnits - taxableValueMinorUnits;
    const cgstMinorUnits = Math.round(totalGstMinorUnits / 2);
    const sgstMinorUnits = totalGstMinorUnits - cgstMinorUnits;

    return {
      invoiceNumber,
      invoiceDate,
      seller: {
        legalName: "RASA Sampoorna Handloom Artisans Private Limited",
        brandName: "RASA Sampoorna",
        address: "Artisan Hub, Indiranagar, Bengaluru, Karnataka — 560038",
        gstin: "29AABCR1234F1Z8",
        hsnCode: "5007", // Handloom Silk Sarees
        supportEmail: "orders@rasasampoorna.com",
      },
      order: {
        orderNumber: order.orderNumber,
        placedAt: order.createdAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      },
      customer: {
        name: order.shippingAddress?.name || "Patron",
        phone: order.shippingAddress?.phone || order.guestPhone || "",
        email: order.user?.email || order.guestEmail || "",
        billingAddress: order.shippingAddress,
      },
      items: order.items.map((i) => ({
        name: i.productName,
        sku: i.sku,
        quantity: i.quantity,
        size: i.selectedSize,
        unitPrice: i.unitPriceMinorUnits / 100,
        subtotal: i.subtotalMinorUnits / 100,
      })),
      financials: {
        taxableAmount: taxableValueMinorUnits / 100,
        cgstAmount: cgstMinorUnits / 100,
        sgstAmount: sgstMinorUnits / 100,
        totalGstAmount: totalGstMinorUnits / 100,
        shippingFee: order.shippingFeeMinorUnits / 100,
        discountAmount: order.discountAmountMinorUnits / 100,
        totalPaid: order.totalAmountMinorUnits / 100,
        currency: order.currency,
      },
    };
  }
}

export const orderService = new OrderService();
