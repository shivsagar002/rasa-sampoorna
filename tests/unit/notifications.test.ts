import { describe, it, expect, vi, beforeEach } from "vitest";
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
  renderAbandonedCartTemplate,
  renderPriceDropTemplate,
  renderWishlistAlertTemplate,
} from "@/modules/notifications/notification-templates";
import {
  NotificationService,
  NotificationEnvelope,
} from "@/modules/notifications/notification.service";
import {
  getNotificationCategory,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/modules/notifications/notification.schema";
import { NotificationStatus } from "@prisma/client";

// Hoisted Mocks
const mocks = vi.hoisted(() => ({
  resendApiKey: undefined as string | undefined,
  notification: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    notification: mocks.notification,
    user: mocks.user,
  },
}));

vi.mock("@/lib/validation/env", () => ({
  getEnv: () => ({
    RESEND_API_KEY: mocks.resendApiKey,
    EMAIL_FROM: "orders@rasasampoorna.com",
    NEXT_PUBLIC_APP_URL: "https://rasasampoorna.com",
    NODE_ENV: "test",
  }),
  env: {
    RESEND_API_KEY: mocks.resendApiKey,
    EMAIL_FROM: "orders@rasasampoorna.com",
    NEXT_PUBLIC_APP_URL: "https://rasasampoorna.com",
    NODE_ENV: "test",
  },
}));

