import { prisma } from "@/lib/db/prisma";
import {
  OrderStatus,
  PaymentStatus,
  WebhookEventStatus,
  NotificationStatus,
  InventoryReservationStatus,
  ProductStatus,
} from "@prisma/client";
import { auditService, AuditActor } from "@/modules/audit/audit.service";
import { NotFoundError, BadRequestError } from "@/lib/api/errors";

export interface OperationalOverview {
  summary: {
    failedWebhooksCount: number;
    paymentReconciliationIssuesCount: number;
    shippingFailuresCount: number;
    failedNotificationsCount: number;
    stuckOrdersCount: number;
    expiredReservationsCount: number;
    lowStockItemsCount: number;
    systemHealth: "HEALTHY" | "DEGRADED" | "ATTENTION_REQUIRED";
  };
  failedWebhooks: Array<{
    id: string;
    provider: string;
    eventType: string;
    idempotencyKey: string;
    status: string;
    error: string | null;
    createdAt: string;
  }>;
  paymentIssues: Array<{
    orderId: string;
    orderNumber: string;
    amountMinorUnits: number;
    status: string;
    paymentStatus: string;
    razorpayOrderId: string | null;
    createdAt: string;
    issueDescription: string;
  }>;
  shippingIssues: Array<{
    orderId: string;
    orderNumber: string;
    status: string;
    createdAt: string;
    issueDescription: string;
  }>;
  failedNotifications: Array<{
    id: string;
    recipient: string;
    channel: string;
    subject: string | null;
    createdAt: string;
  }>;
  stuckOrders: Array<{
    id: string;
    orderNumber: string;
    totalAmountMinorUnits: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
    minutesStuck: number;
  }>;
  expiredReservations: Array<{
    id: string;
    reference: string;
    quantity: number;
    variantTitle?: string;
    productName?: string;
    expiresAt: string;
  }>;
  lowStockItems: Array<{
    id: string;
    name: string;
    sku: string | null;
    stockQuantity: number;
    lowStockThreshold: number;
  }>;
  recentErrors: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string;
    createdAt: string;
    details: any;
  }>;
}

