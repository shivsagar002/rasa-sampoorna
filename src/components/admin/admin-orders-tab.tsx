"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface OrderSummary {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  itemCount: number;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shipment?: {
    status: string;
    courier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  } | null;
  hasReturns: boolean;
  returnCount: number;
}

export function AdminOrdersTab() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Order for Inspection
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Action States
  const [shippingLoading, setShippingLoading] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Return review states
  const [reviewModalReturn, setReviewModalReturn] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewingReturn, setReviewingReturn] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "15");
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (paymentFilter !== "ALL") params.set("paymentStatus", paymentFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/v1/admin/orders?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to fetch orders.");
      }

      setOrders(data.data.items);
      setTotalPages(data.data.pagination.totalPages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, paymentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const openOrderDetails = async (orderId: string) => {
    try {
      setLoadingDetails(true);
      setActionMessage(null);
      const res = await fetch(`/api/v1/admin/orders/${orderId}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setSelectedOrder(data.data);
      } else {
        alert(data.error?.message || "Failed to load order details.");
      }
    } catch {
      alert("Error fetching order details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleFulfillShipment = async () => {
    if (!selectedOrder) return;
    try {
      setShippingLoading(true);
      setActionMessage(null);
      const res = await fetch(`/api/v1/admin/orders/${selectedOrder.id}/ship`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Shipment booking failed.");

      setActionMessage({ text: "Shipment successfully generated with Shiprocket! AWB assigned." });
      openOrderDetails(selectedOrder.id);
      fetchOrders();
    } catch (err: unknown) {
      setActionMessage({ text: err instanceof Error ? err.message : "Fulfillment failed.", isError: true });
    } finally {
      setShippingLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !cancelReason.trim()) return;
    try {
      setCancelling(true);
      const res = await fetch(`/api/v1/admin/orders/${selectedOrder.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason, issueRefund: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to cancel order.");

      setCancelModal(false);
      setCancelReason("");
      setActionMessage({ text: "Order cancelled and refund processed." });
      openOrderDetails(selectedOrder.id);
      fetchOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error cancelling order.");
    } finally {
      setCancelling(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !adminNote.trim()) return;
    try {
      setSavingNote(true);
      const res = await fetch(`/api/v1/admin/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: adminNote.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminNote("");
        setActionMessage({ text: "Internal note added." });
        openOrderDetails(selectedOrder.id);
      }
    } finally {
      setSavingNote(false);
    }
  };

  const handleReviewReturn = async () => {
    if (!reviewModalReturn) return;
    try {
      setReviewingReturn(true);
      const res = await fetch(`/api/v1/admin/returns/${reviewModalReturn.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnId: reviewModalReturn.id,
          action: reviewAction,
          adminNotes: reviewNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Return review failed.");

      setReviewModalReturn(null);
      setReviewNotes("");
      setActionMessage({ text: `Return request ${reviewAction.toLowerCase()}d.` });
      openOrderDetails(selectedOrder.id);
      fetchOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to review return.");
    } finally {
      setReviewingReturn(false);
    }
  };

  const handleReceiveReturn = async (returnId: string) => {
    if (!confirm("Confirm physical receipt of this return at warehouse? This will automatically initiate the Razorpay gateway refund and restock inventory.")) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/returns/${returnId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnId, restock: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to confirm return.");

      setActionMessage({ text: "Return marked as received. Gateway refund initiated and inventory restocked." });
      openOrderDetails(selectedOrder.id);
      fetchOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to process received return.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "20px 24px",
          border: "1px solid var(--border-light, #e8dfd5)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "10px", flex: 1, minWidth: "280px" }}>
          <input
            type="text"
            placeholder="Search Order #, email, phone, AWB..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border-light, #e8dfd5)",
              fontSize: "14px",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              backgroundColor: "var(--btn-dark, #2c2621)",
              color: "#f7f4ee",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Order Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                fontSize: "13px",
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_PAYMENT">Pending Payment</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Payment Status
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border-light)",
                fontSize: "13px",
              }}
            >
              <option value="ALL">All Payments</option>
              <option value="PENDING">Pending</option>
              <option value="CAPTURED">Captured (Paid)</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid var(--border-light, #e8dfd5)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
            Loading orders...
          </div>
        ) : error ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#c53030" }}>{error}</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
            No orders found matching the filter criteria.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--bg-cream, #f7f4ee)", textAlign: "left", borderBottom: "1px solid var(--border-light)" }}>
                <th style={{ padding: "14px 20px", fontWeight: 600 }}>Order #</th>
                <th style={{ padding: "14px 16px", fontWeight: 600 }}>Date</th>
                <th style={{ padding: "14px 16px", fontWeight: 600 }}>Customer</th>
                <th style={{ padding: "14px 16px", fontWeight: 600 }}>Fulfillment</th>
                <th style={{ padding: "14px 16px", fontWeight: 600 }}>Payment</th>
                <th style={{ padding: "14px 16px", fontWeight: 600 }}>Logistics</th>
                <th style={{ padding: "14px 16px", fontWeight: 600, textAlign: "right" }}>Total</th>
                <th style={{ padding: "14px 20px", fontWeight: 600, textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => (
                <tr key={ord.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "14px 20px", fontWeight: 600 }}>
                    {ord.orderNumber}
                    {ord.hasReturns && (
                      <span style={{ marginLeft: "8px", padding: "2px 6px", backgroundColor: "#fffaf0", color: "#7b341e", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                        Return ({ord.returnCount})
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>
                    {new Date(ord.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600 }}>{ord.customer.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>{ord.customer.email || ord.customer.phone}</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: ord.status === "DELIVERED" ? "#e6fffa" : "#f7f4ee",
                        color: ord.status === "DELIVERED" ? "#234e52" : "#5a4d41",
                      }}
                    >
                      {ord.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 600,
                        backgroundColor: ord.paymentStatus === "CAPTURED" ? "#e6fffa" : ord.paymentStatus === "FAILED" ? "#fff5f5" : "#fffaf0",
                        color: ord.paymentStatus === "CAPTURED" ? "#234e52" : ord.paymentStatus === "FAILED" ? "#c53030" : "#7b341e",
                      }}
                    >
                      {ord.paymentStatus}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {ord.shipment?.trackingNumber ? (
                      <div>
                        <div style={{ fontWeight: 500 }}>{ord.shipment.courier}</div>
                        <a
                          href={ord.shipment.trackingUrl || `https://shiprocket.co/tracking/${ord.shipment.trackingNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--accent-gold)", fontSize: "11px", textDecoration: "underline" }}
                        >
                          AWB: {ord.shipment.trackingNumber}
                        </a>
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 600 }}>
                    ₹{ord.totalAmount.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "center" }}>
                    <button
                      onClick={() => openOrderDetails(ord.id)}
                      style={{
                        padding: "6px 14px",
                        backgroundColor: "var(--bg-cream)",
                        border: "1px solid var(--border-light)",
                        borderRadius: "9999px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Inspect &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-light)" }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={{ padding: "6px 14px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "none", cursor: page <= 1 ? "not-allowed" : "pointer" }}
            >
              Previous
            </button>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              style={{ padding: "6px 14px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "none", cursor: page >= totalPages ? "not-allowed" : "pointer" }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Slide-over / Modal for Detailed Order Inspection */}
      {selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              width: "100%",
              maxWidth: "760px",
              height: "100%",
              overflowY: "auto",
              padding: "36px",
              display: "flex",
              flexDirection: "column",
              gap: "28px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-light)", paddingBottom: "20px" }}>
              <div>
                <h2 className="font-serif" style={{ fontSize: "24px", margin: 0, color: "var(--text-primary)" }}>
                  Order #{selectedOrder.orderNumber}
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString("en-IN")} &bull; ID: {selectedOrder.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  border: "1px solid var(--border-light)",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                Close &times;
              </button>
            </div>

            {/* Notification Feedback */}
            {actionMessage && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  backgroundColor: actionMessage.isError ? "#fff5f5" : "#f0fff4",
                  border: `1px solid ${actionMessage.isError ? "#feb2b2" : "#9ae6b4"}`,
                  color: actionMessage.isError ? "#c53030" : "#22543d",
                  fontSize: "14px",
                }}
              >
                {actionMessage.text}
              </div>
            )}

            {/* Quick Actions Row */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", padding: "16px", backgroundColor: "var(--bg-cream)", borderRadius: "12px" }}>
              {(selectedOrder.status === "CONFIRMED" || selectedOrder.status === "PROCESSING") && (
                <button
                  onClick={handleFulfillShipment}
                  disabled={shippingLoading}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "var(--btn-dark)",
                    color: "#f7f4ee",
                    borderRadius: "9999px",
                    fontWeight: 600,
                    fontSize: "13px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {shippingLoading ? "Booking Shiprocket..." : "🚀 Book Shiprocket Shipment"}
                </button>
              )}

              {selectedOrder.status !== "CANCELLED" && selectedOrder.status !== "REFUNDED" && (
                <button
                  onClick={() => setCancelModal(true)}
                  style={{
                    padding: "10px 18px",
                    backgroundColor: "transparent",
                    border: "1px solid #feb2b2",
                    color: "#c53030",
                    borderRadius: "9999px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel Order &amp; Refund
                </button>
              )}

              <a
                href={`/orders/${selectedOrder.id}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "10px 18px",
                  backgroundColor: "transparent",
                  border: "1px solid var(--border-light)",
                  color: "var(--text-primary)",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Open Patron Order Page &rarr;
              </a>
            </div>

            {/* Customer & Shipping Address Details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Customer</h4>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                  <strong>{selectedOrder.shippingAddress?.name || selectedOrder.user?.name || "Guest Patron"}</strong><br />
                  Email: {selectedOrder.user?.email || selectedOrder.guestEmail || "N/A"}<br />
                  Phone: {selectedOrder.shippingAddress?.phone || selectedOrder.guestPhone || "N/A"}
                </p>
              </div>

              <div style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>Delivery Address</h4>
                {selectedOrder.shippingAddress ? (
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                    {selectedOrder.shippingAddress.street}<br />
                    {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} — {selectedOrder.shippingAddress.postalCode}<br />
                    Country: {selectedOrder.shippingAddress.country}
                  </p>
                ) : (
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>No shipping address recorded</p>
                )}
              </div>
            </div>

            {/* Items Breakdown */}
            <div>
              <h3 className="font-serif" style={{ fontSize: "18px", marginBottom: "12px" }}>
                Purchased Pieces ({selectedOrder.items.length})
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left" }}>
                    <th style={{ padding: "8px 0" }}>Piece</th>
                    <th style={{ padding: "8px 0", textAlign: "center" }}>Qty</th>
                    <th style={{ padding: "8px 0", textAlign: "right" }}>Live Stock</th>
                    <th style={{ padding: "8px 0", textAlign: "right" }}>Rate</th>
                    <th style={{ padding: "8px 0", textAlign: "right" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((i: any) => (
                    <tr key={i.id} style={{ borderBottom: "1px solid #f7f4ee" }}>
                      <td style={{ padding: "10px 0" }}>
                        <div style={{ fontWeight: 600 }}>{i.productName}</div>
                        <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>SKU: {i.sku || "N/A"} &bull; Size: {i.selectedSize}</div>
                      </td>
                      <td style={{ padding: "10px 0", textAlign: "center" }}>{i.quantity}</td>
                      <td style={{ padding: "10px 0", textAlign: "right" }}>
                        <span style={{ color: i.currentStock > 0 ? "#234e52" : "#c53030", fontWeight: 600 }}>
                          {i.currentStock} units
                        </span>
                      </td>
                      <td style={{ padding: "10px 0", textAlign: "right" }}>₹{i.unitPrice.toLocaleString("en-IN")}</td>
                      <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>₹{i.subtotal.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid var(--border-light)", paddingTop: "12px", marginTop: "12px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Subtotal</span>
                  <span>₹{selectedOrder.subtotal.toLocaleString("en-IN")}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#22543d" }}>
                    <span>Coupon Discount</span>
                    <span>-₹{selectedOrder.discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Shipping</span>
                  <span>₹{selectedOrder.shippingFee.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "15px", paddingTop: "8px", borderTop: "1px solid var(--border-light)" }}>
                  <span>Total Paid</span>
                  <span>₹{selectedOrder.totalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Returns Management Section */}
            {selectedOrder.returns?.length > 0 && (
              <div style={{ padding: "20px", borderRadius: "12px", backgroundColor: "#fffaf0", border: "1px solid #feebc8" }}>
                <h3 className="font-serif" style={{ fontSize: "18px", color: "#7b341e", margin: "0 0 14px" }}>
                  Customer Returns ({selectedOrder.returns.length})
                </h3>
                {selectedOrder.returns.map((ret: any) => (
                  <div key={ret.id} style={{ padding: "14px", backgroundColor: "#fff", borderRadius: "8px", marginBottom: "12px", border: "1px solid #fbd38d" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <div>
                        <strong>{ret.orderItem?.productName || "Saree Piece"}</strong>
                        <div style={{ fontSize: "12px", color: "#7b341e" }}>Reason: {ret.reason}</div>
                      </div>
                      <span style={{ padding: "3px 8px", backgroundColor: "#feebc8", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                        {ret.status}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                      {ret.status === "REQUESTED" && (
                        <>
                          <button
                            onClick={() => {
                              setReviewModalReturn(ret);
                              setReviewAction("APPROVE");
                            }}
                            style={{ padding: "6px 14px", backgroundColor: "#234e52", color: "#fff", borderRadius: "6px", fontSize: "12px", border: "none", cursor: "pointer" }}
                          >
                            Approve &amp; Schedule Reverse Pickup
                          </button>
                          <button
                            onClick={() => {
                              setReviewModalReturn(ret);
                              setReviewAction("REJECT");
                            }}
                            style={{ padding: "6px 14px", backgroundColor: "transparent", border: "1px solid #c53030", color: "#c53030", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {ret.status === "APPROVED" && (
                        <button
                          onClick={() => handleReceiveReturn(ret.id)}
                          style={{ padding: "6px 14px", backgroundColor: "#2c2621", color: "#fff", borderRadius: "6px", fontSize: "12px", border: "none", cursor: "pointer" }}
                        >
                          Confirm Received at Warehouse &amp; Issue Gateway Refund
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Shipments Section */}
            {selectedOrder.shipments?.length > 0 && (
              <div>
                <h3 className="font-serif" style={{ fontSize: "18px", marginBottom: "12px" }}>
                  Shiprocket Logistics &amp; Tracking
                </h3>
                {selectedOrder.shipments.map((ship: any) => (
                  <div key={ship.id} style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border-light)", marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>{ship.courier || ship.carrier}</strong> &bull; AWB: {ship.trackingNumber || "Pending"}
                      </div>
                      <span style={{ padding: "2px 8px", backgroundColor: "var(--bg-cream)", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>
                        {ship.status}
                      </span>
                    </div>

                    {ship.trackingEvents?.length > 0 && (
                      <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {ship.trackingEvents.map((te: any, idx: number) => (
                          <div key={te.id || idx} style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                            &bull; <strong>{new Date(te.timestamp).toLocaleString("en-IN")}:</strong> {te.description || te.status} ({te.location || "Transit Hub"})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Audit Log Timeline */}
            {selectedOrder.auditLogs?.length > 0 && (
              <div>
                <h3 className="font-serif" style={{ fontSize: "18px", marginBottom: "10px" }}>
                  Audit History
                </h3>
                <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid var(--border-light)", borderRadius: "8px", padding: "12px" }}>
                  {selectedOrder.auditLogs.map((log: any) => (
                    <div key={log.id} style={{ fontSize: "12px", paddingBottom: "6px", borderBottom: "1px solid #f7f4ee", marginBottom: "6px" }}>
                      <span style={{ fontWeight: 600 }}>{log.action}</span> &bull; <span style={{ color: "var(--text-muted)" }}>{new Date(log.createdAt).toLocaleString("en-IN")}</span>
                      {log.details && <div style={{ color: "var(--text-secondary)", fontSize: "11px" }}>{log.details}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Internal Admin Note Form */}
            <div>
              <h3 className="font-serif" style={{ fontSize: "18px", marginBottom: "8px" }}>
                Add Internal Admin Note
              </h3>
              <form onSubmit={handleAddNote} style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="Record packaging notes, artisan dispatch notes..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-light)", fontSize: "13px" }}
                />
                <button
                  type="submit"
                  disabled={savingNote || !adminNote.trim()}
                  style={{ padding: "8px 16px", backgroundColor: "var(--btn-dark)", color: "#fff", borderRadius: "6px", border: "none", fontSize: "13px" }}
                >
                  Save Note
                </button>
              </form>
              {selectedOrder.notes && (
                <pre style={{ marginTop: "10px", padding: "10px", backgroundColor: "var(--bg-cream)", borderRadius: "6px", fontSize: "12px", whiteSpace: "pre-wrap" }}>
                  {selectedOrder.notes}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Review Modal */}
      {reviewModalReturn && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "28px", maxWidth: "460px", width: "100%" }}>
            <h3 className="font-serif" style={{ fontSize: "20px", marginTop: 0 }}>
              {reviewAction === "APPROVE" ? "Approve Return & Generate Reverse Pickup" : "Reject Return Request"}
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              {reviewAction === "APPROVE"
                ? "This will communicate with Shiprocket to schedule a reverse courier pickup from the patron's address."
                : "Provide an explanation for rejecting this return request."}
            </p>
            <textarea
              placeholder="Admin notes / explanation..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-light)", fontSize: "13px", minHeight: "80px", margin: "14px 0" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setReviewModalReturn(null)} style={{ padding: "8px 16px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "none" }}>
                Cancel
              </button>
              <button
                onClick={handleReviewReturn}
                disabled={reviewingReturn}
                style={{
                  padding: "8px 20px",
                  backgroundColor: reviewAction === "APPROVE" ? "#234e52" : "#c53030",
                  color: "#fff",
                  borderRadius: "6px",
                  border: "none",
                  fontWeight: 600,
                }}
              >
                {reviewingReturn ? "Processing..." : `Confirm ${reviewAction}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "28px", maxWidth: "460px", width: "100%" }}>
            <h3 className="font-serif" style={{ fontSize: "20px", marginTop: 0, color: "#c53030" }}>
              Cancel Order &amp; Issue Refund
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Are you sure you want to cancel Order #{selectedOrder?.orderNumber}? If already paid via Razorpay, a gateway refund will be automatically initiated.
            </p>
            <textarea
              required
              placeholder="Reason for administrative cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-light)", fontSize: "13px", minHeight: "80px", margin: "14px 0" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setCancelModal(false)} style={{ padding: "8px 16px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "none" }}>
                Dismiss
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling || !cancelReason.trim()}
                style={{ padding: "8px 20px", backgroundColor: "#c53030", color: "#fff", borderRadius: "6px", border: "none", fontWeight: 600 }}
              >
                {cancelling ? "Processing Refund..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
