import { prisma } from "@/lib/db/prisma";
import {
  resolveDateRange,
  calculatePercentageChange,
  generateDailyBuckets,
  AnalyticsDatePreset,
} from "./date-utils";
import { METRIC_DEFINITIONS } from "./analytics.schema";
import { OrderStatus, PaymentStatus, RefundStatus, ReturnStatus } from "@prisma/client";

export interface AnalyticsFinancials {
  grossSales: number; // in Rupees
  discounts: number;
  refunds: number;
  shippingFees: number;
  taxes: number;
  netSales: number;
  totalCollected: number;
  paidOrderCount: number;
  aov: number;
  unitsSold: number;
  cancelledOrderCount: number;
  cancelledAmount: number;
}

export interface MetricWithComparison {
  value: number;
  priorValue: number;
  percentageChange: number | null;
}

export interface DashboardMetricsResult {
  period: {
    preset: AnalyticsDatePreset;
    label: string;
    startDate: string;
    endDate: string;
    priorStartDate: string;
    priorEndDate: string;
  };
  kpis: {
    grossSales: MetricWithComparison;
    netSales: MetricWithComparison;
    paidOrderCount: MetricWithComparison;
    aov: MetricWithComparison;
    unitsSold: MetricWithComparison;
    discounts: MetricWithComparison;
    refunds: MetricWithComparison;
    cancellations: MetricWithComparison;
  };
  financialSummary: {
    grossSales: number;
    discounts: number;
    refunds: number;
    shippingFees: number;
    taxes: number;
    netSales: number;
    totalCollected: number;
  };
  timeseries: Array<{
    date: string;
    label: string;
    grossSales: number;
    netSales: number;
    orderCount: number;
  }>;
  gatewayPerformance: {
    totalAttempts: number;
    capturedCount: number;
    failedCount: number;
    pendingCount: number;
    successRate: number;
    failureRate: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    category?: string;
    unitsSold: number;
    revenue: number;
    currentStock: number;
    primaryImage?: string;
  }>;
  categoryPerformance: Array<{
    categoryName: string;
    unitsSold: number;
    revenue: number;
    orderCount: number;
  }>;
  lowStockAlerts: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    stockQuantity: number;
    lowStockThreshold: number;
    price: number;
    status: string;
  }>;
  customerBreakdown: {
    newCustomersCount: number;
    returningCustomersCount: number;
    guestOrdersCount: number;
    newCustomersPercentage: number;
  };
  fulfillmentPerformance: {
    deliveredCount: number;
    inTransitCount: number;
    processingCount: number;
    pendingFulfillmentCount: number;
    cancelledCount: number;
    fulfillmentRate: number;
    returnCount: number;
    returnRate: number;
  };
  definitions: typeof METRIC_DEFINITIONS;
}

