"use client";

import { useState, useEffect } from "react";

export function AdminAuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Filters
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", "25");
      if (entityFilter !== "ALL") params.set("entity", entityFilter);
      if (actionFilter !== "ALL") params.set("action", actionFilter);

      const res = await fetch(`/api/v1/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data?.logs || []);
        setTotal(json.data?.total || 0);
        setPage(json.data?.page || 1);
        setTotalPages(json.data?.totalPages || 1);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page, entityFilter, actionFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          backgroundColor: "#fff",
          padding: "14px 16px",
          borderRadius: "8px",
          border: "1px solid var(--border-light, #e8dfd5)",
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: 600 }}>Filter By Entity:</span>
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          >
            <option value="ALL">All Entities</option>
            <option value="Product">Product</option>
            <option value="Order">Order</option>
            <option value="User">User</option>
            <option value="WebhookEvent">WebhookEvent</option>
            <option value="InventoryReservation">InventoryReservation</option>
            <option value="CmsContent">CmsContent</option>
          </select>

          <span style={{ fontSize: "12px", fontWeight: 600, marginLeft: "8px" }}>Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          >
            <option value="ALL">All Actions</option>
            <option value="PRODUCT_UPDATE">Product Updates</option>
            <option value="ORDER_STATUS_CHANGE">Order Status Changes</option>
            <option value="STAFF_ROLE_ASSIGNED">Staff Role Assignments</option>
            <option value="CUSTOMER_DATA_EXPORTED">Customer Data Exports</option>
            <option value="CUSTOMER_DATA_DELETED">Customer Data Deletions</option>
            <option value="WEBHOOK_RETRY_SUCCESS">Webhook Retries</option>
            <option value="PAYMENT_RECONCILED">Payment Reconciliations</option>
          </select>
        </div>

        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          Showing {logs.length} of {total} audit records
        </span>
      </div>

      {/* Audit Log Table */}
      <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid var(--border-light, #e8dfd5)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ backgroundColor: "#faf8f5", textAlign: "left", color: "var(--text-muted)" }}>
              <th style={{ padding: "10px 16px" }}>Timestamp</th>
              <th style={{ padding: "10px 16px" }}>Actor</th>
              <th style={{ padding: "10px 16px" }}>Action</th>
              <th style={{ padding: "10px 16px" }}>Entity</th>
              <th style={{ padding: "10px 16px" }}>Entity ID</th>
              <th style={{ padding: "10px 16px" }}>IP Address</th>
              <th style={{ padding: "10px 16px", textAlign: "right" }}>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderTop: "1px solid #f0eae1" }}>
                <td style={{ padding: "10px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <div style={{ fontWeight: 600 }}>{log.userName}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{log.userRole}</div>
                </td>
                <td style={{ padding: "10px 16px", fontWeight: 600 }}>{log.action}</td>
                <td style={{ padding: "10px 16px" }}>{log.entity}</td>
                <td style={{ padding: "10px 16px", fontFamily: "monospace" }}>{log.entityId.slice(0, 16)}</td>
                <td style={{ padding: "10px 16px", color: "var(--text-muted)" }}>{log.ipAddress || "Internal"}</td>
                <td style={{ padding: "10px 16px", textAlign: "right" }}>
                  <button
                    onClick={() => setSelectedLog(log)}
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      backgroundColor: "#f3f4f6",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    View Diff
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f0eae1" }}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            style={{
              padding: "4px 12px",
              fontSize: "12px",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
              backgroundColor: page === 1 ? "#f3f4f6" : "#fff",
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            style={{
              padding: "4px 12px",
              fontSize: "12px",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
              backgroundColor: page >= totalPages ? "#f3f4f6" : "#fff",
              cursor: page >= totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Detail Diff Modal */}
      {selectedLog && (
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid var(--border-light, #e8dfd5)",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
              Audit Details: {selectedLog.action} on {selectedLog.entity} ({selectedLog.entityId})
            </h4>
            <button onClick={() => setSelectedLog(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
              ✕
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "12px" }}>
            <div>
              <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>Before State:</span>
              <pre
                style={{
                  backgroundColor: "#faf8f5",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  maxHeight: "200px",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(selectedLog.details?.before || "None recorded", null, 2)}
              </pre>
            </div>

            <div>
              <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>After State:</span>
              <pre
                style={{
                  backgroundColor: "#faf8f5",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  maxHeight: "200px",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(selectedLog.details?.after || "None recorded", null, 2)}
              </pre>
            </div>
          </div>

          {selectedLog.details?.metadata && (
            <div style={{ marginTop: "12px", fontSize: "12px" }}>
              <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>Additional Metadata:</span>
              <pre
                style={{
                  backgroundColor: "#faf8f5",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                  maxHeight: "120px",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(selectedLog.details.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
