import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/validation/env";
import { logger } from "@/lib/observability/logger";
import { OrderStatus, PaymentStatus, WebhookEventStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
    }

    // Verify HMAC SHA256 signature using RAW request body
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    const isSignatureValid =
      signature.length === expectedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

    if (!isSignatureValid && env.NODE_ENV === "production") {
      logger.error("[RazorpayWebhook] Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventId = event.event_id || `evt_${Date.now()}_${Math.random()}`;

    // Idempotency: Check if already processed
    const existing = await prisma.webhookEvent.findUnique({
      where: { idempotencyKey: eventId },
    });

    if (existing && existing.status === WebhookEventStatus.PROCESSED) {
      return NextResponse.json({ status: "already_processed" });
    }

    await prisma.webhookEvent.upsert({
      where: { idempotencyKey: eventId },
      create: {
        provider: "RAZORPAY",
        eventType: event.event || "unknown",
        idempotencyKey: eventId,
        payload: rawBody,
        status: WebhookEventStatus.PENDING,
      },
      update: {},
    });

    const eventName = event.event;

    // 1. Payment Captured
    if (eventName === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const order = await prisma.order.findFirst({
          where: { razorpayOrderId },
        });

        if (order && order.status === OrderStatus.PENDING_PAYMENT) {
          await prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: OrderStatus.CONFIRMED,
                paymentStatus: PaymentStatus.CAPTURED,
                razorpayPaymentId,
              },
            });

            // Update or create payment record
            const existingPayment = await tx.payment.findFirst({
              where: { orderId: order.id },
            });

            if (existingPayment) {
              await tx.payment.update({
                where: { id: existingPayment.id },
                data: {
                  status: PaymentStatus.CAPTURED,
                  transactionId: razorpayPaymentId,
                },
              });
            } else {
              await tx.payment.create({
                data: {
                  orderId: order.id,
                  paymentProvider: "RAZORPAY",
                  transactionId: razorpayPaymentId,
                  amountMinorUnits: order.totalAmountMinorUnits,
                  currency: order.currency,
                  status: PaymentStatus.CAPTURED,
                },
              });
            }

            await tx.auditLog.create({
              data: {
                action: "PAYMENT_CAPTURED_WEBHOOK",
                entity: "Order",
                entityId: order.id,
                details: JSON.stringify({ razorpayOrderId, razorpayPaymentId }),
              },
            });
          });
          logger.info(`[RazorpayWebhook] Order ${order.orderNumber} confirmed via webhook.`);
        }
      }
    }

    // 2. Payment Failed
    else if (eventName === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const errorDescription = paymentEntity?.error_description || "Payment failed at gateway";

      if (razorpayOrderId) {
        const order = await prisma.order.findFirst({
          where: { razorpayOrderId },
        });

        if (order && order.status === OrderStatus.PENDING_PAYMENT) {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: PaymentStatus.FAILED,
              notes: `${order.notes ? order.notes + "\n" : ""}[Payment Gateway Error]: ${errorDescription}`,
            },
          });
          logger.warn(`[RazorpayWebhook] Payment failed for order ${order.orderNumber}: ${errorDescription}`);
        }
      }
    }

    // 3. Refund Processed
    else if (eventName === "refund.processed" || eventName === "refund.speed_processed") {
      const refundEntity = event.payload?.refund?.entity;
      const razorpayPaymentId = refundEntity?.payment_id;
      const refundId = refundEntity?.id;

      if (refundId) {
        const dbRefund = await prisma.refund.findFirst({
          where: { refundId },
          include: { order: true },
        });

        if (dbRefund && dbRefund.status !== "PROCESSED") {
          await prisma.$transaction(async (tx) => {
            await tx.refund.update({
              where: { id: dbRefund.id },
              data: { status: "PROCESSED" },
            });

            await tx.auditLog.create({
              data: {
                action: "REFUND_PROCESSED_WEBHOOK",
                entity: "Refund",
                entityId: dbRefund.id,
                details: JSON.stringify({ refundId, razorpayPaymentId }),
              },
            });
          });
          logger.info(`[RazorpayWebhook] Refund ${refundId} marked PROCESSED.`);
        }
      }
    }

    // 4. Refund Failed
    else if (eventName === "refund.failed") {
      const refundEntity = event.payload?.refund?.entity;
      const refundId = refundEntity?.id;

      if (refundId) {
        await prisma.refund.updateMany({
          where: { refundId },
          data: { status: "FAILED" },
        });
        logger.error(`[RazorpayWebhook] Refund ${refundId} marked FAILED.`);
      }
    }

    // Mark webhook event as processed
    await prisma.webhookEvent.update({
      where: { idempotencyKey: eventId },
      data: {
        status: WebhookEventStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("[RazorpayWebhookError]", { error });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