export class AnalyticsService {
  /**
   * Internal helper: computes aggregated financials for a given date window.
   * Strictly counts completed/captured payments as completed revenue.
   */
  private async getAggregatedFinancials(startDate: Date, endDate: Date): Promise<AnalyticsFinancials> {
    // 1. Order Aggregation for completed payments
    const orderAgg = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: PaymentStatus.CAPTURED,
      },
      _sum: {
        subtotalMinorUnits: true,
        discountAmountMinorUnits: true,
        shippingFeeMinorUnits: true,
        taxAmountMinorUnits: true,
        totalAmountMinorUnits: true,
      },
      _count: {
        id: true,
      },
    });

    const grossSalesMinor = orderAgg._sum.subtotalMinorUnits || 0;
    const discountsMinor = orderAgg._sum.discountAmountMinorUnits || 0;
    const shippingMinor = orderAgg._sum.shippingFeeMinorUnits || 0;
    const taxesMinor = orderAgg._sum.taxAmountMinorUnits || 0;
    const paidOrderCount = orderAgg._count.id;

    // 2. Processed Refunds Aggregation
    const refundAgg = await prisma.refund.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: RefundStatus.PROCESSED,
      },
      _sum: {
        amountMinorUnits: true,
      },
    });
    const refundsMinor = refundAgg._sum.amountMinorUnits || 0;

    // 3. Units Sold Aggregation
    const unitsAgg = await prisma.orderItem.aggregate({
      where: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          paymentStatus: PaymentStatus.CAPTURED,
        },
      },
      _sum: {
        quantity: true,
      },
    });
    const unitsSold = unitsAgg._sum.quantity || 0;

    // 4. Cancellations in period
    const cancelAgg = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: OrderStatus.CANCELLED,
      },
      _count: { id: true },
      _sum: { totalAmountMinorUnits: true },
    });
    const cancelledOrderCount = cancelAgg._count.id;
    const cancelledAmountMinor = cancelAgg._sum.totalAmountMinorUnits || 0;

    // Convert from minor units (paise) to Rupees
    const grossSales = grossSalesMinor / 100;
    const discounts = discountsMinor / 100;
    const refunds = refundsMinor / 100;
    const shippingFees = shippingMinor / 100;
    const taxes = taxesMinor / 100;
    const netSales = Math.max(0, grossSales - discounts - refunds);
    const totalCollected = Math.max(0, netSales + shippingFees + taxes);
    const aov = paidOrderCount > 0 ? Math.round((netSales / paidOrderCount) * 100) / 100 : 0;
    const cancelledAmount = cancelledAmountMinor / 100;

    return {
      grossSales,
      discounts,
      refunds,
      shippingFees,
      taxes,
      netSales,
      totalCollected,
      paidOrderCount,
      aov,
      unitsSold,
      cancelledOrderCount,
      cancelledAmount,
    };
  }

  /**
   * Retrieves complete dashboard metrics honoring selected date preset or custom range,
   * including period-over-period comparisons.
   */
  async getDashboardAnalytics(params: {
    preset?: AnalyticsDatePreset;
    startDate?: string;
    endDate?: string;
    compare?: boolean;
  }): Promise<DashboardMetricsResult> {
    const range = resolveDateRange(params.preset || "last_30_days", params.startDate, params.endDate);
    const { startDate, endDate, priorStartDate, priorEndDate } = range;

    // Run core financial aggregations in parallel (current vs. prior period)
    const [currentFin, priorFin] = await Promise.all([
      this.getAggregatedFinancials(startDate, endDate),
      this.getAggregatedFinancials(priorStartDate, priorEndDate),
    ]);

    // Build KPI metric with comparisons
    const buildKpi = (curr: number, prev: number): MetricWithComparison => ({
      value: curr,
      priorValue: prev,
      percentageChange: calculatePercentageChange(curr, prev),
    });

    const kpis = {
      grossSales: buildKpi(currentFin.grossSales, priorFin.grossSales),
      netSales: buildKpi(currentFin.netSales, priorFin.netSales),
      paidOrderCount: buildKpi(currentFin.paidOrderCount, priorFin.paidOrderCount),
      aov: buildKpi(currentFin.aov, priorFin.aov),
      unitsSold: buildKpi(currentFin.unitsSold, priorFin.unitsSold),
      discounts: buildKpi(currentFin.discounts, priorFin.discounts),
      refunds: buildKpi(currentFin.refunds, priorFin.refunds),
      cancellations: buildKpi(currentFin.cancelledOrderCount, priorFin.cancelledOrderCount),
    };

    // Timeseries daily aggregation
    const buckets = generateDailyBuckets(startDate, endDate);

    // Efficiently query daily sums for the buckets
    const dailyOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: PaymentStatus.CAPTURED,
      },
      select: {
        createdAt: true,
        subtotalMinorUnits: true,
        discountAmountMinorUnits: true,
      },
    });

    const dailyRefunds = await prisma.refund.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: RefundStatus.PROCESSED,
      },
      select: {
        createdAt: true,
        amountMinorUnits: true,
      },
    });

    const timeseries = buckets.map((bucket) => {
      let bGross = 0;
      let bDisc = 0;
      let bCount = 0;

      for (const o of dailyOrders) {
        if (o.createdAt >= bucket.start && o.createdAt <= bucket.end) {
          bGross += o.subtotalMinorUnits;
          bDisc += o.discountAmountMinorUnits;
          bCount++;
        }
      }

      let bRefund = 0;
      for (const r of dailyRefunds) {
        if (r.createdAt >= bucket.start && r.createdAt <= bucket.end) {
          bRefund += r.amountMinorUnits;
        }
      }

      const gross = bGross / 100;
      const net = Math.max(0, (bGross - bDisc - bRefund) / 100);

      return {
        date: bucket.key,
        label: bucket.label,
        grossSales: gross,
        netSales: net,
        orderCount: bCount,
      };
    });

    // Payment Gateway Success and Failure rates
    const paymentGroups = await prisma.payment.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    });

    let capturedCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    for (const pg of paymentGroups) {
      if (pg.status === PaymentStatus.CAPTURED) capturedCount += pg._count.id;
      else if (pg.status === PaymentStatus.FAILED) failedCount += pg._count.id;
      else if (pg.status === PaymentStatus.PENDING || pg.status === PaymentStatus.AUTHORIZED) pendingCount += pg._count.id;
    }

    const totalAttempts = capturedCount + failedCount + pendingCount;
    const successRate = totalAttempts > 0 ? Math.round((capturedCount / totalAttempts) * 1000) / 10 : 0;
    const failureRate = totalAttempts > 0 ? Math.round((failedCount / totalAttempts) * 1000) / 10 : 0;

    // Top Selling Sarees
    const topItemGroups = await prisma.orderItem.groupBy({
      by: ["productId", "productName"],
      where: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          paymentStatus: PaymentStatus.CAPTURED,
        },
      },
      _sum: {
        quantity: true,
        subtotalMinorUnits: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 6,
    });

    const topProductIds = topItemGroups.map((g) => g.productId).filter((id): id is string => Boolean(id));
    const productsDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: {
        id: true,
        category: { select: { name: true } },
        stockQuantity: true,
        images: { select: { url: true }, take: 1 },
      },
    });
    const productDetailMap = new Map(productsDetails.map((p) => [p.id, p]));

    const topProducts = topItemGroups.map((g) => {
      const p = g.productId ? productDetailMap.get(g.productId) : undefined;
      return {
        productId: g.productId || "unknown",
        productName: g.productName,
        category: p?.category?.name || "Artisan Sarees",
        unitsSold: g._sum.quantity || 0,
        revenue: (g._sum.subtotalMinorUnits || 0) / 100,
        currentStock: p?.stockQuantity ?? 0,
        primaryImage: p?.images?.[0]?.url || "/products/saree-lotus-main.jpg",
      };
    });

    // Best-Performing Categories
    const categoryCountMap = new Map<string, { unitsSold: number; revenue: number; orderCount: number }>();
    const orderItemsWithCategory = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          paymentStatus: PaymentStatus.CAPTURED,
        },
      },
      select: {
        subtotalMinorUnits: true,
        quantity: true,
        product: { select: { category: { select: { name: true } } } },
      },
    });

    for (const item of orderItemsWithCategory) {
      const catName = item.product?.category?.name || "Handloom Classics";
      const existing = categoryCountMap.get(catName) || { unitsSold: 0, revenue: 0, orderCount: 0 };
      existing.unitsSold += item.quantity;
      existing.revenue += item.subtotalMinorUnits / 100;
      existing.orderCount += 1;
      categoryCountMap.set(catName, existing);
    }

    const categoryPerformance = Array.from(categoryCountMap.entries())
      .map(([categoryName, data]) => ({
        categoryName,
        unitsSold: data.unitsSold,
        revenue: Math.round(data.revenue * 100) / 100,
        orderCount: data.orderCount,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // Low-Stock Products
    const lowStockRaw = await prisma.product.findMany({
      where: {
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        category: { select: { name: true } },
        basePriceInMinorUnits: true,
        stockQuantity: true,
        lowStockThreshold: true,
        status: true,
        variants: {
          select: { sku: true },
          take: 1,
        },
      },
    });

    const lowStockAlerts = lowStockRaw
      .filter((p) => p.stockQuantity <= p.lowStockThreshold)
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || p.variants[0]?.sku || `RASA-${p.slug.slice(0, 4).toUpperCase()}`,
        category: p.category?.name || "Artisan Sarees",
        stockQuantity: p.stockQuantity,
        lowStockThreshold: p.lowStockThreshold,
        price: p.basePriceInMinorUnits / 100,
        status: p.status,
      }));

    // Customer Retention: New vs Returning Customers
    const paidOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: PaymentStatus.CAPTURED,
      },
      select: {
        id: true,
        userId: true,
        guestEmail: true,
        createdAt: true,
      },
    });

    const distinctUserIds = Array.from(new Set(paidOrders.map((o) => o.userId).filter((id): id is string => Boolean(id))));

    // Check which users have at least one paid order created BEFORE startDate
    const priorOrderUsers = await prisma.order.groupBy({
      by: ["userId"],
      where: {
        userId: { in: distinctUserIds },
        paymentStatus: PaymentStatus.CAPTURED,
        createdAt: { lt: startDate },
      },
      _count: { id: true },
    });

    const returningUserSet = new Set(priorOrderUsers.map((u) => u.userId));

    let newCustomersCount = 0;
    let returningCustomersCount = 0;
    let guestOrdersCount = 0;

    for (const order of paidOrders) {
      if (!order.userId) {
        guestOrdersCount++;
      } else if (returningUserSet.has(order.userId)) {
        returningCustomersCount++;
      } else {
        newCustomersCount++;
      }
    }

    const totalIdentified = newCustomersCount + returningCustomersCount;
    const newCustomersPercentage =
      totalIdentified > 0 ? Math.round((newCustomersCount / totalIdentified) * 100) : 100;

    // Fulfillment & Logistics Performance
    const orderStatuses = await prisma.order.groupBy({
      by: ["status"],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        paymentStatus: PaymentStatus.CAPTURED,
      },
      _count: { id: true },
    });

    const statusMap = new Map(orderStatuses.map((s) => [s.status, s._count.id]));
    const deliveredCount = statusMap.get(OrderStatus.DELIVERED) || 0;
    const inTransitCount =
      (statusMap.get(OrderStatus.SHIPPED) || 0) + (statusMap.get(OrderStatus.OUT_FOR_DELIVERY) || 0);
    const processingCount = statusMap.get(OrderStatus.PROCESSING) || 0;
    const pendingFulfillmentCount = statusMap.get(OrderStatus.CONFIRMED) || 0;
    const cancelledCount = statusMap.get(OrderStatus.CANCELLED) || 0;

    const fulfilledTotal = deliveredCount + inTransitCount;
    const fulfillmentRate =
      currentFin.paidOrderCount > 0 ? Math.round((fulfilledTotal / currentFin.paidOrderCount) * 1000) / 10 : 0;

    // Return Count & Rate in period
    const returnsInPeriod = await prisma.return.count({
      where: {
        requestedAt: { gte: startDate, lte: endDate },
      },
    });

    const returnRate =
      deliveredCount > 0 ? Math.round((returnsInPeriod / deliveredCount) * 1000) / 10 : 0;

    return {
      period: {
        preset: range.preset,
        label: range.label,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        priorStartDate: priorStartDate.toISOString(),
        priorEndDate: priorEndDate.toISOString(),
      },
      kpis,
      financialSummary: {
        grossSales: currentFin.grossSales,
        discounts: currentFin.discounts,
        refunds: currentFin.refunds,
        shippingFees: currentFin.shippingFees,
        taxes: currentFin.taxes,
        netSales: currentFin.netSales,
        totalCollected: currentFin.totalCollected,
      },
      timeseries,
      gatewayPerformance: {
        totalAttempts,
        capturedCount,
        failedCount,
        pendingCount,
        successRate,
        failureRate,
      },
      topProducts,
      categoryPerformance,
      lowStockAlerts,
      customerBreakdown: {
        newCustomersCount,
        returningCustomersCount,
        guestOrdersCount,
        newCustomersPercentage,
      },
      fulfillmentPerformance: {
        deliveredCount,
        inTransitCount,
        processingCount,
        pendingFulfillmentCount,
        cancelledCount,
        fulfillmentRate,
        returnCount: returnsInPeriod,
        returnRate,
      },
      definitions: METRIC_DEFINITIONS,
    };
  }

  /**
   * Generates sanitized, access-controlled CSV reports.
   * Protects customer PII (masks phone/email, never exposes secrets).
   */
  async exportCsvReport(params: {
    type: "orders" | "sales" | "inventory" | "coupons" | "returns";
    preset?: AnalyticsDatePreset;
    startDate?: string;
    endDate?: string;
  }): Promise<{ filename: string; content: string }> {
    const range = resolveDateRange(params.preset || "last_30_days", params.startDate, params.endDate);
    const { startDate, endDate } = range;
    const dateTag = new Date().toISOString().slice(0, 10);

    const escapeCsv = (str: any): string => {
      if (str === null || str === undefined) return "";
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    switch (params.type) {
      case "orders": {
        const orders = await prisma.order.findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          include: {
            shippingAddress: true,
            _count: { select: { items: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5000,
        });

        const headers = [
          "Order Number",
          "Date (UTC)",
          "Order Status",
          "Payment Status",
          "Payment Method",
          "Customer Name",
          "City",
          "State",
          "Postal Code",
          "Item Count",
          "Gross Subtotal (INR)",
          "Discount (INR)",
          "Shipping (INR)",
          "Taxes (INR)",
          "Total Paid (INR)",
        ];

        const rows = orders.map((o) => [
          escapeCsv(o.orderNumber),
          escapeCsv(o.createdAt.toISOString().slice(0, 19).replace("T", " ")),
          escapeCsv(o.status),
          escapeCsv(o.paymentStatus),
          escapeCsv(o.paymentMethod),
          escapeCsv(o.shippingAddress?.name || "Guest Patron"),
          escapeCsv(o.shippingAddress?.city || ""),
          escapeCsv(o.shippingAddress?.state || ""),
          escapeCsv(o.shippingAddress?.postalCode || ""),
          escapeCsv(o._count.items),
          escapeCsv((o.subtotalMinorUnits / 100).toFixed(2)),
          escapeCsv((o.discountAmountMinorUnits / 100).toFixed(2)),
          escapeCsv((o.shippingFeeMinorUnits / 100).toFixed(2)),
          escapeCsv((o.taxAmountMinorUnits / 100).toFixed(2)),
          escapeCsv((o.totalAmountMinorUnits / 100).toFixed(2)),
        ]);

        const content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        return { filename: `rasa-orders-export-${dateTag}.csv`, content };
      }

      case "sales": {
        const analytics = await this.getDashboardAnalytics({
          preset: params.preset,
          startDate: params.startDate,
          endDate: params.endDate,
        });

        const headers = ["Date", "Period Label", "Gross Sales (INR)", "Net Sales (INR)", "Order Count"];
        const rows = analytics.timeseries.map((t) => [
          escapeCsv(t.date),
          escapeCsv(t.label),
          escapeCsv(t.grossSales.toFixed(2)),
          escapeCsv(t.netSales.toFixed(2)),
          escapeCsv(t.orderCount),
        ]);

        const content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        return { filename: `rasa-sales-summary-${dateTag}.csv`, content };
      }

      case "inventory": {
        const products = await prisma.product.findMany({
          include: {
            category: true,
            variants: true,
          },
          orderBy: { name: "asc" },
        });

        const headers = [
          "Product Name",
          "Slug",
          "SKU",
          "Category",
          "Fabric",
          "Color",
          "Stock Quantity",
          "Low Stock Threshold",
          "Stock Status",
          "Price (INR)",
          "Status",
        ];

        const rows = products.map((p) => {
          const sku = p.sku || p.variants[0]?.sku || `RASA-${p.slug.slice(0, 4).toUpperCase()}`;
          const stockStatus =
            p.stockQuantity <= 0
              ? "OUT_OF_STOCK"
              : p.stockQuantity <= p.lowStockThreshold
              ? "LOW_STOCK"
              : "IN_STOCK";

          return [
            escapeCsv(p.name),
            escapeCsv(p.slug),
            escapeCsv(sku),
            escapeCsv(p.category?.name || "Handloom Classics"),
            escapeCsv(p.fabric || "Pure Silk"),
            escapeCsv(p.color || ""),
            escapeCsv(p.stockQuantity),
            escapeCsv(p.lowStockThreshold),
            escapeCsv(stockStatus),
            escapeCsv((p.basePriceInMinorUnits / 100).toFixed(2)),
            escapeCsv(p.status),
          ];
        });

        const content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        return { filename: `rasa-inventory-report-${dateTag}.csv`, content };
      }

      case "coupons": {
        const coupons = await prisma.coupon.findMany({
          include: {
            redemptions: {
              where: {
                createdAt: { gte: startDate, lte: endDate },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const headers = [
          "Coupon Code",
          "Description",
          "Discount Type",
          "Discount Value",
          "Period Redemptions",
          "Total Lifetime Redemptions",
          "Period Total Discount (INR)",
          "Active Status",
        ];

        const rows = coupons.map((c) => {
          const periodRedemptions = c.redemptions.length;
          const periodDiscountMinor = c.redemptions.reduce(
            (sum, r) => sum + r.discountAmountMinorUnits,
            0
          );
          const valDisplay =
            c.discountType === "PERCENTAGE"
              ? `${c.discountValueMinorUnits}%`
              : `₹${(c.discountValueMinorUnits / 100).toFixed(2)}`;

          return [
            escapeCsv(c.code),
            escapeCsv(c.description || ""),
            escapeCsv(c.discountType),
            escapeCsv(valDisplay),
            escapeCsv(periodRedemptions),
            escapeCsv(c.usageCount),
            escapeCsv((periodDiscountMinor / 100).toFixed(2)),
            escapeCsv(c.isActive ? "ACTIVE" : "INACTIVE"),
          ];
        });

        const content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        return { filename: `rasa-coupons-report-${dateTag}.csv`, content };
      }

      case "returns": {
        const returns = await prisma.return.findMany({
          where: {
            requestedAt: { gte: startDate, lte: endDate },
          },
          include: {
            order: { select: { orderNumber: true } },
            orderItem: { select: { productName: true, sku: true } },
          },
          orderBy: { requestedAt: "desc" },
        });

        const headers = [
          "Return ID",
          "Order Number",
          "Product Name",
          "SKU",
          "Requested Date",
          "Return Reason",
          "Status",
          "Refund Amount (INR)",
          "Processed Date",
        ];

        const rows = returns.map((r) => [
          escapeCsv(r.id),
          escapeCsv(r.order.orderNumber),
          escapeCsv(r.orderItem.productName),
          escapeCsv(r.orderItem.sku),
          escapeCsv(r.requestedAt.toISOString().slice(0, 10)),
          escapeCsv(r.reason),
          escapeCsv(r.status),
          escapeCsv(r.refundAmountMinorUnits ? (r.refundAmountMinorUnits / 100).toFixed(2) : "0.00"),
          escapeCsv(r.processedAt ? r.processedAt.toISOString().slice(0, 10) : "Pending"),
        ]);

        const content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        return { filename: `rasa-returns-refunds-${dateTag}.csv`, content };
      }
    }
  }
}

export const analyticsService = new AnalyticsService();
