"use client";

import { useState, useEffect } from "react";

export function AdminOperationsTab() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [actionStatus, setActionStatus] = useState<{ id: string; message: string; type: "success" | "error" } | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/operations");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch {
      // handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleRetryAction = async (action: string, targetId?: string) => {
    setActionStatus({ id: targetId || action, message: "Executing safe recovery...", type: "success" });
    try {
      const res = await fetch("/api/v1/admin/operations/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetId }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error?.message || "Recovery action failed.");
      }
      setActionStatus({
        id: targetId || action,
        message: result.data?.message || "Operation resolved successfully.",
        type: "success",
      });
      fetchHealth();
    } catch (err: any) {
      setActionStatus({
        id: targetId || action,
        message: err.message || "Failed to execute recovery action.",
        type: "error",
      });
    }
  };

  const summary = data?.summary || {
    failedWebhooksCount: 0,
    paymentReconciliationIssuesCount: 0,
    shippingFailuresCount: 0,
    failedNotificationsCount: 0,
    stuckOrdersCount: 0,
    expiredReservationsCount: 0,
    lowStockItemsCount: 0,
    systemHealth: "HEALTHY",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Health & Summary Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          backgroundColor: "#fff",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid var(--border-light, #e8dfd5)",
        }}
      >
        <div>
          <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted, #8c7d70)" }}>
            System Status
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor:
                  summary.systemHealth === "HEALTHY"
                    ? "#205a3c"
                    : summary.systemHealth === "DEGRADED"
                    ? "#b45309"
                    : "#b91c1c",
              }}
            />
            <strong style={{ fontSize: "14px", color: "var(--text-primary, #2c2621)" }}>
              {summary.systemHealth}
            </strong>
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted, #8c7d70)" }}>
            Failed Webhooks
          </span>
          <div style={{ fontSize: "18px", fontWeight: 600, color: summary.failedWebhooksCount > 0 ? "#b91c1c" : "inherit" }}>
            {summary.failedWebhooksCount}
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted, #8c7d70)" }}>
            Payment Issues
          </span>
          <div style={{ fontSize: "18px", fontWeight: 600, color: summary.paymentReconciliationIssuesCount > 0 ? "#b45309" : "inherit" }}>
            {summary.paymentReconciliationIssuesCount}
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted, #8c7d70)" }}>
            Stuck Orders (&gt;30m)
          </span>
          <div style={{ fontSize: "18px", fontWeight: 600, color: summary.stuckOrdersCount > 0 ? "#b45309" : "inherit" }}>
            {summary.stuckOrdersCount}
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted, #8c7d70)" }}>
            Expired Holds
          </span>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "inherit" }}>
            {summary.expiredReservationsCount}
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted, #8c7d70)" }}>
            Failed Emails
          </span>
          <div style={{ fontSize: "18px", fontWeight: 600, color: summary.failedNotificationsCount > 0 ? "#b91c1c" : "inherit" }}>
            {summary.failedNotificationsCount}
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted, #8c7d70)" }}>
            Low Stock Alerts
          </span>
          <div style={{ fontSize: "18px", fontWeight: 600, color: summary.lowStockItemsCount > 0 ? "#b45309" : "inherit" }}>
            {summary.lowStockItemsCount}
          </div>
        </div>
      </div>

      {actionStatus && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "6px",
            fontSize: "13px",
            backgroundColor: actionStatus.type === "success" ? "#f0f7f2" : "#fdf2f2",
            border: `1px solid ${actionStatus.type === "success" ? "#b8deca" : "#f5c6cb"}`,
            color: actionStatus.type === "success" ? "#205a3c" : "#842029",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{actionStatus.message}</span>
          <button onClick={() => setActionStatus(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            ✕
          </button>
        </div>
      )}

      {/* Global Safe Recovery Actions */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
          padding: "14px 16px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid var(--border-light, #e8dfd5)",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600 }}>Operational Quick Recovery:</span>
        <button
          onClick={() => handleRetryAction("cleanup_reservations")}
          style={{
            padding: "6px 14px",
            fontSize: "12px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            backgroundColor: "#f9fafb",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Purge Expired Stock Reservations ({summary.expiredReservationsCount})
        </button>
        <button
          onClick={fetchHealth}
          style={{
            padding: "6px 14px",
            fontSize: "12px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            backgroundColor: "#f9fafb",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Refresh Telemetry
        </button>
      </div>

      {/* Section 1: Failed Webhooks */}
      <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid var(--border-light, #e8dfd5)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light, #e8dfd5)", display: "flex", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Failed Webhooks ({data?.failedWebhooks?.length || 0})</h3>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Razorpay / Shiprocket</span>
        </div>

        {data?.failedWebhooks?.length === 0 ? (
          <div style={{ padding: "20px", fontSize: "13px", color: "var(--text-muted)" }}>No failed webhook events recorded.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ backgroundColor: "#faf8f5", textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "8px 16px" }}>Provider</th>
                <th style={{ padding: "8px 16px" }}>Event</th>
                <th style={{ padding: "8px 16px" }}>Idempotency Key</th>
                <th style={{ padding: "8px 16px" }}>Error</th>
                <th style={{ padding: "8px 16px" }}>Timestamp</th>
                <th style={{ padding: "8px 16px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.failedWebhooks?.map((w: any) => (
                <tr key={w.id} style={{ borderTop: "1px solid #f0eae1" }}>
                  <td style={{ padding: "8px 16px", fontWeight: 600 }}>{w.provider}</td>
                  <td style={{ padding: "8px 16px" }}>{w.eventType}</td>
                  <td style={{ padding: "8px 16px", fontFamily: "monospace" }}>{w.idempotencyKey.slice(0, 16)}...</td>
                  <td style={{ padding: "8px 16px", color: "#b91c1c" }}>{w.error || "Execution timeout"}</td>
                  <td style={{ padding: "8px 16px", color: "var(--text-muted)" }}>{new Date(w.createdAt).toLocaleString()}</td>
                  <td style={{ padding: "8px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => handleRetryAction("retry_webhook", w.id)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        backgroundColor: "#2e3830",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Safe Retry
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Section 2: Payment Reconciliation Problems */}
      <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid var(--border-light, #e8dfd5)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light, #e8dfd5)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Payment Reconciliation Issues ({data?.paymentIssues?.length || 0})</h3>
        </div>

        {data?.paymentIssues?.length === 0 ? (
          <div style={{ padding: "20px", fontSize: "13px", color: "var(--text-muted)" }}>All payments cleanly reconciled with gateway.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ backgroundColor: "#faf8f5", textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "8px 16px" }}>Order #</th>
                <th style={{ padding: "8px 16px" }}>Amount</th>
                <th style={{ padding: "8px 16px" }}>Status</th>
                <th style={{ padding: "8px 16px" }}>Issue</th>
                <th style={{ padding: "8px 16px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.paymentIssues?.map((p: any) => (
                <tr key={p.orderId} style={{ borderTop: "1px solid #f0eae1" }}>
                  <td style={{ padding: "8px 16px", fontWeight: 600 }}>{p.orderNumber}</td>
                  <td style={{ padding: "8px 16px" }}>₹{(p.amountMinorUnits / 100).toLocaleString("en-IN")}</td>
                  <td style={{ padding: "8px 16px" }}>{p.paymentStatus}</td>
                  <td style={{ padding: "8px 16px", color: "#b45309" }}>{p.issueDescription}</td>
                  <td style={{ padding: "8px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => handleRetryAction("reconcile_payment", p.orderId)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        backgroundColor: "#2e3830",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Reconcile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Section 3: Failed Email Deliveries */}
      <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid var(--border-light, #e8dfd5)", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light, #e8dfd5)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Failed Notifications ({data?.failedNotifications?.length || 0})</h3>
        </div>

        {data?.failedNotifications?.length === 0 ? (
          <div style={{ padding: "20px", fontSize: "13px", color: "var(--text-muted)" }}>No failed email or message dispatches.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ backgroundColor: "#faf8f5", textAlign: "left", color: "var(--text-muted)" }}>
                <th style={{ padding: "8px 16px" }}>Recipient</th>
                <th style={{ padding: "8px 16px" }}>Channel</th>
                <th style={{ padding: "8px 16px" }}>Subject</th>
                <th style={{ padding: "8px 16px" }}>Created At</th>
                <th style={{ padding: "8px 16px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.failedNotifications?.map((n: any) => (
                <tr key={n.id} style={{ borderTop: "1px solid #f0eae1" }}>
                  <td style={{ padding: "8px 16px", fontWeight: 600 }}>{n.recipient}</td>
                  <td style={{ padding: "8px 16px" }}>{n.channel}</td>
                  <td style={{ padding: "8px 16px" }}>{n.subject || "Order Update"}</td>
                  <td style={{ padding: "8px 16px", color: "var(--text-muted)" }}>{new Date(n.createdAt).toLocaleString()}</td>
                  <td style={{ padding: "8px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => handleRetryAction("retry_notification", n.id)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        backgroundColor: "#2e3830",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      Retry Dispatch
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
