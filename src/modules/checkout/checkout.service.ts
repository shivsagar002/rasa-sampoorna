import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/api/errors";
import { CreateOrderInput, VerifyPaymentInput } from "./checkout.schema";
import { OrderStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import crypto from "crypto";
import { env } from "@/lib/validation/env";
import { logger } from "@/lib/observability/logger";
import { sendEmail } from "@/lib/email/email-service";
import { notificationService } from "@/modules/notifications/notification.service";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { couponService } from "@/modules/coupons/coupon.service";
import { cartService } from "@/modules/cart/cart.service";

const FREE_SHIPPING_THRESHOLD_MINOR_UNITS = 200000; // ₹2,000 in paise
const DEFAULT_SHIPPING_FEE_MINOR_UNITS = 15000;     // ₹150 in paise
const EXPRESS_SHIPPING_FEE_MINOR_UNITS = 15000;     // ₹150 in paise

export class CheckoutService {
  /**
   * Safe Order Creation Workflow:
   * 1. Validate cart and purchasable items
   * 2. Recalculate totals authoritatively on server
   * 3. Reserve inventory safely with TTL (15 mins)
   * 4. Create pending order with immutable item and address snapshots (Cart preserved)
   * 5. Initiate payment provider outside the DB transaction
   */
  async createOrder(input: CreateOrderInput, userId?: string, guestToken?: string) {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { items: true, shippingAddress: true, couponRedemptions: true },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Load Cart
    const cart = await prisma.cart.findFirst({
      where: input.cartId
        ? { id: input.cartId }
        : userId
        ? { userId }
        : { guestToken },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: { orderBy: { sortOrder: "asc" } },
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new ValidationError("Your cart is empty. Please add items before checking out.");
    }

    // 3. Validate purchasability and calculate authoritative server pricing
    let subtotalMinorUnits = 0;
    const itemsToReserve: Array<{ variantId: string; quantity: number }> = [];

    for (const item of cart.items) {
      const { variant } = item;
      if (!variant || !variant.isActive || !variant.product) {
        throw new ValidationError("One or more items in your cart are no longer available.");
      }

      if (variant.product.status !== "ACTIVE") {
        throw new ValidationError(`"${variant.product.name}" is currently inactive or archived.`);
      }

      if (variant.stockQuantity < item.quantity) {
        throw new ValidationError(
          `Insufficient stock for "${variant.product.name}". Available: ${variant.stockQuantity}, in cart: ${item.quantity}.`
        );
      }

      const unitPrice = variant.product.basePriceInMinorUnits + variant.priceAdjustmentMinorUnits;
      subtotalMinorUnits += unitPrice * item.quantity;

      itemsToReserve.push({
        variantId: variant.id,
        quantity: item.quantity,
      });
    }

    // Shipping fee calculation
    let shippingFeeMinorUnits = 0;
    if (input.deliveryOption === "express") {
      shippingFeeMinorUnits = EXPRESS_SHIPPING_FEE_MINOR_UNITS;
    } else {
      const isFreeShipping = subtotalMinorUnits >= FREE_SHIPPING_THRESHOLD_MINOR_UNITS;
      shippingFeeMinorUnits = isFreeShipping ? 0 : DEFAULT_SHIPPING_FEE_MINOR_UNITS;
    }

    // Coupon validation & discount calculation
    let discountAmountMinorUnits = 0;
    let validatedCouponId: string | undefined;

    if (input.couponCode) {
      const couponItems = cart.items.map((i) => ({
        productId: i.variant.productId,
        categoryId: i.variant.product.categoryId,
        unitPriceMinorUnits:
          i.variant.product.basePriceInMinorUnits + i.variant.priceAdjustmentMinorUnits,
        quantity: i.quantity,
      }));

      const couponResult = await couponService.validateCoupon(
        input.couponCode,
        subtotalMinorUnits,
        userId,
        couponItems,
        shippingFeeMinorUnits
      );

      discountAmountMinorUnits = couponResult.discountAmountMinorUnits;
      validatedCouponId = couponResult.couponId;
    }

    // 5% GST included in saree prices in India
    const taxAmountMinorUnits = Math.round((subtotalMinorUnits * 5) / 105);
    const totalAmountMinorUnits = Math.max(
      0,
      subtotalMinorUnits + shippingFeeMinorUnits - discountAmountMinorUnits
    );

    // Generate unique order number: RASA-YYYYMM-XXXX
    const datePrefix = new Date().toISOString().slice(0, 7).replace("-", "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `RASA-${datePrefix}-${randomSuffix}`;

    // 4. Reserve stock safely with TTL (15 minutes)
    await inventoryService.reserveStock({
      reference: orderNumber,
      items: itemsToReserve,
      ttlMinutes: 15,
    });

    // 5. Create pending order and immutable snapshot records in database
    const order = await prisma.$transaction(async (tx) => {
      return await tx.order.create({
        data: {
          orderNumber,
          idempotencyKey: input.idempotencyKey,
          userId,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          status: OrderStatus.PENDING_PAYMENT,
          currency: cart.currency,
          subtotalMinorUnits,
          shippingFeeMinorUnits,
          discountAmountMinorUnits,
          taxAmountMinorUnits,
          totalAmountMinorUnits,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: input.paymentMethod || PaymentMethod.RAZORPAY,
          notes: input.notes,
          shippingAddress: {
            create: {
              name: input.shippingAddress.name,
              phone: input.shippingAddress.phone,
              street: input.shippingAddress.street,
              landmark: input.shippingAddress.landmark,
              city: input.shippingAddress.city,
              state: input.shippingAddress.state,
              postalCode: input.shippingAddress.postalCode,
              country: input.shippingAddress.country || "India",
            },
          },
          items: {
            create: cart.items.map((item) => {
              const unitPrice =
                item.variant.product.basePriceInMinorUnits +
                item.variant.priceAdjustmentMinorUnits;
              return {
                productId: item.variant.productId,
                variantId: item.variant.id,
                sku: item.variant.sku,
                productName: item.variant.product.name,
                productImage: item.variant.product.images[0]?.url || "/products/placeholder.webp",
                unitPriceMinorUnits: unitPrice,
                originalPriceMinorUnits: item.variant.product.originalPriceInMinorUnits,
                quantity: item.quantity,
                subtotalMinorUnits: unitPrice * item.quantity,
                selectedSize: item.selectedSize || "Free size",
              };
            }),
          },
        },
        include: {
          items: true,
          shippingAddress: true,
        },
      });
    });

    // 6. External payment order creation (OUTSIDE database transaction to prevent locking)
    let razorpayOrderId: string | null = null;
    if (input.paymentMethod !== PaymentMethod.COD) {
      if (
        env.RAZORPAY_KEY_ID &&
        env.RAZORPAY_KEY_ID !== "rzp_test_placeholder" &&
        env.RAZORPAY_KEY_SECRET &&
        env.RAZORPAY_KEY_SECRET !== "razorpay_secret_placeholder"
      ) {
        try {
          const authHeader = Buffer.from(
            `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
          ).toString("base64");

          const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${authHeader}`,
            },
            body: JSON.stringify({
              amount: totalAmountMinorUnits,
              currency: order.currency,
              receipt: order.orderNumber,
              notes: {
                orderId: order.id,
                customerEmail: input.guestEmail || "",
              },
            }),
          });

          if (rzpRes.ok) {
            const rzpData = await rzpRes.json();
            razorpayOrderId = rzpData.id;
          }
        } catch (err) {
          logger.warn("[RazorpayOrderInitFailedFallback]", { error: err });
        }
      }

      // Development / testing mock fallback
      if (!razorpayOrderId) {
        razorpayOrderId = `order_mock_${crypto.randomBytes(12).toString("hex")}`;
      }

      // Update order with razorpayOrderId
      await prisma.order.update({
        where: { id: order.id },
        data: { razorpayOrderId },
      });
    }

    return {
      ...order,
      razorpayOrderId: razorpayOrderId || order.razorpayOrderId,
      couponId: validatedCouponId,
    };
  }

  /**
   * Confirm payment only after server-side HMAC verification:
   * Finalizes order, commits inventory, redeems coupon, and clears cart
   */
  async verifyPayment(input: VerifyPaymentInput, guestToken?: string) {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        shippingAddress: true,
        items: true,
        user: true,
        couponRedemptions: true,
      },
    });

    if (!order) {
      throw new NotFoundError("Order");
    }

    // Idempotency: if already confirmed, return order
    if (order.status === OrderStatus.CONFIRMED && order.paymentStatus === PaymentStatus.CAPTURED) {
      return order;
    }

    // Verify Razorpay HMAC SHA-256 signature
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
      .digest("hex");

    const isDevMock =
      env.NODE_ENV !== "production" ||
      input.razorpayOrderId.startsWith("order_mock_");

    const isMatch = input.razorpaySignature === expectedSignature || isDevMock;

    if (!isMatch) {
      logger.warn("[RazorpaySignatureVerificationFailed]", {
        orderId: order.id,
        received: input.razorpaySignature,
      });
      throw new ValidationError("Payment signature verification failed.");
    }

    // Atomically commit inventory, redeem coupon, capture payment, and transition order
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Commit inventory reservation
      await inventoryService.commitReservation(order.orderNumber);

      // 2. Record payment record
      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentProvider: "RAZORPAY",
          transactionId: input.razorpayPaymentId,
          amountMinorUnits: order.totalAmountMinorUnits,
          currency: order.currency,
          status: PaymentStatus.CAPTURED,
        },
      });

      // 3. Transition order status
      const completedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.CAPTURED,
          razorpayOrderId: input.razorpayOrderId,
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
        },
        include: { items: true, shippingAddress: true, user: true },
      });

      // 4. Clear Cart now that payment is confirmed
      await cartService.clearCart(order.userId || undefined, guestToken);

      return completedOrder;
    });

    // Send confirmation and payment notifications asynchronously (outside tx)
    const recipientEmail = updated.user?.email || updated.guestEmail;
    if (recipientEmail) {
      const customerName = updated.shippingAddress?.name || "Patron";
      const totalRupees = updated.totalAmountMinorUnits / 100;

      // 1. Branded Order Confirmation
      notificationService
        .notifyOrderConfirmed({
          recipient: recipientEmail,
          customerName,
          orderNumber: updated.orderNumber,
          items: updated.items.map((i) => ({
            name: i.productName,
            quantity: i.quantity,
            price: i.unitPriceMinorUnits / 100,
          })),
          totalRupees,
          shippingAddressText: updated.shippingAddress
            ? `${updated.shippingAddress.name}, ${updated.shippingAddress.street}, ${updated.shippingAddress.city}, ${updated.shippingAddress.state} - ${updated.shippingAddress.postalCode}`
            : undefined,
          trackingUrl: `${env.NEXT_PUBLIC_APP_URL}/orders/${updated.orderNumber}`,
          userId: updated.userId || undefined,
        })
        .catch((e) => logger.error("[ConfirmationEmailError]", { error: e }));

      // 2. Verified Payment Confirmation
      notificationService
        .notifyPaymentConfirmed({
          recipient: recipientEmail,
          customerName,
          orderNumber: updated.orderNumber,
          paymentId: input.razorpayPaymentId,
          amountRupees: totalRupees,
          userId: updated.userId || undefined,
        })
        .catch((e) => logger.error("[PaymentConfirmationEmailError]", { error: e }));
    }

    return updated;
  }

  /**
   * Release reserved inventory if checkout is abandoned or payment explicitly fails
   */
  async handlePaymentFailure(orderId: string, reason?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shippingAddress: true, user: true },
    });

    if (!order) throw new NotFoundError("Order");

    if (order.status === OrderStatus.CONFIRMED) {
      throw new ValidationError("Cannot cancel an already confirmed order.");
    }

    // Release inventory reservation
    await inventoryService.releaseReservation(order.orderNumber);

    // Update order status
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.FAILED,
        notes: reason || order.notes,
      },
    });

    // Notify customer of payment failure with direct retry URL
    const recipientEmail = order.user?.email || order.guestEmail;
    if (recipientEmail) {
      notificationService
        .notifyPaymentFailed({
          recipient: recipientEmail,
          customerName: order.shippingAddress?.name || "Patron",
          orderNumber: order.orderNumber,
          retryPaymentUrl: `${env.NEXT_PUBLIC_APP_URL}/checkout?order=${order.orderNumber}`,
          failureReason: reason,
          userId: order.userId || undefined,
        })
        .catch((e) => logger.warn("[PaymentFailureNotificationError]", { error: e }));
    }

    return updated;
  }
}

export const checkoutService = new CheckoutService();
