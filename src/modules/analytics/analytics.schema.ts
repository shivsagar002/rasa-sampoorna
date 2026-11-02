import { z } from "zod";

export const analyticsQuerySchema = z.object({
  preset: z
    .enum([
      "today",
      "yesterday",
      "last_7_days",
      "last_30_days",
      "this_month",
      "last_month",
      "this_year",
      "custom",
    ])
    .default("last_30_days"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  compare: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val !== "false"),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;

export const exportQuerySchema = z.object({
  type: z.enum(["orders", "financial", "sales", "inventory", "coupons", "returns"]),
  preset: z
    .enum([
      "today",
      "yesterday",
      "last_7_days",
      "last_30_days",
      "this_month",
      "last_month",
      "this_year",
      "custom",
    ])
    .default("last_30_days"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;

/**
 * Metric Definitions Documentation
 */
export const METRIC_DEFINITIONS = {
  grossSales:
    "Total value of merchandise ordered before deducting discounts, returns, or refunds. Only includes orders with completed (CAPTURED) payment.",
  discounts:
    "Total monetary value of promotional coupons, tier discounts, and order-level reductions applied to paid orders.",
  refunds:
    "Total amount disbursed back to customers for processed returns or approved order cancellations.",
  shippingFees:
    "Total shipping charges billed to customers across completed orders.",
  taxes:
    "Total Goods & Services Tax (GST 5% on silk textiles) collected on completed orders.",
  netSales:
    "Gross Sales minus Discounts minus Processed Refunds (Gross Sales - Discounts - Refunds). Excludes shipping and taxes.",
  totalRevenue:
    "Total cash collected and retained: Net Sales + Shipping Fees + Taxes.",
  paidOrderCount:
    "Total count of distinct purchase orders where payment status is CAPTURED.",
  aov:
    "Average Order Value: Net Sales divided by Paid Order Count. Measures average transaction size.",
  unitsSold:
    "Total quantity of individual sarees and artisan units purchased in completed orders.",
  cancellations:
    "Count and total monetary value of orders cancelled before shipment.",
  paymentSuccessRate:
    "Percentage of payment attempts successfully captured by the payment gateway (Captured / Total Attempts * 100).",
  returnRate:
    "Percentage of delivered orders or items for which a return request was filed (Return Requests / Delivered Orders * 100).",
  fulfillmentRate:
    "Percentage of paid orders successfully handed over to courier or delivered (Shipped + Delivered / Total Paid * 100).",
};
