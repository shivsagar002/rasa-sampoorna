import { prisma } from "@/lib/db/prisma";
import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { getEnv } from "@/lib/validation/env";
import { logger } from "@/lib/observability/logger";
import {
  NotificationEventType,
  getNotificationCategory,
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DispatchNotificationInput,
  UnsubscribeInput,
  notificationPreferencesSchema,
} from "./notification.schema";
import {
  renderVerifyEmailTemplate,
  renderPasswordResetTemplate,
  renderWelcomeTemplate,
  renderSecurityAlertTemplate,
  renderOrderConfirmationTemplate,
  renderPaymentConfirmedTemplate,
  renderPaymentFailedTemplate,
  renderShipmentDispatchedTemplate,
  renderDeliveryConfirmedTemplate,
  renderOrderCancelledTemplate,
  renderReturnStatusTemplate,
  renderRefundStatusTemplate,
  renderBackInStockTemplate,
  renderWishlistAlertTemplate,
  renderPriceDropTemplate,
  renderAbandonedCartTemplate,
} from "./notification-templates";

export interface NotificationEnvelope {
  eventType: NotificationEventType;
  subject: string;
  text?: string;
  html: string;
  idempotencyKey?: string;
  attempts: number;
  lastAttemptAt?: string;
  error?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SendNotificationResult {
  success: boolean;
  notificationId?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

export interface ProviderStatus {
  provider: "resend";
  isConfigured: boolean;
  isLive: boolean;
  senderAddress: string;
  mode: "production" | "sandbox_mock";
  verifiedAt: string;
}

export class NotificationService {
  /**
   * Remove sensitive tokens, passwords, and secrets from metadata before persisting or logging
   */
  private sanitizeMetadata(data?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!data) return undefined;
    const sensitiveKeys = [
      "password",
      "passwordhash",
      "token",
      "verifytoken",
      "resettoken",
      "verificationtoken",
      "secret",
      "authorization",
      "cookie",
      "sessionid",
      "key",
      "razorpaysignature",
    ];

    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
        sanitized[k] = "[REDACTED]";
      } else if (v && typeof v === "object" && !Array.isArray(v)) {
        sanitized[k] = this.sanitizeMetadata(v as Record<string, unknown>);
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  /**
   * Check integration status of Resend provider
   */
  getProviderStatus(): ProviderStatus {
    const env = getEnv();
    const apiKey = env.RESEND_API_KEY;
    const isConfigured = Boolean(
      apiKey &&
      apiKey !== "re_placeholder" &&
      apiKey.trim().startsWith("re_") &&
      apiKey.trim().length > 10
    );

    return {
      provider: "resend",
      isConfigured,
      isLive: isConfigured && env.NODE_ENV === "production",
      senderAddress: env.EMAIL_FROM,
      mode: isConfigured ? "production" : "sandbox_mock",
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieve notification preferences for a customer
   */
  async getPreferences(identifier: { userId?: string; email?: string }): Promise<NotificationPreferences> {
    try {
      if (identifier.userId) {
        const user = await prisma.user.findUnique({
          where: { id: identifier.userId },
          select: { notificationPreferences: true },
        });

        if (user?.notificationPreferences) {
          const parsed = JSON.parse(user.notificationPreferences);
          const validated = notificationPreferencesSchema.safeParse(parsed);
          if (validated.success) return validated.data;
        }
      }

      if (identifier.email) {
        const user = await prisma.user.findUnique({
          where: { email: identifier.email },
          select: { notificationPreferences: true },
        });

        if (user?.notificationPreferences) {
          const parsed = JSON.parse(user.notificationPreferences);
          const validated = notificationPreferencesSchema.safeParse(parsed);
          if (validated.success) return validated.data;
        }
      }
    } catch (err) {
      logger.warn("Error fetching patron notification preferences, using defaults", { error: String(err) });
    }

    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  /**
   * Update notification preferences for a patron
   */
  async updatePreferences(
    identifier: { userId?: string; email?: string },
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(identifier);
    const merged: NotificationPreferences = {
      ...current,
      ...updates,
      // Transactional updates cannot be disabled by patron preferences
      orderUpdates: true,
      securityAlerts: true,
    };

    const validated = notificationPreferencesSchema.parse(merged);

    if (identifier.userId) {
      await prisma.user.update({
        where: { id: identifier.userId },
        data: { notificationPreferences: JSON.stringify(validated) },
      });
    } else if (identifier.email) {
      const user = await prisma.user.findUnique({ where: { email: identifier.email } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { notificationPreferences: JSON.stringify(validated) },
        });
      }
    }

    return validated;
  }

  /**
   * Handle patron unsubscribe request
   */
  async unsubscribe(input: UnsubscribeInput): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (user) {
      const current = await this.getPreferences({ userId: user.id });
      const updated: NotificationPreferences = { ...current };

      if (input.category === "ALL_MARKETING") {
        updated.marketingOffers = false;
        updated.backInStock = false;
        updated.abandonedCart = false;
      } else if (input.category === "BACK_IN_STOCK") {
        updated.backInStock = false;
      } else if (input.category === "ABANDONED_CART") {
        updated.abandonedCart = false;
      } else if (input.category === "SPECIAL_OFFERS") {
        updated.marketingOffers = false;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { notificationPreferences: JSON.stringify(updated) },
      });
    }

    logger.info("Patron unsubscribed from marketing notifications", {
      recipient: input.email,
      category: input.category,
    });

    return {
      success: true,
      message: "You have been unsubscribed from promotional communications. Essential transactional notifications remain active.",
    };
  }

  /**
   * Check if a marketing notification is allowed by consent and rate limiting
   */
  private async checkMarketingEligibility(
    eventType: NotificationEventType,
    recipient: string,
    userId?: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    const prefs = await this.getPreferences({ userId, email: recipient });

    // Check specific consent categories
    if (eventType === "RETENTION_BACK_IN_STOCK" && !prefs.backInStock) {
      return { eligible: false, reason: "Patron has not opted into back-in-stock alerts" };
    }
    if (eventType === "RETENTION_ABANDONED_CART" && !prefs.abandonedCart) {
      return { eligible: false, reason: "Patron has not opted into abandoned-cart reminders" };
    }
    if (
      (eventType === "RETENTION_PRICE_DROP" || eventType === "RETENTION_WISHLIST_ALERT") &&
      !prefs.marketingOffers
    ) {
      return { eligible: false, reason: "Patron has not opted into promotional alerts" };
    }

    // Rate Limiting: Prevent sending marketing reminders more than once every 24 hours per recipient
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMarketing = await prisma.notification.findFirst({
      where: {
        recipient,
        createdAt: { gte: oneDayAgo },
        body: { contains: `"eventType":"${eventType}"` },
        status: NotificationStatus.SENT,
      },
    });

    if (recentMarketing) {
      return { eligible: false, reason: `Marketing rate limit reached for ${eventType} within 24 hours` };
    }

    return { eligible: true };
  }

  /**
   * Core dispatch mechanism:
   * 1. Check idempotency & consent
   * 2. Persist outbox entry in PENDING status
   * 3. Dispatch to Resend (or Sandbox Logger)
   * 4. Update status to SENT or FAILED
   * 5. Safe non-blocking execution (never throws to caller)
   */
  async sendNotification(input: DispatchNotificationInput): Promise<SendNotificationResult> {
    const env = getEnv();
    const category = getNotificationCategory(input.eventType);

    // 1. Marketing consent & rate limits
    if (category === "MARKETING" && !input.forceTransactional) {
      const eligibility = await this.checkMarketingEligibility(input.eventType, input.recipient, input.userId);
      if (!eligibility.eligible) {
        logger.info("[NotificationSkipped] Consent/rate limit", {
          recipient: input.recipient,
          eventType: input.eventType,
          reason: eligibility.reason,
        });
        return { success: true, skipped: true, reason: eligibility.reason };
      }
    }

    // 2. Idempotency Check
    if (input.idempotencyKey && prisma?.notification?.findFirst) {
      try {
        const existing = await prisma.notification.findFirst({
          where: {
            recipient: input.recipient,
            body: { contains: `"idempotencyKey":"${input.idempotencyKey}"` },
            status: NotificationStatus.SENT,
          },
        });

        if (existing) {
          logger.info("[NotificationSkipped] Duplicate event prevented by idempotency key", {
            recipient: input.recipient,
            eventType: input.eventType,
            idempotencyKey: input.idempotencyKey,
          });
          return { success: true, skipped: true, reason: "ALREADY_SENT", notificationId: existing.id };
        }
      } catch {
        // Fallback if table not queried
      }
    }

    // 3. Persist PENDING Outbox Record
    const envelope: NotificationEnvelope = {
      eventType: input.eventType,
      subject: input.subject,
      text: input.text,
      html: input.html,
      idempotencyKey: input.idempotencyKey,
      attempts: 1,
      lastAttemptAt: new Date().toISOString(),
      metadata: this.sanitizeMetadata(input.metadata),
    };

    let notificationRecord: { id: string } | null = null;
    if (prisma?.notification?.create) {
      try {
        notificationRecord = await prisma.notification.create({
          data: {
            userId: input.userId || null,
            channel: NotificationChannel.EMAIL,
            recipient: input.recipient,
            subject: input.subject,
            body: JSON.stringify(envelope),
            status: NotificationStatus.PENDING,
          },
        });
      } catch (dbErr) {
        logger.error("Failed to persist notification outbox entry", {
          recipient: input.recipient,
          eventType: input.eventType,
          error: String(dbErr),
        });
        return { success: false, error: "Database error recording notification outbox" };
      }
    } else {
      notificationRecord = { id: `mock-outbox-${Date.now()}` };
    }

    // 4. Dispatch Email
    return await this.executeDispatch(notificationRecord.id, input, envelope);
  }

  /**
   * Internal execution of HTTP delivery to Resend or Sandbox Mock
   */
  private async executeDispatch(
    notificationId: string,
    input: { recipient: string; subject: string; html: string; text?: string; eventType: NotificationEventType },
    envelope: NotificationEnvelope
  ): Promise<SendNotificationResult> {
    const env = getEnv();
    const providerStatus = this.getProviderStatus();

    // Mode A: Sandbox Mock Logger (Safe Fallback)
    if (!providerStatus.isConfigured) {
      logger.info("[NotificationSandboxMock] Mock email delivered", {
        notificationId,
        recipient: input.recipient,
        subject: input.subject,
        eventType: input.eventType,
        from: env.EMAIL_FROM,
      });

      if (prisma?.notification?.update) {
        try {
          await prisma.notification.update({
            where: { id: notificationId },
            data: {
              status: NotificationStatus.SENT,
              sentAt: new Date(),
            },
          });
        } catch (err) {
          logger.warn("Failed to update mock notification status", { notificationId, error: String(err) });
        }
      }
      return { success: true, notificationId };
    }

    // Mode B: Live Resend HTTP Dispatch
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: input.recipient,
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        const errorMessage = `Resend API returned HTTP ${res.status}: ${errorText.slice(0, 200)}`;
        logger.error("Resend API delivery failed", { notificationId, recipient: input.recipient, status: res.status });

        envelope.error = errorMessage;
        if (prisma?.notification?.update) {
          await prisma.notification.update({
            where: { id: notificationId },
            data: {
              status: NotificationStatus.FAILED,
              body: JSON.stringify(envelope),
            },
          }).catch(() => null);
        }

        return { success: false, notificationId, error: errorMessage };
      }

      if (notificationId && prisma?.notification?.update) {
        try {
          await prisma.notification.update({
            where: { id: notificationId },
            data: {
              status: NotificationStatus.SENT,
              sentAt: new Date(),
            },
          });
        } catch {
          // ignore error in updating outbox record
        }
      }

      logger.info("Email delivered successfully via Resend", {
        notificationId,
        recipient: input.recipient,
        eventType: input.eventType,
      });

      return { success: true, notificationId };
    } catch (err: any) {
      const errorMessage = err?.message || "Network exception contacting email provider";
      logger.error("Exception during email dispatch", { notificationId, error: errorMessage });

      envelope.error = errorMessage;
      if (notificationId && prisma?.notification?.update) {
        try {
          await prisma.notification.update({
            where: { id: notificationId },
            data: {
              status: NotificationStatus.FAILED,
              body: JSON.stringify(envelope),
            },
          });
        } catch {
          // ignore error in recording failed outbox record
        }
      }

      return { success: false, notificationId, error: errorMessage };
    }
  }

