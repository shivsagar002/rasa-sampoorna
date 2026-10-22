"use client";

import { useEffect, useState, use, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

interface OrderDetail {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  taxAmount: number;
  currency: string;
  shippingAddress?: {
    name: string;
    phone: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    id: string;
    productName: string;
    productImage: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    selectedSize: string;
    isCurrentlyAvailable?: boolean;
    currentBasePrice?: number;
  }>;
  shipments: Array<{
    id: string;
    carrier: string;
    courier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    status: string;
    trackingEvents: Array<{
      id: string;
      status: string;
      activity?: string;
      description?: string;
      location?: string;
      timestamp: string;
    }>;
  }>;
  returns?: Array<{
    id: string;
    orderItemId: string;
    reason: string;
    status: string;
  }>;
}

function OrderTrackingContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Return modal state
  const [returnModalItem, setReturnModalItem] = useState<{ id: string; name: string } | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnFeedback, setReturnFeedback] = useState<string | null>(null);

  // Cancel order modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Invoice modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // Reorder loading
  const [reordering, setReordering] = useState(false);
  const [reorderMessage, setReorderMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true);
        const url = token ? `/api/v1/orders/${id}?token=${token}` : `/api/v1/orders/${id}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error?.message || "Order not found or access token invalid.");
        }

        setOrder(data.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load order.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchOrder();
    }
  }, [id, token]);

  const handleDownloadInvoice = async () => {
    try {
      setLoadingInvoice(true);
      const url = token ? `/api/v1/orders/${id}/invoice?token=${token}` : `/api/v1/orders/${id}/invoice`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.data) {
        setInvoiceData(data.data);
        setShowInvoiceModal(true);
      } else {
        alert("Unable to fetch invoice at this moment.");
      }
    } catch {
      alert("Failed to fetch tax invoice.");
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleReorder = async () => {
    try {
      setReordering(true);
      setReorderMessage(null);
      const res = await fetch(`/api/v1/orders/${id}/reorder`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setReorderMessage(data.message || "Items added to your bag at current prices.");
        setTimeout(() => {
          router.push("/cart");
        }, 1500);
      } else {
        setReorderMessage(data.error?.message || "Failed to reorder items.");
      }
    } catch {
      setReorderMessage("Unable to reorder at this moment.");
    } finally {
      setReordering(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) return;
    try {
      setCancelling(true);
      const res = await fetch(`/api/v1/orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Order has been successfully cancelled.");
        setShowCancelModal(false);
        window.location.reload();
      } else {
        alert(data.error?.message || "Failed to cancel order.");
      }
    } catch {
      alert("Error processing cancellation.");
    } finally {
      setCancelling(false);
    }
  };

  const handleRequestReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalItem || !returnReason.trim()) return;

    try {
      setReturnSubmitting(true);
      setReturnFeedback(null);
      const res = await fetch(`/api/v1/orders/${id}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: id,
          orderItemId: returnModalItem.id,
          reason: returnReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReturnFeedback("Return requested successfully! Our team will review and schedule reverse pickup.");
        setTimeout(() => {
          setReturnModalItem(null);
          setReturnReason("");
          window.location.reload();
        }, 2000);
      } else {
        setReturnFeedback(data.error?.message || "Return submission failed.");
      }
    } catch {
      setReturnFeedback("Failed to submit return request.");
    } finally {
      setReturnSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: "#f7f4ee", minHeight: "100vh" }}>
        <SiteHeader solidBackground />
        <div style={{ padding: "120px 20px", textAlign: "center", color: "#8c7d70" }}>
          Loading order details...
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ backgroundColor: "#f7f4ee", minHeight: "100vh" }}>
        <SiteHeader solidBackground />
        <div style={{ maxWidth: "600px", margin: "100px auto", padding: "40px", backgroundColor: "#fff", borderRadius: "16px", textAlign: "center", border: "1px solid #e8dfd5" }}>
          <h2 className="font-serif" style={{ fontSize: "24px", color: "#2c2621", marginBottom: "12px" }}>
            Order Lookup Restricted
          </h2>
          <p style={{ color: "#6b5d52", fontSize: "14px", marginBottom: "24px", lineHeight: 1.6 }}>
            {error || "We could not locate this order with the provided credentials. For security, guest orders require a signed access link."}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link
              href="/login"
              style={{
                padding: "10px 22px",
                backgroundColor: "#2c2621",
                color: "#f7f4ee",
                borderRadius: "9999px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Sign In to Account
            </Link>
            <Link
              href="/contact"
              style={{
                padding: "10px 22px",
                backgroundColor: "transparent",
                border: "1px solid #e8dfd5",
                color: "#2c2621",
                borderRadius: "9999px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Contact Concierge
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const latestShipment = order.shipments?.[0];
  const canCancel = order.status === "PENDING_PAYMENT" || order.status === "CONFIRMED";
  const canReturn = order.status === "DELIVERED";

  return (
    <div style={{ backgroundColor: "#f7f4ee", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <SiteHeader solidBackground />

      <main style={{ flex: 1, maxWidth: "1140px", margin: "0 auto", width: "100%", padding: "40px 20px 100px" }}>
        {/* Breadcrumb / Top Link */}
        <div style={{ marginBottom: "24px" }}>
          <Link href="/account" style={{ fontSize: "13px", color: "#8c7d70", textDecoration: "underline" }}>
            &larr; Back to Order History
          </Link>
        </div>

        {/* Header Bar */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            padding: "32px",
            border: "1px solid #e8dfd5",
            marginBottom: "32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <h1 className="font-serif" style={{ fontSize: "28px", fontWeight: 600, color: "#2c2621" }}>
                Order #{order.orderNumber}
              </h1>
              {/* Payment Status Badge */}
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: order.paymentStatus === "CAPTURED" ? "#e6fffa" : "#fffaf0",
                  color: order.paymentStatus === "CAPTURED" ? "#234e52" : "#7b341e",
                }}
              >
                Payment: {order.paymentStatus}
              </span>
              {/* Fulfillment Status Badge */}
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: order.status === "DELIVERED" ? "#e6fffa" : "#f7f4ee",
                  color: order.status === "DELIVERED" ? "#234e52" : "#5a4d41",
                  border: "1px solid #e8dfd5",
                }}
              >
                Fulfillment: {order.status}
              </span>
            </div>
            <p style={{ color: "#8c7d70", fontSize: "14px", marginTop: "6px" }}>
              Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={handleDownloadInvoice}
              disabled={loadingInvoice}
              style={{
                padding: "9px 18px",
                backgroundColor: "transparent",
                border: "1px solid #e8dfd5",
                color: "#2c2621",
                borderRadius: "9999px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {loadingInvoice ? "Preparing..." : "Tax Invoice"}
            </button>
            <button
              onClick={handleReorder}
              disabled={reordering}
              style={{
                padding: "9px 18px",
                backgroundColor: "#2c2621",
                color: "#f7f4ee",
                borderRadius: "9999px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {reordering ? "Reordering..." : "Reorder All Available Items"}
            </button>
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                style={{
                  padding: "9px 18px",
                  backgroundColor: "transparent",
                  border: "1px solid #feb2b2",
                  color: "#c53030",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {reorderMessage && (
          <div
            style={{
              padding: "12px 20px",
              backgroundColor: "#f0fff4",
              border: "1px solid #9ae6b4",
              color: "#22543d",
              borderRadius: "12px",
              fontSize: "14px",
              marginBottom: "24px",
            }}
          >
            {reorderMessage}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "32px" }}>
          {/* Main Left: Order Items & Tracking */}
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {/* Shipment Tracking Info Card */}
            {latestShipment && (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "28px",
                  border: "1px solid #e8dfd5",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h3 className="font-serif" style={{ fontSize: "20px", fontWeight: 600, color: "#2c2621" }}>
                      Logistics & Tracking
                    </h3>
                    <p style={{ fontSize: "13px", color: "#8c7d70", marginTop: "2px" }}>
                      Carrier: <strong>{latestShipment.courier || latestShipment.carrier}</strong> &bull; AWB: <strong>{latestShipment.trackingNumber || "Pending"}</strong>
                    </p>
                  </div>
                  {latestShipment.trackingUrl && (
                    <a
                      href={latestShipment.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "6px 16px",
                        backgroundColor: "#f7f4ee",
                        color: "#8c7355",
                        borderRadius: "9999px",
                        fontSize: "12px",
                        fontWeight: 600,
                        textDecoration: "none",
                        border: "1px solid #e8dfd5",
                      }}
                    >
                      Open Live Tracking &rarr;
                    </a>
                  )}
                </div>

                {/* Tracking Milestones */}
                <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {latestShipment.trackingEvents?.length > 0 ? (
                    latestShipment.trackingEvents.map((evt, idx) => (
                      <div
                        key={evt.id || idx}
                        style={{
                          display: "flex",
                          gap: "16px",
                          alignItems: "flex-start",
                          paddingBottom: idx === latestShipment.trackingEvents.length - 1 ? "0" : "12px",
                          borderBottom: idx === latestShipment.trackingEvents.length - 1 ? "none" : "1px solid #f7f4ee",
                        }}
                      >
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: idx === 0 ? "#8c7355" : "#d1c7bd",
                            marginTop: "6px",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "14px", fontWeight: idx === 0 ? 600 : 500, color: "#2c2621" }}>
                            {evt.activity || evt.description || evt.status}
                          </p>
                          <p style={{ fontSize: "12px", color: "#8c7d70", marginTop: "2px" }}>
                            {evt.location ? `${evt.location} • ` : ""}
                            {new Date(evt.timestamp).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: "13px", color: "#8c7d70" }}>
                      Shipment label generated. Handover to courier in progress at Bengaluru artisan hub.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Purchased Items Card */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "28px",
                border: "1px solid #e8dfd5",
              }}
            >
              <h3 className="font-serif" style={{ fontSize: "20px", fontWeight: 600, color: "#2c2621", marginBottom: "20px" }}>
                Purchased Pieces ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {order.items.map((item) => {
                  const existingReturn = order.returns?.find((r) => r.orderItemId === item.id);
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingBottom: "20px",
                        borderBottom: "1px solid #f7f4ee",
                        flexWrap: "wrap",
                        gap: "16px",
                      }}
                    >
                      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                        <div
                          style={{
                            width: "72px",
                            height: "90px",
                            borderRadius: "8px",
                            backgroundColor: "#f7f4ee",
                            overflow: "hidden",
                            flexShrink: 0,
                            position: "relative",
                          }}
                        >
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                        <div>
                          <h4 style={{ fontSize: "15px", fontWeight: 600, color: "#2c2621" }}>
                            {item.productName}
                          </h4>
                          <p style={{ fontSize: "13px", color: "#8c7d70", marginTop: "2px" }}>
                            Size: {item.selectedSize} &bull; Qty: {item.quantity} &times; ₹{item.unitPrice.toLocaleString("en-IN")}
                          </p>
                          {item.currentBasePrice && item.currentBasePrice !== item.unitPrice && (
                            <p style={{ fontSize: "11px", color: "#8c7355", marginTop: "4px" }}>
                              Current Live Price: ₹{item.currentBasePrice.toLocaleString("en-IN")}
                            </p>
                          )}
                          {existingReturn && (
                            <span
                              style={{
                                display: "inline-block",
                                marginTop: "6px",
                                padding: "2px 8px",
                                backgroundColor: "#fffaf0",
                                color: "#7b341e",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 600,
                              }}
                            >
                              Return: {existingReturn.status}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "16px", fontWeight: 600, color: "#2c2621" }}>
                          ₹{item.subtotal.toLocaleString("en-IN")}
                        </div>
                        {canReturn && !existingReturn && (
                          <button
                            onClick={() => setReturnModalItem({ id: item.id, name: item.productName })}
                            style={{
                              marginTop: "8px",
                              fontSize: "12px",
                              color: "#8c7355",
                              textDecoration: "underline",
                              fontWeight: 600,
                              cursor: "pointer",
                              background: "none",
                              border: "none",
                              padding: 0,
                            }}
                          >
                            Request Return
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar: Financials & Address */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Financial Summary */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid #e8dfd5",
              }}
            >
              <h3 className="font-serif" style={{ fontSize: "18px", fontWeight: 600, color: "#2c2621", marginBottom: "16px" }}>
                Payment Summary
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#6b5d52" }}>
                  <span>Subtotal</span>
                  <span>₹{order.subtotal.toLocaleString("en-IN")}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#22543d" }}>
                    <span>Coupon Discount</span>
                    <span>-₹{order.discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", color: "#6b5d52" }}>
                  <span>Shipping Fee</span>
                  <span>{order.shippingFee === 0 ? "Complimentary" : `₹${order.shippingFee.toLocaleString("en-IN")}`}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#8c7d70", fontSize: "12px" }}>
                  <span>GST (5% Handloom Silk)</span>
                  <span>₹{order.taxAmount.toLocaleString("en-IN")} (Included)</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 600,
                    fontSize: "16px",
                    color: "#2c2621",
                    paddingTop: "12px",
                    borderTop: "1px solid #e8dfd5",
                  }}
                >
                  <span>Total Paid</span>
                  <span>₹{order.totalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {order.shippingAddress && (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid #e8dfd5",
                }}
              >
                <h3 className="font-serif" style={{ fontSize: "18px", fontWeight: 600, color: "#2c2621", marginBottom: "12px" }}>
                  Delivery Address
                </h3>
                <p style={{ fontSize: "14px", color: "#5a4d41", lineHeight: 1.6 }}>
                  <strong>{order.shippingAddress.name}</strong>
                  <br />
                  {order.shippingAddress.street}
                  {order.shippingAddress.landmark ? `, ${order.shippingAddress.landmark}` : ""}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.postalCode}
                  <br />
                  Phone: {order.shippingAddress.phone}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "460px",
              width: "100%",
            }}
          >
            <h3 className="font-serif" style={{ fontSize: "20px", color: "#2c2621", marginBottom: "12px" }}>
              Cancel Order #{order.orderNumber}
            </h3>
            <p style={{ fontSize: "13px", color: "#6b5d52", marginBottom: "16px" }}>
              If you paid online via Razorpay, a full refund of ₹{order.totalAmount.toLocaleString("en-IN")} will be automatically initiated to your original payment method.
            </p>
            <textarea
              required
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #e8dfd5",
                fontSize: "14px",
                minHeight: "80px",
                marginBottom: "20px",
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{ padding: "8px 16px", borderRadius: "9999px", border: "1px solid #e8dfd5", background: "none" }}
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                style={{
                  padding: "8px 20px",
                  borderRadius: "9999px",
                  backgroundColor: "#c53030",
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                }}
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {returnModalItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "500px",
              width: "100%",
            }}
          >
            <h3 className="font-serif" style={{ fontSize: "20px", color: "#2c2621", marginBottom: "8px" }}>
              Request Return
            </h3>
            <p style={{ fontSize: "14px", color: "#6b5d52", marginBottom: "16px" }}>
              Piece: <strong>{returnModalItem.name}</strong>
            </p>

            {returnFeedback && (
              <div
                style={{
                  padding: "10px 14px",
                  backgroundColor: "#f7f4ee",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {returnFeedback}
              </div>
            )}

            <form onSubmit={handleRequestReturn}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                Reason for Return
              </label>
              <textarea
                required
                placeholder="Please describe why you would like to return this saree..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #e8dfd5",
                  fontSize: "14px",
                  minHeight: "90px",
                  marginBottom: "20px",
                }}
              />
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setReturnModalItem(null)}
                  style={{ padding: "8px 16px", borderRadius: "9999px", border: "1px solid #e8dfd5", background: "none" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={returnSubmitting}
                  style={{
                    padding: "8px 22px",
                    borderRadius: "9999px",
                    backgroundColor: "#2c2621",
                    color: "#fff",
                    border: "none",
                    fontWeight: 600,
                  }}
                >
                  {returnSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      {showInvoiceModal && invoiceData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "16px",
              padding: "36px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e8dfd5", paddingBottom: "20px", marginBottom: "20px" }}>
              <div>
                <h2 className="font-serif" style={{ fontSize: "24px", color: "#2c2621" }}>
                  Tax Invoice
                </h2>
                <p style={{ fontSize: "13px", color: "#8c7d70" }}>
                  Invoice: {invoiceData.invoiceNumber} &bull; Date: {new Date(invoiceData.invoiceDate).toLocaleDateString("en-IN")}
                </p>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                style={{ padding: "6px 12px", border: "1px solid #e8dfd5", borderRadius: "9999px", background: "none", cursor: "pointer" }}
              >
                Close
              </button>
            </div>

            <div style={{ fontSize: "13px", color: "#5a4d41", marginBottom: "20px", lineHeight: 1.5 }}>
              <strong>Seller:</strong> {invoiceData.seller.legalName}<br />
              GSTIN: {invoiceData.seller.gstin} &bull; HSN: {invoiceData.seller.hsnCode}<br />
              {invoiceData.seller.address}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: "20px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e8dfd5", textAlign: "left" }}>
                  <th style={{ padding: "8px 0" }}>Item</th>
                  <th style={{ padding: "8px 0", textAlign: "center" }}>Qty</th>
                  <th style={{ padding: "8px 0", textAlign: "right" }}>Rate</th>
                  <th style={{ padding: "8px 0", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((it: any, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f7f4ee" }}>
                    <td style={{ padding: "8px 0" }}>{it.name}</td>
                    <td style={{ padding: "8px 0", textAlign: "center" }}>{it.quantity}</td>
                    <td style={{ padding: "8px 0", textAlign: "right" }}>₹{it.unitPrice.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "8px 0", textAlign: "right" }}>₹{it.subtotal.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", borderTop: "1px solid #e8dfd5", paddingTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Taxable Value</span>
                <span>₹{invoiceData.financials.taxableAmount.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#8c7d70" }}>
                <span>CGST (2.5%)</span>
                <span>₹{invoiceData.financials.cgstAmount.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#8c7d70" }}>
                <span>SGST (2.5%)</span>
                <span>₹{invoiceData.financials.sgstAmount.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: "15px", paddingTop: "8px", borderTop: "1px solid #e8dfd5" }}>
                <span>Total Amount Paid</span>
                <span>₹{invoiceData.financials.totalPaid.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div style={{ marginTop: "24px", textAlign: "center" }}>
              <button
                onClick={() => window.print()}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#2c2621",
                  color: "#f7f4ee",
                  borderRadius: "9999px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "none",
                }}
              >
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}

export default function GuestOrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f4ee] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-8 h-8 border-2 border-[#802a2a] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-serif text-lg text-[#2c2621]">Loading Order Details</p>
          <p className="text-xs text-[#8c7d70] uppercase tracking-wider mt-1">Authenticating request...</p>
        </div>
      }
    >
      <OrderTrackingContent params={params} />
    </Suspense>
  );
}
