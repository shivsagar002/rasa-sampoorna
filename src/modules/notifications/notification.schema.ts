import { z } from "zod";

// -------------------------------------------------------------
// EVENT TYPES & CATEGORIES
// -------------------------------------------------------------

export const NOTIFICATION_EVENT_TYPES = [
  // Account Lifecycle
  "ACCOUNT_VERIFY_EMAIL",
  "ACCOUNT_PASSWORD_RESET",
  "ACCOUNT_WELCOME",
  "ACCOUNT_SECURITY_ALERT",

  // Order & Payment Lifecycle
  "ORDER_CONFIRMATION",
  "ORDER_PAYMENT_CONFIRMED",
  "ORDER_PAYMENT_FAILED",
  "ORDER_DISPATCHED",
  "ORDER_DELIVERED",
  "ORDER_CANCELLED",
  "ORDER_RETURN_STATUS",
  "ORDER_REFUND_STATUS",

  // Product & Retention (Opt-in Marketing)
  "RETENTION_BACK_IN_STOCK",
  "RETENTION_WISHLIST_ALERT",
  "RETENTION_PRICE_DROP",
  "RETENTION_ABANDONED_CART",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export type NotificationCategory = "TRANSACTIONAL" | "MARKETING";

/**
 * Categorize whether an event is essential transactional or optional marketing
 */
export function getNotificationCategory(eventType: NotificationEventType): NotificationCategory {
  if (eventType.startsWith("RETENTION_")) {
    return "MARKETING";
  }
  return "TRANSACTIONAL";
}

// -------------------------------------------------------------
// PREFERENCES SCHEMA
// -------------------------------------------------------------

export const notificationPreferencesSchema = z.object({
  orderUpdates: z.boolean().default(true),
  securityAlerts: z.boolean().default(true),
  marketingOffers: z.boolean().default(false),
  backInStock: z.boolean().default(false),
  abandonedCart: z.boolean().default(false),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  orderUpdates: true,
  securityAlerts: true,
  marketingOffers: false,
  backInStock: false,
  abandonedCart: false,
};

// -------------------------------------------------------------
// DISPATCH & JOB INPUT SCHEMAS
// -------------------------------------------------------------

export const dispatchNotificationInputSchema = z.object({
  eventType: z.enum(NOTIFICATION_EVENT_TYPES),
  recipient: z.string().email("Valid recipient email is required"),
  userId: z.string().optional(),
  customerName: z.string().optional().default("Patron"),
  subject: z.string().min(2, "Subject is required"),
  html: z.string().min(10, "Email HTML body required"),
  text: z.string().optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  forceTransactional: z.boolean().optional().default(false),
});

export type DispatchNotificationInput = z.input<typeof dispatchNotificationInputSchema>;

export const unsubscribeInputSchema = z.object({
  email: z.string().email("Valid email required"),
  token: z.string().optional(),
  category: z.enum(["ALL_MARKETING", "BACK_IN_STOCK", "ABANDONED_CART", "SPECIAL_OFFERS"]).optional().default("ALL_MARKETING"),
});

export type UnsubscribeInput = z.infer<typeof unsubscribeInputSchema>;