  /**
   * Retry failed or stalled outbox notifications (Max 3 attempts per message)
   */
  async retryFailedNotifications(limit = 20): Promise<{ processed: number; succeeded: number; failed: number }> {
    const failedRecords = await prisma.notification.findMany({
      where: {
        status: NotificationStatus.FAILED,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    let succeeded = 0;
    let failed = 0;

    for (const record of failedRecords) {
      try {
        const envelope: NotificationEnvelope = JSON.parse(record.body);
        if (envelope.attempts >= 3) {
          failed++;
          continue; // Max retries exceeded
        }

        envelope.attempts += 1;
        envelope.lastAttemptAt = new Date().toISOString();

        const result = await this.executeDispatch(
          record.id,
          {
            recipient: record.recipient,
            subject: record.subject || envelope.subject,
            html: envelope.html,
            text: envelope.text,
            eventType: envelope.eventType,
          },
          envelope
        );

        if (result.success) {
          succeeded++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        logger.error("Error retrying notification", { id: record.id, error: String(err) });
      }
    }

    return { processed: failedRecords.length, succeeded, failed };
  }

  // -------------------------------------------------------------
  // CONVENIENCE METHODS: ACCOUNT LIFECYCLE
  // -------------------------------------------------------------

  async notifyVerifyEmail(data: {
    recipient: string;
    customerName: string;
    verifyUrl: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderVerifyEmailTemplate(data);
    return await this.sendNotification({
      eventType: "ACCOUNT_VERIFY_EMAIL",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      forceTransactional: true,
    });
  }

  async notifyPasswordReset(data: {
    recipient: string;
    customerName: string;
    resetUrl: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderPasswordResetTemplate(data);
    return await this.sendNotification({
      eventType: "ACCOUNT_PASSWORD_RESET",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      forceTransactional: true,
    });
  }

  async notifyWelcome(data: {
    recipient: string;
    customerName: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderWelcomeTemplate(data);
    return await this.sendNotification({
      eventType: "ACCOUNT_WELCOME",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      forceTransactional: true,
      idempotencyKey: `welcome_${data.userId || data.recipient}`,
    });
  }

  async notifySecurityAlert(data: {
    recipient: string;
    customerName: string;
    eventDescription: string;
    timestamp?: string;
    ipAddress?: string;
    userAgent?: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderSecurityAlertTemplate({
      customerName: data.customerName,
      eventDescription: data.eventDescription,
      timestamp: data.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
    return await this.sendNotification({
      eventType: "ACCOUNT_SECURITY_ALERT",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      forceTransactional: true,
    });
  }

  // -------------------------------------------------------------
  // CONVENIENCE METHODS: ORDER LIFECYCLE
  // -------------------------------------------------------------

  async notifyOrderConfirmed(data: {
    recipient: string;
    customerName: string;
    orderNumber: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    totalRupees: number;
    shippingAddressText?: string;
    trackingUrl?: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderOrderConfirmationTemplate(data);
    return await this.sendNotification({
      eventType: "ORDER_CONFIRMATION",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      forceTransactional: true,
      idempotencyKey: `order_confirmed_${data.orderNumber}`,
      metadata: { orderNumber: data.orderNumber, totalRupees: data.totalRupees },
    });
  }

  async notifyPaymentConfirmed(data: {
    recipient: string;
    customerName: string;
    orderNumber: string;
    paymentId: string;
    amountRupees: number;
    date?: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderPaymentConfirmedTemplate(data);
    return await this.sendNotification({
      eventType: "ORDER_PAYMENT_CONFIRMED",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      forceTransactional: true,
      idempotencyKey: `payment_confirmed_${data.paymentId}`,
      metadata: { orderNumber: data.orderNumber, paymentId: data.paymentId },
    });
  }

  async notifyPaymentFailed(data: {
    recipient: string;
    customerName: string;
    orderNumber: string;
    retryPaymentUrl: string;
    failureReason?: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderPaymentFailedTemplate(data);
    return await this.sendNotification({
      eventType: "ORDER_PAYMENT_FAILED",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      forceTransactional: true,
      idempotencyKey: `payment_failed_${data.orderNumber}_${Date.now()}`,
    });
  }

  async notifyShipmentDispatched(data: {
    recipient: string;
    customerName: string;
    orderNumber: string;
    courier: string;
    trackingNumber: string;
    trackingUrl?: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderShipmentDispatchedTemplate(data);
    return await this.sendNotification({
      eventType: "ORDER_DISPATCHED",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      forceTransactional: true,
      idempotencyKey: `shipment_${data.orderNumber}_${data.trackingNumber}`,
    });
  }

  async notifyDeliveryConfirmed(data: {
    recipient: string;
    customerName: string;
    orderNumber: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderDeliveryConfirmedTemplate(data);
    return await this.sendNotification({
      eventType: "ORDER_DELIVERED",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      forceTransactional: true,
      idempotencyKey: `delivered_${data.orderNumber}`,
    });
  }

  async notifyOrderCancelled(data: {
    recipient: string;
    customerName: string;
    orderNumber: string;
    reason?: string;
    refundNote?: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderOrderCancelledTemplate(data);
    return await this.sendNotification({
      eventType: "ORDER_CANCELLED",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      forceTransactional: true,
      idempotencyKey: `cancelled_${data.orderNumber}`,
    });
  }

  async notifyReturnStatus(data: {
    recipient: string;
    customerName: string;
    orderNumber: string;
    returnStatus: string;
    reverseAwb?: string;
    instructions?: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderReturnStatusTemplate(data);
    return await this.sendNotification({
      eventType: "ORDER_RETURN_STATUS",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      forceTransactional: true,
      idempotencyKey: `return_status_${data.orderNumber}_${data.returnStatus}`,
    });
  }

  async notifyRefundProcessed(data: {
    recipient: string;
    customerName: string;
    orderNumber: string;
    refundId: string;
    amountRupees: number;
    timelineDays?: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderRefundStatusTemplate(data);
    return await this.sendNotification({
      eventType: "ORDER_REFUND_STATUS",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName,
      subject: template.subject,
      html: template.html,
      text: template.text,
      forceTransactional: true,
      idempotencyKey: `refund_processed_${data.orderNumber}_${data.refundId}`,
    });
  }

  // -------------------------------------------------------------
  // CONVENIENCE METHODS: PRODUCT & RETENTION (OPT-IN MARKETING)
  // -------------------------------------------------------------

  async notifyBackInStock(data: {
    recipient: string;
    customerName?: string;
    productName: string;
    productUrl: string;
    priceRupees: number;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderBackInStockTemplate({
      customerName: data.customerName || "Patron",
      productName: data.productName,
      productUrl: data.productUrl,
      priceRupees: data.priceRupees,
    });

    return await this.sendNotification({
      eventType: "RETENTION_BACK_IN_STOCK",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName || "Patron",
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: `back_in_stock_${data.recipient}_${data.productName}`,
    });
  }

  async notifyWishlistAlert(data: {
    recipient: string;
    customerName?: string;
    productName: string;
    productUrl: string;
    alertReason: string;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderWishlistAlertTemplate({
      customerName: data.customerName || "Patron",
      productName: data.productName,
      productUrl: data.productUrl,
      alertReason: data.alertReason,
    });

    return await this.sendNotification({
      eventType: "RETENTION_WISHLIST_ALERT",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName || "Patron",
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async notifyPriceDrop(data: {
    recipient: string;
    customerName?: string;
    productName: string;
    productUrl: string;
    originalPriceRupees: number;
    salePriceRupees: number;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderPriceDropTemplate({
      customerName: data.customerName || "Patron",
      productName: data.productName,
      productUrl: data.productUrl,
      originalPriceRupees: data.originalPriceRupees,
      salePriceRupees: data.salePriceRupees,
    });

    return await this.sendNotification({
      eventType: "RETENTION_PRICE_DROP",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName || "Patron",
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: `price_drop_${data.recipient}_${data.productName}_${data.salePriceRupees}`,
    });
  }

  async notifyAbandonedCart(data: {
    recipient: string;
    customerName?: string;
    checkoutUrl: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    userId?: string;
  }): Promise<SendNotificationResult> {
    const template = renderAbandonedCartTemplate({
      customerName: data.customerName || "Patron",
      checkoutUrl: data.checkoutUrl,
      items: data.items,
    });

    return await this.sendNotification({
      eventType: "RETENTION_ABANDONED_CART",
      recipient: data.recipient,
      userId: data.userId,
      customerName: data.customerName || "Patron",
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey: `abandoned_cart_${data.recipient}_${new Date().toDateString()}`,
    });
  }
}

export const notificationService = new NotificationService();