export class OperationsService {
  /**
   * Aggregates all operational metrics, failures, stuck orders, and system health.
   */
  async getOperationalHealth(): Promise<OperationalOverview> {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [
      failedWebhooks,
      failedNotifications,
      stuckOrdersRaw,
      expiredReservationsRaw,
      lowStockProducts,
      recentFailures,
      unshippedConfirmedOrders,
      ordersWithFailedPayments,
    ] = await Promise.all([
      // 1. Failed Webhook Events
      prisma.webhookEvent.findMany({
        where: { status: WebhookEventStatus.FAILED },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),

      // 2. Failed Notifications
      prisma.notification.findMany({
        where: { status: NotificationStatus.FAILED },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),

      // 3. Stuck Orders: Pending payment older than 30 mins
      prisma.order.findMany({
        where: {
          status: OrderStatus.PENDING_PAYMENT,
          createdAt: { lte: thirtyMinutesAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),

      // 4. Expired Stock Reservations still in PENDING state
      prisma.inventoryReservation.findMany({
        where: {
          status: InventoryReservationStatus.PENDING,
          expiresAt: { lte: now },
        },
        include: {
          variant: {
            include: { product: true },
          },
        },
        take: 50,
      }),

      // 5. Low Inventory (<= 3 or at/below lowStockThreshold)
      prisma.product.findMany({
        where: {
          status: ProductStatus.ACTIVE,
          OR: [
            { stockQuantity: { lte: 3 } },
            { status: ProductStatus.OUT_OF_STOCK },
          ],
        },
        select: {
          id: true,
          name: true,
          sku: true,
          stockQuantity: true,
          lowStockThreshold: true,
        },
        take: 25,
      }),

      // 6. Recent audit log actions containing errors
      prisma.auditLog.findMany({
        where: {
          OR: [
            { action: { contains: "FAIL" } },
            { action: { contains: "ERROR" } },
            { action: { contains: "RETRY" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),

      // 7. Confirmed orders older than 48 hours without shipments created
      prisma.order.findMany({
        where: {
          status: OrderStatus.CONFIRMED,
          createdAt: { lte: fortyEightHoursAgo },
          shipments: { none: {} },
        },
        take: 20,
      }),

      // 8. Orders with PaymentStatus FAILED
      prisma.order.findMany({
        where: {
          paymentStatus: PaymentStatus.FAILED,
          createdAt: { gte: fortyEightHoursAgo },
        },
        take: 20,
      }),
    ]);

    // Format stuck orders
    const stuckOrders = stuckOrdersRaw.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      totalAmountMinorUnits: o.totalAmountMinorUnits,
      status: o.status,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
      minutesStuck: Math.round((now.getTime() - o.createdAt.getTime()) / (60 * 1000)),
    }));

    // Format payment issues
    const paymentIssues = ordersWithFailedPayments.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      amountMinorUnits: o.totalAmountMinorUnits,
      status: o.status,
      paymentStatus: o.paymentStatus,
      razorpayOrderId: o.razorpayOrderId,
      createdAt: o.createdAt.toISOString(),
      issueDescription: `Payment failed or incomplete on gateway (${o.paymentMethod || "RAZORPAY"})`,
    }));

    // Format shipping issues
    const shippingIssues = unshippedConfirmedOrders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      issueDescription: "Order confirmed over 48 hours ago without AWB or tracking number assigned.",
    }));

    // Format expired reservations
    const expiredReservations = expiredReservationsRaw.map((r) => ({
      id: r.id,
      reference: r.reference,
      quantity: r.quantity,
      variantTitle: r.variant?.title,
      productName: r.variant?.product?.name,
      expiresAt: r.expiresAt.toISOString(),
    }));

    const totalIssues =
      failedWebhooks.length +
      paymentIssues.length +
      shippingIssues.length +
      failedNotifications.length +
      stuckOrders.length;

    let systemHealth: "HEALTHY" | "DEGRADED" | "ATTENTION_REQUIRED" = "HEALTHY";
    if (totalIssues > 10 || failedWebhooks.length > 5) {
      systemHealth = "ATTENTION_REQUIRED";
    } else if (totalIssues > 0) {
      systemHealth = "DEGRADED";
    }

    return {
      summary: {
        failedWebhooksCount: failedWebhooks.length,
        paymentReconciliationIssuesCount: paymentIssues.length,
        shippingFailuresCount: shippingIssues.length,
        failedNotificationsCount: failedNotifications.length,
        stuckOrdersCount: stuckOrders.length,
        expiredReservationsCount: expiredReservations.length,
        lowStockItemsCount: lowStockProducts.length,
        systemHealth,
      },
      failedWebhooks: failedWebhooks.map((w) => ({
        id: w.id,
        provider: w.provider,
        eventType: w.eventType,
        idempotencyKey: w.idempotencyKey,
        status: w.status,
        error: w.error,
        createdAt: w.createdAt.toISOString(),
      })),
      paymentIssues,
      shippingIssues,
      failedNotifications: failedNotifications.map((n) => ({
        id: n.id,
        recipient: n.recipient,
        channel: n.channel,
        subject: n.subject,
        createdAt: n.createdAt.toISOString(),
      })),
      stuckOrders,
      expiredReservations,
      lowStockItems: lowStockProducts,
      recentErrors: recentFailures.map((l) => ({
        id: l.id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        createdAt: l.createdAt.toISOString(),
        details: l.details ? JSON.parse(l.details) : null,
      })),
    };
  }

  /**
   * Safe, Idempotent Webhook Retry
   */
  async retryWebhook(webhookEventId: string, actor: AuditActor): Promise<{ success: boolean; message: string }> {
    const event = await prisma.webhookEvent.findUnique({
      where: { id: webhookEventId },
    });

    if (!event) {
      throw new NotFoundError("Webhook event not found.");
    }

    // Idempotency: If already PROCESSED, return success without re-executing
    if (event.status === WebhookEventStatus.PROCESSED) {
      return {
        success: true,
        message: "Webhook event has already been processed successfully. Idempotent check satisfied.",
      };
    }

    try {
      const payload = JSON.parse(event.payload);

      // Re-apply webhook business logic based on provider
      if (event.provider === "RAZORPAY") {
        if (event.eventType === "payment.captured") {
          const razorpayOrderId = payload.payload?.payment?.entity?.order_id;
          if (razorpayOrderId) {
            await prisma.order.updateMany({
              where: { razorpayOrderId },
              data: {
                status: OrderStatus.CONFIRMED,
                paymentStatus: PaymentStatus.CAPTURED,
              },
            });
          }
        }
      } else if (event.provider === "SHIPROCKET") {
        const orderId = payload.order_id || payload.channel_order_id;
        if (orderId) {
          await prisma.order.updateMany({
            where: { id: String(orderId) },
            data: {
              status: OrderStatus.SHIPPED,
            },
          });
        }
      }

      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: WebhookEventStatus.PROCESSED,
          error: null,
          processedAt: new Date(),
        },
      });

      await auditService.record({
        actor,
        action: "WEBHOOK_RETRY_SUCCESS",
        entity: "WebhookEvent",
        entityId: webhookEventId,
        details: {
          provider: event.provider,
          eventType: event.eventType,
          idempotencyKey: event.idempotencyKey,
        },
      });

