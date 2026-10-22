"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { AnalyticsDatePreset } from "@/modules/analytics/date-utils";
import { DashboardMetricsResult } from "@/modules/analytics/analytics.service";

export function AdminAnalyticsTab() {
  const [preset, setPreset] = useState<AnalyticsDatePreset>("last_30_days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [compare, setCompare] = useState(true);

  const [data, setData] = useState<DashboardMetricsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [showDefinitionsModal, setShowDefinitionsModal] = useState(false);
  const [hoveredChartPoint, setHoveredChartPoint] = useState<any | null>(null);
  const [activeChartType, setActiveChartType] = useState<"area" | "bar" | "orders">("area");

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        preset,
        compare: String(compare),
      });

      if (preset === "custom") {
        if (!customStart || !customEnd) {
          setError("Please provide both start and end dates for custom filtering.");
          setLoading(false);
          return;
        }
        params.set("startDate", customStart);
        params.set("endDate", customEnd);
      }

      const res = await fetch(`/api/v1/admin/analytics?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to retrieve analytics data.");
      }

      setData(json.data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while loading dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preset !== "custom") {
      fetchAnalytics();
    }
  }, [preset, compare]);

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAnalytics();
  };

  const getExportUrl = (type: string) => {
    const params = new URLSearchParams({ type, preset });
    if (preset === "custom" && customStart && customEnd) {
      params.set("startDate", customStart);
      params.set("endDate", customEnd);
    }
    return `/api/v1/admin/analytics/export?${params.toString()}`;
  };

  const formatRupees = (amount: number) => {
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  };

  const renderPercentageBadge = (change: number | null) => {
    if (change === null) return <span style={{ color: "#8c7d70", fontSize: "10px" }}>0%</span>;
    const isPositive = change > 0;
    const isNeutral = change === 0;

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "1px",
          padding: "1px 5px",
          borderRadius: "4px",
          fontSize: "10px",
          fontWeight: 600,
          backgroundColor: isNeutral ? "#f4efe9" : isPositive ? "#eef6f0" : "#fdf2f2",
          color: isNeutral ? "#5a4e44" : isPositive ? "#205a3c" : "#842029",
        }}
      >
        {isPositive ? "↑ +" : isNeutral ? "" : "↓ "}
        {change}%
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Filter and Action Bar */}
      <div
        style={{
          backgroundColor: "#fff",
          padding: "12px 16px",
          borderRadius: "8px",
          border: "1px solid var(--border-light, #e8dfd5)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Preset Selector */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
          {[
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "last_7_days", label: "7 Days" },
            { id: "last_30_days", label: "30 Days" },
            { id: "this_month", label: "This Month" },
            { id: "last_month", label: "Last Month" },
            { id: "this_year", label: "This Year" },
            { id: "custom", label: "Custom" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPreset(item.id as AnalyticsDatePreset)}
              style={{
                padding: "5px 10px",
                borderRadius: "5px",
                border: preset === item.id ? "1px solid var(--btn-dark, #2e3830)" : "1px solid #e8dfd5",
                backgroundColor: preset === item.id ? "var(--btn-dark, #2e3830)" : "#fff",
                color: preset === item.id ? "#f7f4ee" : "var(--text-primary, #2c2621)",
                fontSize: "12px",
                fontWeight: preset === item.id ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}

          {/* Compare toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#5a4e44", marginLeft: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              style={{ accentColor: "var(--btn-dark, #2e3830)", cursor: "pointer" }}
            />
            <span>vs Prior</span>
          </label>
        </div>

        {/* Export & Definitions Actions */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowDefinitionsModal(true)}
            style={{
              padding: "5px 10px",
              backgroundColor: "transparent",
              border: "1px solid #e8dfd5",
              borderRadius: "5px",
              fontSize: "11px",
              color: "#5a4e44",
              cursor: "pointer",
            }}
          >
            Definitions ⓘ
          </button>

          {/* Export Dropdown Trigger */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              style={{
                padding: "5px 12px",
                backgroundColor: "#fff",
                border: "1px solid #e8dfd5",
                borderRadius: "5px",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text-primary, #2c2621)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>Export CSV</span>
              <span style={{ fontSize: "9px" }}>▼</span>
            </button>

            {exportDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  marginTop: "4px",
                  width: "190px",
                  backgroundColor: "#fff",
                  border: "1px solid #e8dfd5",
                  borderRadius: "6px",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                  zIndex: 20,
                  display: "flex",
                  flexDirection: "column",
                  padding: "4px 0",
                }}
              >
                {[
                  { type: "orders", label: "Orders (Sanitized)" },
                  { type: "sales", label: "Daily Sales Summary" },
                  { type: "inventory", label: "Live Inventory & Stock" },
                  { type: "coupons", label: "Coupon Performance" },
                  { type: "returns", label: "Returns & Refunds" },
                ].map((exp) => (
                  <a
                    key={exp.type}
                    href={getExportUrl(exp.type)}
                    download
                    onClick={() => setExportDropdownOpen(false)}
                    style={{
                      padding: "6px 14px",
                      fontSize: "12px",
                      color: "#2c2621",
                      textDecoration: "none",
                      display: "block",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f7f4ee")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {exp.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Date Form */}
      {preset === "custom" && (
        <form
          onSubmit={handleApplyCustomDates}
          style={{
            backgroundColor: "#fff",
            padding: "10px 16px",
            borderRadius: "6px",
            border: "1px solid var(--border-light, #e8dfd5)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "#5a4e44" }}>From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{ padding: "4px 8px", border: "1px solid #e8dfd5", borderRadius: "4px", fontSize: "12px" }}
              required
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: "#5a4e44" }}>To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{ padding: "4px 8px", border: "1px solid #e8dfd5", borderRadius: "4px", fontSize: "12px" }}
              required
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "5px 14px",
              backgroundColor: "var(--btn-dark, #2e3830)",
              color: "#f7f4ee",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Apply Range
          </button>
        </form>
      )}

      {/* Error Feedback */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "6px",
            backgroundColor: "#fdf2f2",
            border: "1px solid #f5c6cb",
            color: "#842029",
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchAnalytics}
            style={{
              padding: "3px 8px",
              backgroundColor: "#842029",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div
          style={{
            padding: "30px 16px",
            textAlign: "center",
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #e8dfd5",
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              margin: "0 auto 8px",
              border: "2px solid #802a2a",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ fontSize: "12px", color: "#5a4e44", margin: 0 }}>
            Aggregating transactional records and financial summaries...
          </p>
        </div>
      )}

      {/* Data Loaded Display */}
      {!loading && data && (
        <>
          {/* Active Period Label */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#5a4e44" }}>
              Active Window: <strong>{data.period.label}</strong>
            </span>
            {compare && (
              <span style={{ fontSize: "11px", color: "#8c7d70" }}>
                Prior: {data.period.priorStartDate.slice(0, 10)} to {data.period.priorEndDate.slice(0, 10)}
              </span>
            )}
          </div>

          {/* 1. Compact Financial KPI Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "10px",
            }}
          >
            {/* Gross Sales */}
            <div style={{ backgroundColor: "#fff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e8dfd5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#8c7355", fontWeight: 600 }}>
                  Gross Sales
                </span>
                {compare && renderPercentageBadge(data.kpis.grossSales.percentageChange)}
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#2c2621" }}>
                {formatRupees(data.kpis.grossSales.value)}
              </div>
              {compare && (
                <div style={{ fontSize: "10px", color: "#8c7d70", marginTop: "2px" }}>
                  Prior: {formatRupees(data.kpis.grossSales.priorValue)}
                </div>
              )}
            </div>

            {/* Net Sales */}
            <div style={{ backgroundColor: "#fff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e8dfd5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#8c7355", fontWeight: 600 }}>
                  Net Sales
                </span>
                {compare && renderPercentageBadge(data.kpis.netSales.percentageChange)}
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#205a3c" }}>
                {formatRupees(data.kpis.netSales.value)}
              </div>
              {compare && (
                <div style={{ fontSize: "10px", color: "#8c7d70", marginTop: "2px" }}>
                  Prior: {formatRupees(data.kpis.netSales.priorValue)}
                </div>
              )}
            </div>

            {/* Paid Orders */}
            <div style={{ backgroundColor: "#fff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e8dfd5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#8c7355", fontWeight: 600 }}>
                  Paid Orders
                </span>
                {compare && renderPercentageBadge(data.kpis.paidOrderCount.percentageChange)}
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#2c2621" }}>
                {data.kpis.paidOrderCount.value.toLocaleString("en-IN")}
              </div>
              {compare && (
                <div style={{ fontSize: "10px", color: "#8c7d70", marginTop: "2px" }}>
                  Prior: {data.kpis.paidOrderCount.priorValue}
                </div>
              )}
            </div>

            {/* AOV */}
            <div style={{ backgroundColor: "#fff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e8dfd5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#8c7355", fontWeight: 600 }}>
                  Avg Order Value
                </span>
                {compare && renderPercentageBadge(data.kpis.aov.percentageChange)}
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#2c2621" }}>
                {formatRupees(data.kpis.aov.value)}
              </div>
              {compare && (
                <div style={{ fontSize: "10px", color: "#8c7d70", marginTop: "2px" }}>
                  Prior: {formatRupees(data.kpis.aov.priorValue)}
                </div>
              )}
            </div>

            {/* Units Sold */}
            <div style={{ backgroundColor: "#fff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e8dfd5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#8c7355", fontWeight: 600 }}>
                  Units Sold
                </span>
                {compare && renderPercentageBadge(data.kpis.unitsSold.percentageChange)}
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#2c2621" }}>
                {data.kpis.unitsSold.value.toLocaleString("en-IN")}
              </div>
              {compare && (
                <div style={{ fontSize: "10px", color: "#8c7d70", marginTop: "2px" }}>
                  Prior: {data.kpis.unitsSold.priorValue} pcs
                </div>
              )}
            </div>

            {/* Discounts */}
            <div style={{ backgroundColor: "#fff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e8dfd5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#8c7355", fontWeight: 600 }}>
                  Discounts
                </span>
                {compare && renderPercentageBadge(data.kpis.discounts.percentageChange)}
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#8c7355" }}>
                {formatRupees(data.kpis.discounts.value)}
              </div>
              {compare && (
                <div style={{ fontSize: "10px", color: "#8c7d70", marginTop: "2px" }}>
                  Prior: {formatRupees(data.kpis.discounts.priorValue)}
                </div>
              )}
            </div>

            {/* Refunds */}
            <div style={{ backgroundColor: "#fff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e8dfd5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#8c7355", fontWeight: 600 }}>
                  Refunds
                </span>
                {compare && renderPercentageBadge(data.kpis.refunds.percentageChange)}
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#842029" }}>
                {formatRupees(data.kpis.refunds.value)}
              </div>
              {compare && (
                <div style={{ fontSize: "10px", color: "#8c7d70", marginTop: "2px" }}>
                  Prior: {formatRupees(data.kpis.refunds.priorValue)}
                </div>
              )}
            </div>

            {/* Cancellations */}
            <div style={{ backgroundColor: "#fff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e8dfd5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#8c7355", fontWeight: 600 }}>
                  Cancellations
                </span>
                {compare && renderPercentageBadge(data.kpis.cancellations.percentageChange)}
              </div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#2c2621" }}>
                {data.kpis.cancellations.value}
              </div>
              <div style={{ fontSize: "10px", color: "#8c7d70", marginTop: "2px" }}>
                Total: {data.kpis.cancellations.value} orders
              </div>
            </div>
          </div>

          {/* 2. Interactive Charts Section */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px", alignItems: "start" }}>
            {/* Chart A: Multi-Style Timeline (Area Line / Bar / Order Count) */}
            <div
              style={{
                backgroundColor: "#fff",
                padding: "16px 18px",
                borderRadius: "10px",
                border: "1px solid #e8dfd5",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h3 className="font-serif" style={{ fontSize: "15px", color: "#2c2621", margin: 0 }}>
                    Sales &amp; Revenue Trends
                  </h3>
                  <span style={{ fontSize: "11px", color: "#8c7d70" }}>
                    Daily financial progression across active timeline
                  </span>
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {/* Chart Type Toggles */}
                  <div style={{ display: "flex", backgroundColor: "#f7f4ee", borderRadius: "5px", padding: "2px", border: "1px solid #e8dfd5" }}>
                    <button
                      type="button"
                      onClick={() => setActiveChartType("area")}
                      style={{
                        padding: "3px 8px",
                        fontSize: "11px",
                        fontWeight: activeChartType === "area" ? 600 : 400,
                        backgroundColor: activeChartType === "area" ? "#fff" : "transparent",
                        color: activeChartType === "area" ? "#2c2621" : "#8c7d70",
                        borderRadius: "4px",
                        border: "none",
                        cursor: "pointer",
                        boxShadow: activeChartType === "area" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      Area Line
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveChartType("bar")}
                      style={{
                        padding: "3px 8px",
                        fontSize: "11px",
                        fontWeight: activeChartType === "bar" ? 600 : 400,
                        backgroundColor: activeChartType === "bar" ? "#fff" : "transparent",
                        color: activeChartType === "bar" ? "#2c2621" : "#8c7d70",
                        borderRadius: "4px",
                        border: "none",
                        cursor: "pointer",
                        boxShadow: activeChartType === "bar" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      Bars
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveChartType("orders")}
                      style={{
                        padding: "3px 8px",
                        fontSize: "11px",
                        fontWeight: activeChartType === "orders" ? 600 : 400,
                        backgroundColor: activeChartType === "orders" ? "#fff" : "transparent",
                        color: activeChartType === "orders" ? "#2c2621" : "#8c7d70",
                        borderRadius: "4px",
                        border: "none",
                        cursor: "pointer",
                        boxShadow: activeChartType === "orders" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      Orders
                    </button>
                  </div>
                </div>
              </div>

              {/* Render Chart Content */}
              {data.timeseries.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: "#8c7d70", fontSize: "12px" }}>
                  No transactional data available for this range.
                </div>
              ) : (
                <div style={{ width: "100%", overflowX: "auto" }}>
                  {(() => {
                    const maxVal = Math.max(
                      ...data.timeseries.map((t) => (activeChartType === "orders" ? t.orderCount : t.grossSales)),
                      activeChartType === "orders" ? 5 : 1000
                    );
                    const chartHeight = 160;
                    const pointSpacing = Math.max(30, Math.min(60, Math.floor(650 / data.timeseries.length)));
                    const chartWidth = Math.max(500, data.timeseries.length * pointSpacing);

                    // Area & Line Path Generation
                    const pointsNet = data.timeseries.map((item, idx) => {
                      const x = idx * pointSpacing + 30;
                      const y = chartHeight - (item.netSales / maxVal) * (chartHeight - 20) - 10;
                      return { x, y, item };
                    });

                    const pointsGross = data.timeseries.map((item, idx) => {
                      const x = idx * pointSpacing + 30;
                      const y = chartHeight - (item.grossSales / maxVal) * (chartHeight - 20) - 10;
                      return { x, y, item };
                    });

                    const pointsOrders = data.timeseries.map((item, idx) => {
                      const x = idx * pointSpacing + 30;
                      const y = chartHeight - (item.orderCount / maxVal) * (chartHeight - 20) - 10;
                      return { x, y, item };
                    });

                    const grossPath = pointsGross.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                    const netPath = pointsNet.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                    const ordersPath = pointsOrders.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

                    const grossArea = `${grossPath} L ${pointsGross[pointsGross.length - 1].x} ${chartHeight} L ${pointsGross[0].x} ${chartHeight} Z`;
                    const netArea = `${netPath} L ${pointsNet[pointsNet.length - 1].x} ${chartHeight} L ${pointsNet[0].x} ${chartHeight} Z`;

                    return (
                      <div style={{ position: "relative", minWidth: `${chartWidth}px`, height: `${chartHeight + 35}px` }}>
                        <svg width="100%" height={chartHeight} style={{ overflow: "visible" }}>
                          <defs>
                            <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#d9e4db" stopOpacity="0.8" />
                              <stop offset="100%" stopColor="#d9e4db" stopOpacity="0.05" />
                            </linearGradient>
                            <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2e3830" stopOpacity="0.5" />
                              <stop offset="100%" stopColor="#2e3830" stopOpacity="0.02" />
                            </linearGradient>
                            <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#802a2a" stopOpacity="0.6" />
                              <stop offset="100%" stopColor="#802a2a" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>

                          {/* Horizontal Grid lines */}
                          {[0, 0.33, 0.66, 1].map((ratio) => {
                            const y = chartHeight - ratio * (chartHeight - 20) - 10;
                            return (
                              <g key={ratio}>
                                <line x1="0" y1={y} x2="100%" y2={y} stroke="#f0e9e1" strokeWidth="1" strokeDasharray="3 3" />
                                <text x="4" y={y - 3} fontSize="9" fill="#8c7d70">
                                  {activeChartType === "orders" ? Math.round(ratio * maxVal) : formatRupees(ratio * maxVal)}
                                </text>
                              </g>
                            );
                          })}

                          {/* Mode 1: Area & Line Trend */}
                          {activeChartType === "area" && (
                            <>
                              <path d={grossArea} fill="url(#grossGrad)" />
                              <path d={grossPath} fill="none" stroke="#b8c9bc" strokeWidth="2" />
                              <path d={netArea} fill="url(#netGrad)" />
                              <path d={netPath} fill="none" stroke="#2e3830" strokeWidth="2.5" />

                              {/* Interactive dots */}
                              {pointsNet.map((p, idx) => (
                                <circle
                                  key={idx}
                                  cx={p.x}
                                  cy={p.y}
                                  r="4"
                                  fill="#2e3830"
                                  stroke="#fff"
                                  strokeWidth="1.5"
                                  style={{ cursor: "pointer" }}
                                  onMouseEnter={() => setHoveredChartPoint(p.item)}
                                  onMouseLeave={() => setHoveredChartPoint(null)}
                                />
                              ))}
                            </>
                          )}

                          {/* Mode 2: Dual Bars */}
                          {activeChartType === "bar" && (
                            <>
                              {data.timeseries.map((item, idx) => {
                                const x = idx * pointSpacing + 18;
                                const barW = Math.max(12, pointSpacing - 12);
                                const grossH = Math.max(2, (item.grossSales / maxVal) * (chartHeight - 20));
                                const netH = Math.max(2, (item.netSales / maxVal) * (chartHeight - 20));

                                return (
                                  <g
                                    key={item.date}
                                    onMouseEnter={() => setHoveredChartPoint(item)}
                                    onMouseLeave={() => setHoveredChartPoint(null)}
                                    style={{ cursor: "pointer" }}
                                  >
                                    <rect x={x} y={chartHeight - grossH} width={barW} height={grossH} fill="#d9e4db" rx="2" />
                                    <rect x={x + 2} y={chartHeight - netH} width={Math.max(4, barW - 4)} height={netH} fill="#2e3830" rx="2" />
                                  </g>
                                );
                              })}
                            </>
                          )}

                          {/* Mode 3: Order Count Trend */}
                          {activeChartType === "orders" && (
                            <>
                              <path
                                d={`${ordersPath} L ${pointsOrders[pointsOrders.length - 1].x} ${chartHeight} L ${pointsOrders[0].x} ${chartHeight} Z`}
                                fill="url(#orderGrad)"
                              />
                              <path d={ordersPath} fill="none" stroke="#802a2a" strokeWidth="2.5" />
                              {pointsOrders.map((p, idx) => (
                                <circle
                                  key={idx}
                                  cx={p.x}
                                  cy={p.y}
                                  r="4"
                                  fill="#802a2a"
                                  stroke="#fff"
                                  strokeWidth="1.5"
                                  style={{ cursor: "pointer" }}
                                  onMouseEnter={() => setHoveredChartPoint(p.item)}
                                  onMouseLeave={() => setHoveredChartPoint(null)}
                                />
                              ))}
                            </>
                          )}
                        </svg>

                        {/* X-Axis labels */}
                        <div style={{ display: "flex", position: "absolute", bottom: "0", left: "20px", right: "0" }}>
                          {data.timeseries.map((item, idx) => {
                            const showLabel =
                              data.timeseries.length <= 14 ||
                              idx === 0 ||
                              idx === data.timeseries.length - 1 ||
                              idx % Math.ceil(data.timeseries.length / 8) === 0;

                            return (
                              <div
                                key={item.date}
                                style={{
                                  width: `${pointSpacing}px`,
                                  textAlign: "center",
                                  fontSize: "9px",
                                  color: "#8c7d70",
                                  visibility: showLabel ? "visible" : "hidden",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.label}
                              </div>
                            );
                          })}
                        </div>

                        {/* Hover Tooltip */}
                        {hoveredChartPoint && (
                          <div
                            style={{
                              position: "absolute",
                              top: "6px",
                              right: "12px",
                              backgroundColor: "#2c2621",
                              color: "#f7f4ee",
                              padding: "6px 10px",
                              borderRadius: "5px",
                              fontSize: "11px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              pointerEvents: "none",
                              zIndex: 10,
                            }}
                          >
                            <div style={{ fontWeight: 600, borderBottom: "1px solid #4a3e35", paddingBottom: "2px", marginBottom: "3px" }}>
                              {hoveredChartPoint.date} ({hoveredChartPoint.label})
                            </div>
                            <div>Gross: {formatRupees(hoveredChartPoint.grossSales)}</div>
                            <div>Net: {formatRupees(hoveredChartPoint.netSales)}</div>
                            <div>Completed Orders: {hoveredChartPoint.orderCount}</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Chart B: Category & Weave Distribution Donut Chart */}
            <div
              style={{
                backgroundColor: "#fff",
                padding: "16px 18px",
                borderRadius: "10px",
                border: "1px solid #e8dfd5",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3 className="font-serif" style={{ fontSize: "15px", color: "#2c2621", margin: 0 }}>
                  Weave Revenue Share
                </h3>
                <span style={{ fontSize: "11px", color: "#8c7d70" }}>
                  Collection distribution
                </span>
              </div>

              {/* Radial SVG Donut */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "14px 0" }}>
                {(() => {
                  const palette = ["#802a2a", "#2e3830", "#b89d6c", "#5a6d5c", "#a85d48", "#8c7d70"];
                  const total = data.categoryPerformance.reduce((acc, c) => acc + c.revenue, 0) || 1;
                  const radius = 45;
                  const strokeWidth = 14;
                  const circumference = 2 * Math.PI * radius;

                  let accumulatedPercent = 0;

                  return (
                    <div style={{ position: "relative", width: "120px", height: "120px" }}>
                      <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f0e9e1" strokeWidth={strokeWidth} />
                        {data.categoryPerformance.map((cat, idx) => {
                          const pct = cat.revenue / total;
                          const strokeDasharray = `${pct * circumference} ${circumference}`;
                          const strokeDashoffset = -accumulatedPercent * circumference;
                          accumulatedPercent += pct;
                          const color = palette[idx % palette.length];

                          return (
                            <circle
                              key={cat.categoryName}
                              cx="60"
                              cy="60"
                              r={radius}
                              fill="none"
                              stroke={color}
                              strokeWidth={strokeWidth}
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              style={{ transition: "stroke-dasharray 0.3s ease" }}
                            />
                          );
                        })}
                      </svg>
                      {/* Center Info */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          pointerEvents: "none",
                        }}
                      >
                        <span style={{ fontSize: "10px", color: "#8c7d70", textTransform: "uppercase" }}>Total</span>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#2c2621" }}>
                          {formatRupees(total)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Legend List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
                {data.categoryPerformance.slice(0, 4).map((cat, idx) => {
                  const palette = ["#802a2a", "#2e3830", "#b89d6c", "#5a6d5c", "#a85d48"];
                  const total = data.categoryPerformance.reduce((acc, c) => acc + c.revenue, 0) || 1;
                  const pct = Math.round((cat.revenue / total) * 100);

                  return (
                    <div key={cat.categoryName} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: palette[idx % palette.length] }} />
                        <span style={{ color: "#2c2621", fontWeight: 500 }}>{cat.categoryName}</span>
                      </div>
                      <span style={{ color: "#5a4e44", fontWeight: 600 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Two-Column Operational Section */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: "14px",
            }}
          >
            {/* Column A: Top-Selling Sarees */}
            <div
              style={{
                backgroundColor: "#fff",
                padding: "16px 18px",
                borderRadius: "10px",
                border: "1px solid #e8dfd5",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 className="font-serif" style={{ fontSize: "15px", color: "#2c2621", margin: 0 }}>
                  Best-Selling Handloom Sarees
                </h3>
                <span style={{ fontSize: "11px", color: "#8c7d70" }}>By volume</span>
              </div>

              {data.topProducts.length === 0 ? (
                <p style={{ color: "#8c7d70", fontSize: "12px", padding: "16px 0", textAlign: "center" }}>
                  No product sales recorded in this period.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e8dfd5", textAlign: "left", color: "#5a4e44" }}>
                        <th style={{ padding: "6px 8px" }}>Saree</th>
                        <th style={{ padding: "6px 8px", textAlign: "center" }}>Units</th>
                        <th style={{ padding: "6px 8px", textAlign: "right" }}>Revenue</th>
                        <th style={{ padding: "6px 8px", textAlign: "right" }}>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p) => (
                        <tr key={p.productId} style={{ borderBottom: "1px solid #f4efe9" }}>
                          <td style={{ padding: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div
                                style={{
                                  width: "28px",
                                  height: "36px",
                                  position: "relative",
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                  backgroundColor: "#f7f4ee",
                                  flexShrink: 0,
                                }}
                              >
                                <Image
                                  src={p.primaryImage || "/products/saree-lotus-main.jpg"}
                                  alt={p.productName}
                                  fill
                                  style={{ objectFit: "cover" }}
                                />
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: "#2c2621" }}>{p.productName}</div>
                                <div style={{ fontSize: "10px", color: "#8c7d70" }}>{p.category}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "8px", textAlign: "center", fontWeight: 600 }}>{p.unitsSold}</td>
                          <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: "#205a3c" }}>
                            {formatRupees(p.revenue)}
                          </td>
                          <td style={{ padding: "8px", textAlign: "right" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "2px 5px",
                                borderRadius: "3px",
                                backgroundColor: p.currentStock <= 2 ? "#fdf2f2" : "#f0f7f2",
                                color: p.currentStock <= 2 ? "#842029" : "#205a3c",
                                fontWeight: 500,
                              }}
                            >
                              {p.currentStock} left
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Column B: Order Status & Logistics Health */}
            <div
              style={{
                backgroundColor: "#fff",
                padding: "16px 18px",
                borderRadius: "10px",
                border: "1px solid #e8dfd5",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 className="font-serif" style={{ fontSize: "15px", color: "#2c2621", margin: 0 }}>
                    Logistics &amp; Fulfillment Pipeline
                  </h3>
                  <span style={{ fontSize: "11px", color: "#8c7d70" }}>
                    Fulfillment success: <strong>{data.fulfillmentPerformance.fulfillmentRate}%</strong>
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    backgroundColor: "#eef6f0",
                    color: "#205a3c",
                  }}
                >
                  {data.fulfillmentPerformance.deliveredCount} Delivered
                </span>
              </div>

              {/* Visual Pipeline Stacked Bar */}
              {(() => {
                const totalFulfill =
                  data.fulfillmentPerformance.deliveredCount +
                  data.fulfillmentPerformance.inTransitCount +
                  data.fulfillmentPerformance.processingCount +
                  data.fulfillmentPerformance.returnCount || 1;

                const delPct = Math.round((data.fulfillmentPerformance.deliveredCount / totalFulfill) * 100);
                const transitPct = Math.round((data.fulfillmentPerformance.inTransitCount / totalFulfill) * 100);
                const procPct = Math.round((data.fulfillmentPerformance.processingCount / totalFulfill) * 100);
                const retPct = Math.max(0, 100 - delPct - transitPct - procPct);

                return (
                  <div>
                    <div style={{ display: "flex", height: "10px", borderRadius: "5px", overflow: "hidden", backgroundColor: "#f0e9e1" }}>
                      <div style={{ width: `${delPct}%`, backgroundColor: "#205a3c" }} title={`Delivered: ${delPct}%`} />
                      <div style={{ width: `${transitPct}%`, backgroundColor: "#b89d6c" }} title={`In Transit: ${transitPct}%`} />
                      <div style={{ width: `${procPct}%`, backgroundColor: "#8c7d70" }} title={`Processing: ${procPct}%`} />
                      <div style={{ width: `${retPct}%`, backgroundColor: "#842029" }} title={`Returns: ${retPct}%`} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginTop: "10px", fontSize: "11px", textAlign: "center" }}>
                      <div style={{ padding: "6px 4px", backgroundColor: "#f0f7f2", borderRadius: "5px" }}>
                        <div style={{ fontWeight: 700, color: "#205a3c" }}>{data.fulfillmentPerformance.deliveredCount}</div>
                        <div style={{ fontSize: "10px", color: "#8c7d70" }}>Delivered</div>
                      </div>
                      <div style={{ padding: "6px 4px", backgroundColor: "#faf8f5", borderRadius: "5px" }}>
                        <div style={{ fontWeight: 700, color: "#8c7355" }}>{data.fulfillmentPerformance.inTransitCount}</div>
                        <div style={{ fontSize: "10px", color: "#8c7d70" }}>In Transit</div>
                      </div>
                      <div style={{ padding: "6px 4px", backgroundColor: "#f7f4ee", borderRadius: "5px" }}>
                        <div style={{ fontWeight: 700, color: "#5a4e44" }}>{data.fulfillmentPerformance.processingCount}</div>
                        <div style={{ fontSize: "10px", color: "#8c7d70" }}>Processing</div>
                      </div>
                      <div style={{ padding: "6px 4px", backgroundColor: "#fdf2f2", borderRadius: "5px" }}>
                        <div style={{ fontWeight: 700, color: "#842029" }}>{data.fulfillmentPerformance.returnCount}</div>
                        <div style={{ fontSize: "10px", color: "#8c7d70" }}>Returns ({data.fulfillmentPerformance.returnRate}%)</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Customer Patron Retention */}
              <div style={{ borderTop: "1px solid #f4efe9", paddingTop: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#5a4e44" }}>Customer Loyalty &amp; Acquisition</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "6px", textAlign: "center" }}>
                  <div style={{ padding: "6px", backgroundColor: "#f7f4ee", borderRadius: "5px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#2c2621" }}>{data.customerBreakdown.newCustomersCount}</div>
                    <div style={{ fontSize: "10px", color: "#8c7d70" }}>New Patrons</div>
                  </div>
                  <div style={{ padding: "6px", backgroundColor: "#f0f7f2", borderRadius: "5px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#205a3c" }}>{data.customerBreakdown.returningCustomersCount}</div>
                    <div style={{ fontSize: "10px", color: "#205a3c" }}>Repeat Patrons</div>
                  </div>
                  <div style={{ padding: "6px", backgroundColor: "#f7f4ee", borderRadius: "5px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#5a4e44" }}>{data.customerBreakdown.guestOrdersCount}</div>
                    <div style={{ fontSize: "10px", color: "#8c7d70" }}>Guest Checkouts</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Financial Statement Waterfall Table (Compact) */}
          <div
            style={{
              backgroundColor: "#fff",
              padding: "16px 18px",
              borderRadius: "10px",
              border: "1px solid #e8dfd5",
            }}
          >
            <div style={{ marginBottom: "10px" }}>
              <h3 className="font-serif" style={{ fontSize: "15px", color: "#2c2621", margin: 0 }}>
                GAAP Financial Waterfall &amp; Settlement
              </h3>
              <span style={{ fontSize: "11px", color: "#8c7d70" }}>
                Strict reconciliation: Gross product revenue, discounts, returns, GST taxes, and shipping
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e8dfd5", textAlign: "left", color: "#5a4e44" }}>
                    <th style={{ padding: "6px 8px" }}>Line Item</th>
                    <th style={{ padding: "6px 8px" }}>Formula</th>
                    <th style={{ padding: "6px 8px", textAlign: "right" }}>Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f4efe9" }}>
                    <td style={{ padding: "8px", fontWeight: 600, color: "#2c2621" }}>Gross Product Sales</td>
                    <td style={{ padding: "8px", color: "#8c7d70" }}>Subtotals of captured paid orders</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}>{formatRupees(data.financialSummary.grossSales)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f4efe9", color: "#8c7355" }}>
                    <td style={{ padding: "8px" }}>(-) Promotional Discounts</td>
                    <td style={{ padding: "8px", color: "#8c7d70" }}>Coupons &amp; campaigns</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>- {formatRupees(data.financialSummary.discounts)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f4efe9", color: "#842029" }}>
                    <td style={{ padding: "8px" }}>(-) Processed Returns &amp; Refunds</td>
                    <td style={{ padding: "8px", color: "#8c7d70" }}>Disbursed refunds</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>- {formatRupees(data.financialSummary.refunds)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e8dfd5", backgroundColor: "#faf8f5" }}>
                    <td style={{ padding: "8px", fontWeight: 700, color: "#205a3c" }}>= Net Merchandise Sales</td>
                    <td style={{ padding: "8px", color: "#5a4e44" }}>Gross - Discounts - Refunds</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "#205a3c" }}>
                      {formatRupees(data.financialSummary.netSales)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f4efe9" }}>
                    <td style={{ padding: "8px", color: "#5a4e44" }}>(+) Shipping Charges Billed</td>
                    <td style={{ padding: "8px", color: "#8c7d70" }}>Delivery charges collected</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>+ {formatRupees(data.financialSummary.shippingFees)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f4efe9" }}>
                    <td style={{ padding: "8px", color: "#5a4e44" }}>(+) GST Tax (5%)</td>
                    <td style={{ padding: "8px", color: "#8c7d70" }}>CGST + SGST on silk textiles</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>+ {formatRupees(data.financialSummary.taxes)}</td>
                  </tr>
                  <tr style={{ borderTop: "2px solid #2e3830", backgroundColor: "#f7f4ee" }}>
                    <td style={{ padding: "10px 8px", fontWeight: 700, color: "#2c2621" }}>Total Cash Settled / Retained</td>
                    <td style={{ padding: "10px 8px", color: "#5a4e44" }}>Net Sales + Shipping + Taxes</td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, fontSize: "14px", color: "#2c2621" }}>
                      {formatRupees(data.financialSummary.totalCollected)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Metric Definitions Modal */}
      {showDefinitionsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(44,38,33,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              borderRadius: "10px",
              padding: "20px 24px",
              border: "1px solid #e8dfd5",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e8dfd5", paddingBottom: "10px", marginBottom: "14px" }}>
              <h2 className="font-serif" style={{ fontSize: "18px", color: "#2c2621", margin: 0 }}>
                Accounting Rules &amp; Metric Definitions
              </h2>
              <button
                type="button"
                onClick={() => setShowDefinitionsModal(false)}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#8c7d70" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", lineHeight: "1.5" }}>
              {data?.definitions &&
                Object.entries(data.definitions).map(([key, desc]) => (
                  <div key={key} style={{ borderBottom: "1px solid #f4efe9", paddingBottom: "8px" }}>
                    <div style={{ fontWeight: 600, color: "#2c2621", textTransform: "capitalize", marginBottom: "2px" }}>
                      {key.replace(/([A-Z])/g, " $1")}
                    </div>
                    <div style={{ color: "#5a4e44" }}>{desc}</div>
                  </div>
                ))}
            </div>

            <div style={{ marginTop: "16px", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowDefinitionsModal(false)}
                style={{
                  padding: "6px 16px",
                  backgroundColor: "var(--btn-dark, #2e3830)",
                  color: "#f7f4ee",
                  border: "none",
                  borderRadius: "5px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
