"use client";

import { useState } from "react";

export function AdminPrivacyTab() {
  const [exportIdentifier, setExportIdentifier] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<any | null>(null);

  // Deletion state
  const [deleteIdentifier, setDeleteIdentifier] = useState("");
  const [deleteReason, setDeleteReason] = useState("Customer requested account deletion pursuant to DPDPA / GDPR.");
  const [mfaCode, setMfaCode] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteResult, setDeleteResult] = useState<any | null>(null);

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportIdentifier.trim()) return;

    setExportLoading(true);
    setExportResult(null);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/admin/privacy/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIdOrEmail: exportIdentifier.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to export customer data.");
      }

      setExportResult(json.data);
      setMessage({ text: "Customer data package prepared successfully.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setExportLoading(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteIdentifier.trim() || !mfaCode.trim()) {
      setMessage({ text: "Customer identifier and MFA verification code are required.", type: "error" });
      return;
    }

    setDeleteLoading(true);
    setDeleteResult(null);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/admin/privacy/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mfa-code": mfaCode.trim(),
        },
        body: JSON.stringify({
          userIdOrEmail: deleteIdentifier.trim(),
          reason: deleteReason.trim(),
          mfaCode: mfaCode.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Customer erasure failed.");
      }

      setDeleteResult(json.data);
      setMessage({ text: json.message || "Customer erasure executed successfully.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Alert */}
      {message && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "6px",
            fontSize: "13px",
            backgroundColor: message.type === "success" ? "#f0f7f2" : "#fdf2f2",
            border: `1px solid ${message.type === "success" ? "#b8deca" : "#f5c6cb"}`,
            color: message.type === "success" ? "#205a3c" : "#842029",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
            ✕
          </button>
        </div>
      )}

      {/* Tool 1: Customer Data Portability Export */}
      <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid var(--border-light, #e8dfd5)", padding: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px" }}>Customer Data Portability Export</h3>
        <p style={{ fontSize: "12px", color: "var(--text-muted, #8c7d70)", margin: "0 0 16px" }}>
          Generates a structured, machine-readable JSON package of customer profile, addresses, orders, and receipts. Excludes internal hashes and audit logs.
        </p>

        <form onSubmit={handleExport} style={{ display: "flex", gap: "10px", maxWidth: "600px" }}>
          <input
            type="text"
            placeholder="Customer Email or User ID"
            value={exportIdentifier}
            onChange={(e) => setExportIdentifier(e.target.value)}
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: "12px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
            }}
          />
          <button
            type="submit"
            disabled={exportLoading}
            style={{
              padding: "8px 16px",
              backgroundColor: "#2e3830",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {exportLoading ? "Exporting..." : "Export JSON"}
          </button>
        </form>

        {exportResult && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600 }}>Exported Customer Record:</span>
              <a
                href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportResult, null, 2))}`}
                download={`customer_export_${exportResult.profile?.id || "data"}.json`}
                style={{ fontSize: "12px", color: "#2563eb", textDecoration: "underline" }}
              >
                Download JSON File
              </a>
            </div>
            <pre
              style={{
                backgroundColor: "#faf8f5",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
                maxHeight: "220px",
                overflow: "auto",
                fontSize: "11px",
              }}
            >
              {JSON.stringify(exportResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Tool 2: Customer Data Deletion & Statutory Record Preservation */}
      <div style={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid var(--border-light, #e8dfd5)", padding: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px", color: "#b91c1c" }}>
          Customer Right-to-be-Forgotten &amp; Legal Data Retention
        </h3>
        <p style={{ fontSize: "12px", color: "var(--text-muted, #8c7d70)", margin: "0 0 16px" }}>
          Anonymizes patron personal identifiers and deactivates the account. Commercial tax invoices and financial transaction records are legally preserved pursuant to Indian statutory accounting mandates (Section 128 Companies Act). Requires privileged MFA step-up verification.
        </p>

        <form onSubmit={handleDelete} style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "600px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
              Customer Identifier (Email or User ID):
            </label>
            <input
              type="text"
              placeholder="e.g. patron@example.com"
              value={deleteIdentifier}
              onChange={(e) => setDeleteIdentifier(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
              Compliance Justification / Reason:
            </label>
            <input
              type="text"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
              MFA Verification Code (Step-Up Protection):
            </label>
            <input
              type="password"
              placeholder="Enter 6-digit MFA code (e.g. 123456)"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              style={{
                width: "100%",
                maxWidth: "240px",
                padding: "8px 12px",
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={deleteLoading}
            style={{
              alignSelf: "flex-start",
              padding: "8px 18px",
              backgroundColor: "#b91c1c",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {deleteLoading ? "Processing Erasure..." : "Execute Anonymization & Retention"}
          </button>
        </form>

        {deleteResult && (
          <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f0f7f2", borderRadius: "6px", border: "1px solid #b8deca" }}>
            <strong style={{ fontSize: "13px", color: "#205a3c" }}>Erasure &amp; Retention Audit Record:</strong>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              <div>Preserved Orders: {deleteResult.recordsPreservedForLegalCompliance?.ordersRetained}</div>
              <div>Preserved Payments: {deleteResult.recordsPreservedForLegalCompliance?.paymentsRetained}</div>
              <div style={{ color: "var(--text-muted)", marginTop: "4px" }}>
                Justification: {deleteResult.recordsPreservedForLegalCompliance?.statutoryJustification}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
