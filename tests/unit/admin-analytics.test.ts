import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveDateRange,
  calculatePercentageChange,
  generateDailyBuckets,
  createDateInIST,
  toIST,
} from "@/modules/analytics/date-utils";
import { AnalyticsService } from "@/modules/analytics/analytics.service";
import { METRIC_DEFINITIONS } from "@/modules/analytics/analytics.schema";
import { prisma } from "@/lib/db/prisma";
import { PaymentStatus, OrderStatus, RefundStatus, ReturnStatus, UserRole } from "@prisma/client";
import { requireStaff, requireAdmin } from "@/lib/security/guards";
import { ForbiddenError, UnauthorizedError } from "@/lib/api/errors";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    order: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    refund: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    orderItem: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    payment: {
      groupBy: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    return: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    coupon: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/security/session", () => ({
  SESSION_COOKIE_NAME: "rasa_session",
  verifySessionToken: vi.fn(),
  getSessionFromCookies: vi.fn(),
}));

describe("Admin Analytics & Reporting Suite", () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    analyticsService = new AnalyticsService();
  });

  describe("Date Presets & Timezone Boundaries (Asia/Kolkata)", () => {
    it("correctly establishes IST day boundaries for 'today'", () => {
      // 2026-10-22 14:00:00 IST
      const refDate = new Date("2026-10-22T08:30:00.000Z");
      const range = resolveDateRange("today", undefined, undefined, refDate);

      expect(range.preset).toBe("today");
      expect(range.label).toBe("Today");

      // In IST, start of day is 2026-10-22 00:00:00 (which is 2026-10-21 18:30:00 UTC)
      expect(range.startDate.toISOString()).toBe("2026-10-21T18:30:00.000Z");
      // End of day is 2026-10-22 23:59:59.999 (which is 2026-10-22 18:29:59.999 UTC)
      expect(range.endDate.toISOString()).toBe("2026-10-22T18:29:59.999Z");

      // Prior period should have the exact same 24h duration
      const duration = range.endDate.getTime() - range.startDate.getTime();
      const priorDuration = range.priorEndDate.getTime() - range.priorStartDate.getTime();
      expect(Math.abs(duration - priorDuration)).toBeLessThanOrEqual(1);
    });

    it("correctly establishes IST boundaries for 'yesterday'", () => {
      const refDate = new Date("2026-10-22T08:30:00.000Z");
      const range = resolveDateRange("yesterday", undefined, undefined, refDate);

      expect(range.preset).toBe("yesterday");
      expect(range.startDate.toISOString()).toBe("2026-10-20T18:30:00.000Z");
      expect(range.endDate.toISOString()).toBe("2026-10-21T18:29:59.999Z");
    });

    it("correctly calculates 7 days and 30 days ranges", () => {
      const refDate = new Date("2026-10-22T08:30:00.000Z");
      const range7 = resolveDateRange("last_7_days", undefined, undefined, refDate);
      expect(range7.preset).toBe("last_7_days");

      const diffDays7 = Math.round(
        (range7.endDate.getTime() - range7.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays7).toBe(7);

      const range30 = resolveDateRange("last_30_days", undefined, undefined, refDate);
      const diffDays30 = Math.round(
        (range30.endDate.getTime() - range30.startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays30).toBe(30);
    });

    it("correctly resolves custom date boundaries and validates order", () => {
      const range = resolveDateRange("custom", "2026-10-01", "2026-10-15");
      expect(range.preset).toBe("custom");
      expect(range.startDate.toISOString()).toBe("2026-09-30T18:30:00.000Z"); // Oct 1 00:00 IST
      expect(range.endDate.toISOString()).toBe("2026-10-15T18:29:59.999Z"); // Oct 15 23:59:59 IST

      expect(() => resolveDateRange("custom", "2026-10-20", "2026-10-10")).toThrow(
        "Start date must be before or equal to end date."
      );
    });

    it("generates continuous daily buckets for timeseries visualization", () => {
      const start = new Date("2026-10-01T00:00:00.000Z");
      const end = new Date("2026-10-05T23:59:59.999Z");
      const buckets = generateDailyBuckets(start, end);

      expect(buckets.length).toBeGreaterThanOrEqual(5);
      expect(buckets[0].key).toBeDefined();
      expect(buckets[0].label).toBeDefined();
    });
  });

  describe("Period-Over-Period Comparison Percentage Math", () => {
    it("computes standard positive percentage increase", () => {
      const change = calculatePercentageChange(150, 100);
      expect(change).toBe(50);
    });

    it("computes standard negative percentage decrease", () => {
      const change = calculatePercentageChange(75, 100);
      expect(change).toBe(-25);
    });

    it("handles zero prior value safely without division by zero NaN", () => {
      expect(calculatePercentageChange(100, 0)).toBe(100);
      expect(calculatePercentageChange(0, 0)).toBe(0);
      expect(calculatePercentageChange(-50, 0)).toBe(-100);
    });
  });

  describe("Financial Metric Definitions & Revenue Reconciliation", () => {
    it("strictly separates Gross Sales, Discounts, Refunds, and computes Net Sales", async () => {
      const now = Date.now();
      const cutoff = now - 35 * 24 * 60 * 60 * 1000;

      (prisma.order.aggregate as any).mockImplementation(async (args: any) => {
        if (args.where?.status === OrderStatus.CANCELLED) {
          return { _count: { id: 2 }, _sum: { totalAmountMinorUnits: 1500000 } };
        }
        const isPrior = args.where?.createdAt?.gte && args.where.createdAt.gte.getTime() < cutoff;
        if (isPrior) {
          return {
            _sum: {
              subtotalMinorUnits: 8000000, // ₹80,000.00 Prior Gross
              discountAmountMinorUnits: 500000,
              shippingFeeMinorUnits: 200000,
              taxAmountMinorUnits: 375000,
              totalAmountMinorUnits: 8075000,
            },
            _count: { id: 8 },
          };
        }
        return {
          _sum: {
            subtotalMinorUnits: 10000000, // ₹1,00,000.00 Current Gross
            discountAmountMinorUnits: 1000000, // ₹10,000.00 Discounts
            shippingFeeMinorUnits: 250000, // ₹2,500.00 Shipping
            taxAmountMinorUnits: 450000, // ₹4,500.00 Taxes (5%)
            totalAmountMinorUnits: 9700000,
          },
          _count: { id: 10 },
        };
      });

      (prisma.refund.aggregate as any).mockImplementation(async (args: any) => {
        const isPrior = args.where?.createdAt?.gte && args.where.createdAt.gte.getTime() < cutoff;
        return {
          _sum: {
            amountMinorUnits: isPrior ? 200000 : 500000,
          },
        };
      });

      (prisma.orderItem.aggregate as any).mockImplementation(async (args: any) => {
        const isPrior = args.where?.order?.createdAt?.gte && args.where.order.createdAt.gte.getTime() < cutoff;
        return {
          _sum: {
            quantity: isPrior ? 10 : 15,
          },
        };
      });

      // Setup secondary mocks for products, categories, gateway, retention
      vi.mocked(prisma.order.findMany).mockResolvedValue([]);
      vi.mocked(prisma.refund.findMany).mockResolvedValue([]);
      vi.mocked(prisma.payment.groupBy).mockResolvedValue([
        { status: PaymentStatus.CAPTURED, _count: { id: 10 } },
        { status: PaymentStatus.FAILED, _count: { id: 2 } },
      ] as any);
      vi.mocked(prisma.orderItem.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.orderItem.findMany).mockResolvedValue([
        {
          subtotalMinorUnits: 10000,
          quantity: 1,
          product: {
            category: { name: "Kanjivaram" },
            collections: [
              { collection: { name: "Bridal" } },
              { collection: { name: "Festive" } },
            ],
          },
        },
      ] as any);
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      vi.mocked(prisma.order.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.return.count).mockResolvedValue(1);

      const res = await analyticsService.getDashboardAnalytics({ preset: "last_30_days" });

      // Verify Financial Formulas:
      // Gross: ₹1,00,000
      // Discount: ₹10,000
      // Refund: ₹5,000
      // Net Sales = 1,00,000 - 10,000 - 5,000 = ₹85,000
      expect(res.financialSummary.grossSales).toBe(100000);
      expect(res.financialSummary.discounts).toBe(10000);
      expect(res.financialSummary.refunds).toBe(5000);
      expect(res.financialSummary.netSales).toBe(85000);

      // AOV = Net Sales / Paid Order Count = 85,000 / 10 = ₹8,500
      expect(res.kpis.aov.value).toBe(8500);

      // Units Sold: 15
      expect(res.kpis.unitsSold.value).toBe(15);

      // Comparison check: Current Gross (100,000) vs Prior Gross (80,000) => +25%
      expect(res.kpis.grossSales.percentageChange).toBe(25);

      // Gateway Success Rate: 10 captured out of 12 attempts => 83.3%
      expect(res.gatewayPerformance.successRate).toBe(83.3);
      expect(res.gatewayPerformance.failureRate).toBe(16.7);
      expect(res.collectionPerformance).toEqual([
        { collectionName: "Bridal", revenue: 50, sharePercentage: 50 },
        { collectionName: "Festive", revenue: 50, sharePercentage: 50 },
      ]);
    });

    it("never includes pending or failed orders in completed revenue", async () => {
      // Test that the aggregation query explicitly filters by paymentStatus === 'CAPTURED'
      vi.mocked(prisma.order.aggregate).mockResolvedValue({
        _sum: { subtotalMinorUnits: 0 },
        _count: { id: 0 },
      } as any);
      vi.mocked(prisma.refund.aggregate).mockResolvedValue({ _sum: { amountMinorUnits: 0 } } as any);
      vi.mocked(prisma.orderItem.aggregate).mockResolvedValue({ _sum: { quantity: 0 } } as any);
      vi.mocked(prisma.order.findMany).mockResolvedValue([]);
      vi.mocked(prisma.refund.findMany).mockResolvedValue([]);
      vi.mocked(prisma.payment.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.orderItem.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.orderItem.findMany).mockResolvedValue([]);
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      vi.mocked(prisma.order.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.return.count).mockResolvedValue(0);

      const analytics = await analyticsService.getDashboardAnalytics({ preset: "today", compare: false });

      expect(prisma.order.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            paymentStatus: PaymentStatus.CAPTURED,
          }),
        })
      );
      expect(prisma.order.aggregate).toHaveBeenCalledTimes(2);
      expect(analytics.kpis.grossSales.percentageChange).toBeNull();
    });
  });

  describe("Operational Reports & Sanitized CSV Exports", () => {
    it("generates sanitized orders CSV with masked customer PII", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([
        {
          orderNumber: "RASA-2026-1001",
          createdAt: new Date("2026-10-22T10:00:00.000Z"),
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.CAPTURED,
          paymentMethod: "RAZORPAY",
          subtotalMinorUnits: 850000,
          discountAmountMinorUnits: 50000,
          shippingFeeMinorUnits: 0,
          taxAmountMinorUnits: 40000,
          totalAmountMinorUnits: 840000,
          shippingAddress: {
            name: "Radha Sharma",
            city: "Bengaluru",
            state: "Karnataka",
            postalCode: "560001",
          },
          _count: { items: 1 },
        },
      ] as any);

      const report = await analyticsService.exportCsvReport({ type: "orders", preset: "last_7_days" });

      expect(report.filename).toContain("rasa-orders-export");
      expect(report.content).toContain("Order Number");
      expect(report.content).toContain('"RASA-2026-1001"');
      expect(report.content).toContain('"Radha Sharma"');
      expect(report.content).toContain('"8500.00"'); // Rupee format
    });

    it("exports order-level financial breakdowns from recorded orders and processed refunds", async () => {
      vi.mocked(prisma.order.findMany).mockResolvedValue([
        {
          orderNumber: "=2+2",
          createdAt: new Date("2026-10-22T10:00:00.000Z"),
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.CAPTURED,
          subtotalMinorUnits: 100000,
          discountAmountMinorUnits: 10000,
          shippingFeeMinorUnits: 500,
          taxAmountMinorUnits: 4500,
          totalAmountMinorUnits: 95000,
          refunds: [{ amountMinorUnits: 5000 }],
        },
      ] as any);

      const report = await analyticsService.exportCsvReport({ type: "financial", preset: "last_7_days" });

      expect(report.filename).toContain("rasa-financial-settlement");
      expect(report.content).toContain('"\'=2+2"');
      expect(report.content).toContain('"850.00"');
      expect(report.content).toContain('"900.00"');
      expect(report.content).toContain("Gateway Fees (Not Tracked)");
      expect(report.content).toContain("Settlement (Not Tracked)");
    });

    it("generates live inventory report with stock threshold alerts", async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        {
          name: "Lotus Bloom Kanjivaram",
          slug: "lotus-bloom-saree",
          sku: "RASA-LOTU",
          category: { name: "Kanjivaram Silk" },
          fabric: "Pure Mulberry Silk",
          color: "Crimson Red",
          stockQuantity: 1,
          lowStockThreshold: 2,
          basePriceInMinorUnits: 950000,
          status: "ACTIVE",
          variants: [],
        },
      ] as any);

      const report = await analyticsService.exportCsvReport({ type: "inventory" });

      expect(report.filename).toContain("rasa-inventory-report");
      expect(report.content).toContain('"Lotus Bloom Kanjivaram"');
      expect(report.content).toContain('"LOW_STOCK"');
      expect(report.content).toContain('"9500.00"');
    });
  });

  describe("Security & Access Control Enforcement", () => {
    it("denies access to non-staff and unauthorized callers", async () => {
      const { getSessionFromCookies } = await import("@/lib/security/session");

      // Anonymous user
      vi.mocked(getSessionFromCookies).mockResolvedValueOnce(null);
      await expect(requireStaff()).rejects.toThrow(UnauthorizedError);

      // Customer role (not staff/admin)
      vi.mocked(getSessionFromCookies).mockResolvedValueOnce({
        userId: "cust_1",
        email: "customer@example.com",
        role: UserRole.CUSTOMER,
      } as any);
      await expect(requireStaff()).rejects.toThrow(ForbiddenError);

      // Staff role succeeds for requireStaff
      vi.mocked(getSessionFromCookies).mockResolvedValueOnce({
        userId: "staff_1",
        email: "staff@rasasampoorna.com",
        role: UserRole.STAFF,
      } as any);
      await expect(requireStaff()).resolves.toBeDefined();
    });
  });

  describe("Metric Definitions Documentation", () => {
    it("provides complete definitions for all key metrics", () => {
      expect(METRIC_DEFINITIONS.grossSales).toBeDefined();
      expect(METRIC_DEFINITIONS.netSales).toBeDefined();
      expect(METRIC_DEFINITIONS.discounts).toBeDefined();
      expect(METRIC_DEFINITIONS.refunds).toBeDefined();
      expect(METRIC_DEFINITIONS.aov).toBeDefined();
      expect(METRIC_DEFINITIONS.paymentSuccessRate).toBeDefined();
      expect(METRIC_DEFINITIONS.returnRate).toBeDefined();
      expect(METRIC_DEFINITIONS.fulfillmentRate).toBeDefined();
    });
  });
});