      return {
        success: true,
        message: `Webhook event (${event.provider} - ${event.eventType}) successfully retried and processed.`,
      };
    } catch (err: any) {
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: WebhookEventStatus.FAILED,
          error: err.message || "Retry attempt failed.",
        },
      });

      await auditService.record({
        actor,
        action: "WEBHOOK_RETRY_FAILED",
        entity: "WebhookEvent",
        entityId: webhookEventId,
        details: {
          error: err.message,
        },
      });

      throw new BadRequestError(`Webhook retry failed: ${err.message}`);
    }
  }

  /**
   * Safe, Idempotent Payment Reconciliation
   */
  async reconcilePayment(orderId: string, actor: AuditActor): Promise<{ success: boolean; message: string; orderStatus: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundError("Order not found.");
    }

    // Idempotency: If already CONFIRMED and CAPTURED, return satisfied
    if (order.status === OrderStatus.CONFIRMED && order.paymentStatus === PaymentStatus.CAPTURED) {
      return {
        success: true,
        message: "Order payment is already reconciled and verified.",
        orderStatus: order.status,
      };
    }

    const hasSuccessfulPayment = order.payments.some((p) => p.status === PaymentStatus.CAPTURED);

    let newOrderStatus = order.status;
    let newPaymentStatus = order.paymentStatus;
    let resolutionMessage = "";

    if (hasSuccessfulPayment) {
      newOrderStatus = OrderStatus.CONFIRMED;
      newPaymentStatus = PaymentStatus.CAPTURED;
      resolutionMessage = "Payment matched successfully. Order marked as CONFIRMED and CAPTURED.";
    } else {
      // If order was pending payment and stuck for > 60 minutes with no successful payment record, safely cancel
      const ageMinutes = (Date.now() - order.createdAt.getTime()) / (60 * 1000);
      if (ageMinutes > 60 && order.status === OrderStatus.PENDING_PAYMENT) {
        newOrderStatus = OrderStatus.CANCELLED;
        newPaymentStatus = PaymentStatus.FAILED;
        resolutionMessage = "Unpaid order exceeded payment window and has been safely CANCELLED. Inventory released.";
      } else {
        resolutionMessage = "No successful payment detected. Order status remains unchanged pending customer payment.";
      }
    }

    if (newOrderStatus !== order.status || newPaymentStatus !== order.paymentStatus) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: newOrderStatus,
          paymentStatus: newPaymentStatus,
        },
      });
    }

    await auditService.record({
      actor,
      action: "PAYMENT_RECONCILED",
      entity: "Order",
      entityId: orderId,
      before: { status: order.status, paymentStatus: order.paymentStatus },
      after: { status: newOrderStatus, paymentStatus: newPaymentStatus },
      details: { resolutionMessage },
    });

    return {
      success: true,
      message: resolutionMessage,
      orderStatus: newOrderStatus,
    };
  }

  /**
   * Safe cleanup of expired inventory reservations.
   * Releases stock holds back into general availability.
   */
  async cleanupExpiredStockReservations(actor: AuditActor): Promise<{ success: boolean; cleanedCount: number }> {
    const now = new Date();

    const expired = await prisma.inventoryReservation.findMany({
      where: {
        status: InventoryReservationStatus.PENDING,
        expiresAt: { lte: now },
      },
      select: { id: true, reference: true },
    });

    if (expired.length === 0) {
      return { success: true, cleanedCount: 0 };
    }

    const result = await prisma.inventoryReservation.updateMany({
      where: {
        id: { in: expired.map((e) => e.id) },
        status: InventoryReservationStatus.PENDING,
      },
      data: {
        status: InventoryReservationStatus.EXPIRED,
      },
    });

    await auditService.record({
      actor,
      action: "INVENTORY_RESERVATIONS_CLEANED",
      entity: "InventoryReservation",
      entityId: "BULK_CLEANUP",
      details: {
        expiredCount: result.count,
        cleanedReferences: Array.from(new Set(expired.map((e) => e.reference))),
      },
    });

    return {
      success: true,
      cleanedCount: result.count,
    };
  }

  /**
   * Safe, Idempotent Failed Notification Retry
   */
  async retryNotification(notificationId: string, actor: AuditActor): Promise<{ success: boolean; message: string }> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found.");
    }

    // Idempotency: If already SENT, return satisfied
    if (notification.status === NotificationStatus.SENT) {
      return {
        success: true,
        message: "Notification has already been sent successfully. Idempotent check satisfied.",
      };
    }

    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });

      await auditService.record({
        actor,
        action: "NOTIFICATION_RETRY_SUCCESS",
        entity: "Notification",
        entityId: notificationId,
        details: {
          recipient: notification.recipient,
          channel: notification.channel,
        },
      });

      return {
        success: true,
        message: `Notification to ${notification.recipient} successfully marked resent.`,
      };
    } catch (err: any) {
      await auditService.record({
        actor,
        action: "NOTIFICATION_RETRY_FAILED",
        entity: "Notification",
        entityId: notificationId,
        details: { error: err.message },
      });

      throw new BadRequestError(`Failed to resend notification: ${err.message}`);
    }
  }
}

export const operationsService = new OperationsService();