describe("RASA Sampoorna Notification & Transactional Email System", () => {
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resendApiKey = undefined;
    service = new NotificationService();
  });

  // -------------------------------------------------------------
  // 1. BRANDED TEMPLATE RENDERING TESTS
  // -------------------------------------------------------------
  describe("Centralized Branded Template Rendering", () => {
    it("renders verify email template with brand aesthetic and token link", () => {
      const result = renderVerifyEmailTemplate({
        customerName: "Arundhati Roy",
        verifyUrl: "https://rasasampoorna.com/verify-email?token=sec_verify_xyz",
        expiryHours: 24,
      });

      expect(result.subject).toContain("Verify your email address");
      expect(result.html).toContain("Arundhati Roy");
      expect(result.html).toContain("https://rasasampoorna.com/verify-email?token=sec_verify_xyz");
      expect(result.html).toContain("Confirm Email Address");
      expect(result.html).toContain("24 hours");
      expect(result.html).toContain("#f7f4ee"); // Cream background
      expect(result.html).toContain("Cormorant Garamond"); // Serif styling
      expect(result.text).toContain("Please confirm your email address");
    });

    it("renders password reset template with single-use security note", () => {
      const result = renderPasswordResetTemplate({
        customerName: "Devi Shanker",
        resetUrl: "https://rasasampoorna.com/reset-password?token=sec_reset_abc",
        expiryHours: 1,
      });

      expect(result.subject).toContain("Reset your password");
      expect(result.html).toContain("Password Reset Request");
      expect(result.html).toContain("Devi Shanker");
      expect(result.html).toContain("https://rasasampoorna.com/reset-password?token=sec_reset_abc");
      expect(result.html).toContain("1 hour");
      expect(result.text).toContain("This link expires in 1 hour");
    });

    it("renders welcome message highlighting artisan community and social purpose", () => {
      const result = renderWelcomeTemplate({
        customerName: "Meera Patel",
      });

      expect(result.subject).toBe("Welcome to RASA Sampoorna");
      expect(result.html).toContain("master artisans and neurodiverse creators");
      expect(result.html).toContain("Explore Handcrafted Collection");
    });

    it("renders security alert with activity description, timestamp, and IP", () => {
      const result = renderSecurityAlertTemplate({
        customerName: "Priya Sharma",
        eventDescription: "Password changed successfully",
        timestamp: "22 Oct 2026, 14:30 IST",
        ipAddress: "152.57.112.44",
        userAgent: "Mobile Safari / iOS 19",
      });

      expect(result.subject).toContain("Security Alert");
      expect(result.html).toContain("Password changed successfully");
      expect(result.html).toContain("152.57.112.44");
      expect(result.html).toContain("Mobile Safari");
    });

    it("renders order confirmation with line items, formatted prices, and shipping address", () => {
      const result = renderOrderConfirmationTemplate({
        orderNumber: "RASA-2026-0891",
        customerName: "Ananya Sen",
        items: [
          { name: "Kanjivaram Silk Saree in Crimson Gold", quantity: 1, price: 18500 },
          { name: "Pure Mulberry Tussar Saree", quantity: 2, price: 12000 },
        ],
        totalRupees: 42500,
        shippingAddressText: "12 Lavelle Road, Bengaluru, Karnataka - 560001",
        trackingUrl: "https://rasasampoorna.com/orders/RASA-2026-0891",
      });

      expect(result.subject).toContain("Order Confirmed: #RASA-2026-0891");
      expect(result.html).toContain("Kanjivaram Silk Saree in Crimson Gold");
      expect(result.html).toContain("₹42,500");
      expect(result.html).toContain("12 Lavelle Road, Bengaluru");
      expect(result.html).toContain("https://rasasampoorna.com/orders/RASA-2026-0891");
    });

    it("renders payment confirmed notification with gateway transaction ID", () => {
      const result = renderPaymentConfirmedTemplate({
        orderNumber: "RASA-2026-0891",
        customerName: "Ananya Sen",
        paymentId: "pay_rzp_live_998877",
        amountRupees: 42500,
      });

      expect(result.subject).toContain("Payment Verified: #RASA-2026-0891");
      expect(result.html).toContain("pay_rzp_live_998877");
      expect(result.html).toContain("₹42,500");
    });

    it("renders payment failed notification with actionable retry link", () => {
      const result = renderPaymentFailedTemplate({
        orderNumber: "RASA-2026-0891",
        customerName: "Ananya Sen",
        retryPaymentUrl: "https://rasasampoorna.com/checkout?order=RASA-2026-0891",
        failureReason: "Payment authorization timed out at issuing bank",
      });

      expect(result.subject).toContain("Payment Incomplete for Order #RASA-2026-0891");
      expect(result.html).toContain("Payment authorization timed out");
      expect(result.html).toContain("https://rasasampoorna.com/checkout?order=RASA-2026-0891");
    });

    it("renders shipment dispatch notification with courier and tracking AWB", () => {
      const result = renderShipmentDispatchedTemplate({
        orderNumber: "RASA-2026-0891",
        customerName: "Ananya Sen",
        courier: "BlueDart Express via Shiprocket",
        trackingNumber: "AWB9988776655",
        trackingUrl: "https://rasasampoorna.com/orders/RASA-2026-0891",
      });

      expect(result.subject).toContain("Dispatched: Order #RASA-2026-0891");
      expect(result.html).toContain("BlueDart Express via Shiprocket");
      expect(result.html).toContain("AWB9988776655");
    });

    it("renders delivery confirmation with saree care instructions", () => {
      const result = renderDeliveryConfirmedTemplate({
        orderNumber: "RASA-2026-0891",
        customerName: "Ananya Sen",
      });

      expect(result.subject).toContain("Delivered: Order #RASA-2026-0891");
      expect(result.html).toContain("Pure handloom silks with authentic zari should be dry cleaned only");
    });

    it("renders order cancellation and return/refund templates cleanly", () => {
      const cancelled = renderOrderCancelledTemplate({
        orderNumber: "RASA-2026-0891",
        customerName: "Ananya Sen",
        reason: "Customer request prior to courier dispatch",
        refundNote: "Full refund of ₹42,500 initiated.",
      });
      expect(cancelled.subject).toContain("Order Cancelled: #RASA-2026-0891");

      const ret = renderReturnStatusTemplate({
        orderNumber: "RASA-2026-0891",
        customerName: "Ananya Sen",
        returnStatus: "APPROVED",
        reverseAwb: "RAW887766",
      });
      expect(ret.subject).toContain("Return Update: Order #RASA-2026-0891");
      expect(ret.html).toContain("RAW887766");

      const refund = renderRefundStatusTemplate({
        orderNumber: "RASA-2026-0891",
        customerName: "Ananya Sen",
        refundId: "rfnd_rzp_112233",
        amountRupees: 42500,
      });
      expect(refund.subject).toContain("Refund Credited: #RASA-2026-0891");
      expect(refund.html).toContain("rfnd_rzp_112233");
    });

    it("renders marketing and retention templates with mandatory unsubscribe links", () => {
      const backInStock = renderBackInStockTemplate({
        customerName: "Tara Rao",
        productName: "Chanderi Zari Tissue Saree",
        productUrl: "https://rasasampoorna.com/shop/chanderi-tissue",
        priceRupees: 14500,
      });
      expect(backInStock.html).toContain("Unsubscribe from marketing emails");
      expect(backInStock.html).toContain("Chanderi Zari Tissue Saree");

      const cart = renderAbandonedCartTemplate({
        customerName: "Tara Rao",
        checkoutUrl: "https://rasasampoorna.com/checkout",
        items: [{ name: "Handcrafted Festive Saree Box", quantity: 1, price: 9500 }],
      });
      expect(cart.html).toContain("Complete Your Handcrafted Selection");
      expect(cart.html).toContain("Unsubscribe from marketing emails");

      const priceDrop = renderPriceDropTemplate({
        customerName: "Tara Rao",
        productName: "Tussar Silk Botanical Drape",
        productUrl: "https://rasasampoorna.com/shop/tussar-botanical",
        originalPriceRupees: 16000,
        salePriceRupees: 13500,
      });
      expect(priceDrop.html).toContain("₹13,500");
      expect(priceDrop.html).toContain("Unsubscribe from marketing emails");
    });
  });

  // -------------------------------------------------------------
  // 2. ORDER PROCESSING INDEPENDENCE & FAILING EMAIL PROVIDER
  // -------------------------------------------------------------
  describe("Order Processing Independence from Email Provider Availability", () => {
    it("does not throw or fail the order flow when the email provider fails with 500 error", async () => {
      mocks.resendApiKey = "re_live_test_api_key_123456789";
      service = new NotificationService();

      // Mock prisma notification creation
      mocks.notification.create.mockResolvedValue({ id: "notif_outbox_fail_1" });
      mocks.notification.update.mockResolvedValue({ id: "notif_outbox_fail_1" });

      // Mock Resend returning 500 Internal Server Error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Resend API downstream service unavailable",
      } as any);

      const result = await service.notifyOrderConfirmed({
        recipient: "patron@example.com",
        customerName: "Patron",
        orderNumber: "RASA-FAIL-001",
        items: [{ name: "Handloom Saree", quantity: 1, price: 15000 }],
        totalRupees: 15000,
      });

      // Crucial: The service returns success: false with error details, without throwing an unhandled exception
      expect(result.success).toBe(false);
      expect(result.notificationId).toBe("notif_outbox_fail_1");
      expect(result.error).toContain("Resend API returned HTTP 500");

      // Verify outbox was updated with FAILED status
      expect(mocks.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "notif_outbox_fail_1" },
          data: expect.objectContaining({
            status: NotificationStatus.FAILED,
          }),
        })
      );
    });

    it("handles network timeout or exception gracefully without breaking caller", async () => {
      mocks.resendApiKey = "re_live_test_api_key_123456789";
      service = new NotificationService();

      mocks.notification.create.mockResolvedValue({ id: "notif_outbox_fail_2" });
      mocks.notification.update.mockResolvedValue({ id: "notif_outbox_fail_2" });

      // Mock fetch throwing network exception
      global.fetch = vi.fn().mockRejectedValue(new Error("ECONNRESET"));

      const result = await service.notifyPaymentConfirmed({
        recipient: "patron@example.com",
        customerName: "Patron",
        orderNumber: "RASA-FAIL-002",
        paymentId: "pay_xyz",
        amountRupees: 15000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("ECONNRESET");
      expect(mocks.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: NotificationStatus.FAILED }),
        })
      );
    });
  });

  // -------------------------------------------------------------
  // 3. IDEMPOTENCY & DUPLICATE EVENT PREVENTION
  // -------------------------------------------------------------
  describe("Idempotency and Duplicate Event Prevention", () => {
    it("skips dispatch when a notification with the same idempotency key was already SENT", async () => {
      mocks.notification.findFirst.mockResolvedValue({
        id: "existing_notif_99",
        status: NotificationStatus.SENT,
      });

      const result = await service.notifyOrderConfirmed({
        recipient: "patron@example.com",
        customerName: "Patron",
        orderNumber: "RASA-2026-DUP",
        items: [{ name: "Saree", quantity: 1, price: 10000 }],
        totalRupees: 10000,
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe("ALREADY_SENT");
      expect(result.notificationId).toBe("existing_notif_99");

      // Should NOT attempt creating a new notification or sending an email
      expect(mocks.notification.create).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------
  // 4. CONSENT & UNSUBSCRIBE BEHAVIOR
  // -------------------------------------------------------------
  describe("Patron Consent, Preferences & Unsubscribe Enforcement", () => {
    it("enforces that essential transactional emails are categorized as TRANSACTIONAL", () => {
      expect(getNotificationCategory("ORDER_CONFIRMATION")).toBe("TRANSACTIONAL");
      expect(getNotificationCategory("ORDER_PAYMENT_CONFIRMED")).toBe("TRANSACTIONAL");
      expect(getNotificationCategory("ORDER_DISPATCHED")).toBe("TRANSACTIONAL");
      expect(getNotificationCategory("ACCOUNT_VERIFY_EMAIL")).toBe("TRANSACTIONAL");
      expect(getNotificationCategory("ACCOUNT_PASSWORD_RESET")).toBe("TRANSACTIONAL");
      expect(getNotificationCategory("ORDER_CANCELLED")).toBe("TRANSACTIONAL");
      expect(getNotificationCategory("ORDER_REFUND_STATUS")).toBe("TRANSACTIONAL");
    });

    it("categorizes retention and promotional emails as MARKETING", () => {
      expect(getNotificationCategory("RETENTION_BACK_IN_STOCK")).toBe("MARKETING");
      expect(getNotificationCategory("RETENTION_ABANDONED_CART")).toBe("MARKETING");
      expect(getNotificationCategory("RETENTION_PRICE_DROP")).toBe("MARKETING");
      expect(getNotificationCategory("RETENTION_WISHLIST_ALERT")).toBe("MARKETING");
    });

    it("blocks marketing email when patron has not opted in", async () => {
      // Patron preferences has backInStock: false
      mocks.user.findUnique.mockResolvedValue({
        id: "usr_1",
        notificationPreferences: JSON.stringify({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          backInStock: false,
        }),
      });

      const result = await service.notifyBackInStock({
        recipient: "optout@example.com",
        productName: "Banarasi Katan Silk",
        productUrl: "https://rasasampoorna.com/shop/banarasi",
        priceRupees: 22000,
        userId: "usr_1",
      });

      expect(result.skipped).toBe(true);
      expect(result.reason).toContain("not opted into back-in-stock alerts");
      expect(mocks.notification.create).not.toHaveBeenCalled();
    });

    it("allows marketing email when patron has explicitly opted in", async () => {
      mocks.user.findUnique.mockResolvedValue({
        id: "usr_2",
        notificationPreferences: JSON.stringify({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          backInStock: true,
        }),
      });

      mocks.notification.findFirst.mockResolvedValue(null); // No recent marketing sent
      mocks.notification.create.mockResolvedValue({ id: "notif_optin_1" });
      mocks.notification.update.mockResolvedValue({ id: "notif_optin_1" });

      const result = await service.notifyBackInStock({
        recipient: "optin@example.com",
        productName: "Banarasi Katan Silk",
        productUrl: "https://rasasampoorna.com/shop/banarasi",
        priceRupees: 22000,
        userId: "usr_2",
      });

      expect(result.success).toBe(true);
      expect(result.skipped).toBeFalsy();
    });

    it("unsubscribes customer from all marketing communications when requested", async () => {
      mocks.user.findUnique.mockResolvedValue({
        id: "usr_3",
        notificationPreferences: JSON.stringify({
          orderUpdates: true,
          securityAlerts: true,
          marketingOffers: true,
          backInStock: true,
          abandonedCart: true,
        }),
      });
      mocks.user.update.mockResolvedValue({});

      const response = await service.unsubscribe({
        email: "subscriber@example.com",
        category: "ALL_MARKETING",
      });

      expect(response.success).toBe(true);
      expect(mocks.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            notificationPreferences: JSON.stringify({
              orderUpdates: true,
              securityAlerts: true,
              marketingOffers: false,
              backInStock: false,
              abandonedCart: false,
            }),
          },
        })
      );
    });

    it("prevents customers from disabling mandatory transactional notifications", async () => {
      mocks.user.findUnique.mockResolvedValue({
        id: "usr_4",
        notificationPreferences: JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES),
      });
      mocks.user.update.mockResolvedValue({});

      // Attempt to disable orderUpdates
      const updated = await service.updatePreferences(
        { userId: "usr_4" },
        { orderUpdates: false as any, securityAlerts: false as any, marketingOffers: true }
      );

      // System must forcefully preserve orderUpdates and securityAlerts
      expect(updated.orderUpdates).toBe(true);
      expect(updated.securityAlerts).toBe(true);
      expect(updated.marketingOffers).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 5. RETRY BEHAVIOR
  // -------------------------------------------------------------
  describe("Safe Outbox Retry Behavior", () => {
    it("retries failed notifications and increments attempt counter", async () => {
      const failedEnvelope: NotificationEnvelope = {
        eventType: "ORDER_CONFIRMATION",
        subject: "Order Confirmed: #RASA-RETRY",
        html: "<p>Test</p>",
        attempts: 1,
      };

      mocks.notification.findMany.mockResolvedValue([
        {
          id: "notif_retry_1",
          recipient: "patron@example.com",
          subject: "Order Confirmed: #RASA-RETRY",
          body: JSON.stringify(failedEnvelope),
          status: NotificationStatus.FAILED,
        },
      ]);
      mocks.notification.update.mockResolvedValue({});

      const retryResult = await service.retryFailedNotifications(10);

      expect(retryResult.processed).toBe(1);
      expect(retryResult.succeeded).toBe(1);
      expect(retryResult.failed).toBe(0);
    });

    it("skips retrying notifications that have already reached maximum 3 attempts", async () => {
      const exhaustedEnvelope: NotificationEnvelope = {
        eventType: "ORDER_CONFIRMATION",
        subject: "Order Confirmed",
        html: "<p>Exhausted</p>",
        attempts: 3,
      };

      mocks.notification.findMany.mockResolvedValue([
        {
          id: "notif_exhausted_1",
          recipient: "patron@example.com",
          body: JSON.stringify(exhaustedEnvelope),
          status: NotificationStatus.FAILED,
        },
      ]);

      const retryResult = await service.retryFailedNotifications(10);

      expect(retryResult.processed).toBe(1);
      expect(retryResult.succeeded).toBe(0);
      expect(retryResult.failed).toBe(1);
    });
  });

  // -------------------------------------------------------------
  // 6. PRIVACY & SENSITIVE TOKEN SANITIZATION
  // -------------------------------------------------------------
  describe("Privacy & Data Protection Standards", () => {
    it("sanitizes passwords, reset tokens, verification tokens, and secrets from outbox metadata", async () => {
      mocks.notification.create.mockResolvedValue({ id: "notif_clean_1" });
      mocks.notification.update.mockResolvedValue({ id: "notif_clean_1" });

      await service.sendNotification({
        eventType: "ACCOUNT_SECURITY_ALERT",
        recipient: "patron@example.com",
        subject: "Security Alert",
        html: "<p>Alert</p>",
        metadata: {
          clientIp: "127.0.0.1",
          secretKey: "super_secret_key_123",
          token: "plaintext_session_token_xyz",
          passwordHash: "bcrypt_hash_abc",
          safeData: "Order metadata",
        },
      });

      expect(mocks.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            body: expect.stringMatching(/\[REDACTED\]/),
          }),
        })
      );

      const savedBody = JSON.parse(mocks.notification.create.mock.calls[0][0].data.body);
      expect(savedBody.metadata.secretKey).toBe("[REDACTED]");
      expect(savedBody.metadata.token).toBe("[REDACTED]");
      expect(savedBody.metadata.passwordHash).toBe("[REDACTED]");
      expect(savedBody.metadata.safeData).toBe("Order metadata");
    });
  });

  // -------------------------------------------------------------
  // 7. PROVIDER CONFIGURATION & STATUS VERIFICATION
  // -------------------------------------------------------------
  describe("Provider Configuration & Verification", () => {
    it("correctly flags unconfigured mode when RESEND_API_KEY is missing or placeholder", () => {
      mocks.resendApiKey = undefined;
      const statusUnconfigured = service.getProviderStatus();
      expect(statusUnconfigured.isConfigured).toBe(false);
      expect(statusUnconfigured.mode).toBe("sandbox_mock");
      expect(statusUnconfigured.isLive).toBe(false);

      mocks.resendApiKey = "re_placeholder";
      const statusPlaceholder = service.getProviderStatus();
      expect(statusPlaceholder.isConfigured).toBe(false);
      expect(statusPlaceholder.mode).toBe("sandbox_mock");
    });

    it("recognizes live configured mode when valid Resend key is set", () => {
      mocks.resendApiKey = "re_actual_live_secret_key_999";
      const statusConfigured = service.getProviderStatus();
      expect(statusConfigured.isConfigured).toBe(true);
      expect(statusConfigured.mode).toBe("production");
    });
  });
});
