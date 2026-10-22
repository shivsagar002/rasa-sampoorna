"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";
import { SiteFooter } from "@/components/landing/site-footer";
import { useShop } from "@/context/shop-context";

interface PlacedOrderDetails {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  recipientName: string;
  paymentMethod: string;
  accessToken?: string;
}

export default function CartAndCheckoutPage() {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    shippingFee,
    discountAmount,
    total,
    appliedCoupon,
    couponError,
    applyCoupon,
    removeCoupon,
    hasStockIssue,
    isLoading: isCartLoading,
    guestToken,
    serverCartId,
  } = useShop();

  const [deliveryOption, setDeliveryOption] = useState<"standard" | "express">("standard");
  const [paymentMethod, setPaymentMethod] = useState<string>("upi");
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isOrderPlaced, setIsOrderPlaced] = useState<boolean>(false);
  const [placedOrder, setPlacedOrder] = useState<PlacedOrderDetails | null>(null);

  // Coupon form state
  const [couponInput, setCouponInput] = useState<string>("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false);

  // Checkout submission & error states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  // Address form fields - completely empty by default as requested
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    saveAddress: false,
  });

  const effectiveShippingCost =
    deliveryOption === "express"
      ? 150
      : appliedCoupon?.freeShipping || subtotal >= 2000
      ? 0
      : 150;

  const finalPayableTotal = Math.max(0, subtotal + effectiveShippingCost - discountAmount);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setCheckoutError(null);
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    await applyCoupon(couponInput.trim());
    setIsApplyingCoupon(false);
  };

  const validateShippingForm = () => {
    if (!formData.fullName.trim() || formData.fullName.length < 2) {
      setCheckoutError("Please enter a valid full name.");
      return false;
    }
    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setCheckoutError("Please enter a valid 10-digit Indian phone number.");
      return false;
    }
    if (!formData.address.trim() || formData.address.length < 5) {
      setCheckoutError("Please enter a complete street address.");
      return false;
    }
    if (!formData.city.trim() || !formData.state.trim()) {
      setCheckoutError("City and state are required.");
      return false;
    }
    if (!/^\d{6}$/.test(formData.pincode.trim())) {
      setCheckoutError("Please enter a valid 6-digit Indian PIN code.");
      return false;
    }
    return true;
  };

  const handleProceedToPayment = () => {
    if (validateShippingForm()) {
      setCheckoutError(null);
      setCurrentStep(2);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateShippingForm()) {
      setCurrentStep(1);
      return;
    }

    if (cart.length === 0) {
      setCheckoutError("Your cart is empty. Please add items to your shopping bag before proceeding.");
      return;
    }

    if (hasStockIssue) {
      setCheckoutError("Please update or remove out-of-stock items before placing your order.");
      return;
    }

    setIsSubmitting(true);
    setCheckoutError(null);
    setPaymentNotice(null);

    try {
      const cleanPhone = formData.phone.replace(/\D/g, "").slice(-10);

      // Pre-sync: guarantee all items in client cart are registered on server
      for (const item of cart) {
        await fetch("/api/v1/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(guestToken ? { "x-guest-token": guestToken } : {}),
          },
          body: JSON.stringify({
            productId: item.product?.id || item.id,
            quantity: item.quantity,
            selectedSize: item.selectedSize || "Free size",
          }),
        }).catch(() => {});
      }

      // Step 1: Create Order with Server Validation & Stock Hold
      const orderPayload = {
        cartId: serverCartId || undefined,
        shippingAddress: {
          name: formData.fullName.trim(),
          phone: cleanPhone,
          street: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.pincode.trim(),
          country: "India",
        },
        deliveryOption,
        paymentMethod: paymentMethod === "cod" ? "COD" : "RAZORPAY",
        couponCode: appliedCoupon?.code,
        guestEmail: formData.email.trim() || undefined,
        guestPhone: cleanPhone,
      };

      const res = await fetch("/api/v1/checkout/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(guestToken ? { "x-guest-token": guestToken } : {}),
        },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await res.json();

      if (!res.ok) {
        throw new Error(orderData.error?.message || "Failed to create order. Please try again.");
      }

      const createdOrder = orderData.data;

      // Step 2: Handle Payment
      if (paymentMethod === "cod") {
        // Cash on delivery: Verify immediately as confirmed pending delivery
        const verifyRes = await fetch("/api/v1/checkout/verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(guestToken ? { "x-guest-token": guestToken } : {}),
          },
          body: JSON.stringify({
            orderId: createdOrder.orderId,
            razorpayOrderId: createdOrder.razorpayOrderId || `cod_${createdOrder.orderNumber}`,
            razorpayPaymentId: `pay_cod_${Date.now()}`,
            razorpaySignature: "cod_signature_verified",
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyRes.ok) {
          setPlacedOrder({
            orderId: createdOrder.orderId,
            orderNumber: createdOrder.orderNumber,
            totalAmount: createdOrder.totalAmount,
            recipientName: formData.fullName,
            paymentMethod: "Cash on Delivery",
            accessToken: verifyData.data?.accessToken,
          });
          setIsOrderPlaced(true);
          await clearCart();
          return;
        } else {
          throw new Error(verifyData.error?.message || "Order verification could not be completed.");
        }
      }

      // Online Payment via Razorpay
      const isRazorpayReady = await loadRazorpayScript();
      if (!isRazorpayReady) {
        throw new Error("Unable to initialize Razorpay payment gateway. Please check your network and try again.");
      }

      const razorpayKey =
        createdOrder.razorpayKeyId ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        "rzp_live_ShMFxv5n0Pkajj";

      const razorpayOptions = {
        key: razorpayKey,
        amount: Math.round(createdOrder.totalAmount * 100),
        currency: createdOrder.currency || "INR",
        name: "RASA Sampoorna",
        description: `Order #${createdOrder.orderNumber} - Artisan Heritage Sarees`,
        order_id: createdOrder.razorpayOrderId,
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: cleanPhone,
        },
        theme: {
          color: "#802a2a",
        },
        handler: async function (paymentResponse: any) {
          setIsSubmitting(true);
          try {
            const verifyRes = await fetch("/api/v1/checkout/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(guestToken ? { "x-guest-token": guestToken } : {}),
              },
              body: JSON.stringify({
                orderId: createdOrder.orderId,
                razorpayOrderId: paymentResponse.razorpay_order_id || createdOrder.razorpayOrderId,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setPlacedOrder({
                orderId: createdOrder.orderId,
                orderNumber: createdOrder.orderNumber,
                totalAmount: createdOrder.totalAmount,
                recipientName: formData.fullName,
                paymentMethod: "Razorpay (Online Payment)",
                accessToken: verifyData.data?.accessToken,
              });
              setIsOrderPlaced(true);
              await clearCart();
            } else {
              setPaymentNotice(verifyData.error?.message || "Payment verification failed. Your items remain in your bag.");
            }
          } catch (err: any) {
            setCheckoutError(err.message || "Payment verification encountered an unexpected issue.");
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            setPaymentNotice("Payment was not completed. Your shopping bag remains preserved.");
          },
        },
      };

      const rzpInstance = new (window as any).Razorpay(razorpayOptions);
      rzpInstance.on("payment.failed", function (failResponse: any) {
        setIsSubmitting(false);
        setCheckoutError(failResponse.error?.description || "Payment failed. Please try a different card or UPI.");
      });
      rzpInstance.open();
    } catch (err: any) {
      setCheckoutError(err.message || "An error occurred during checkout. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--bg-cream, #f7f4ee)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader solidBackground />

      <main
        style={{
          flex: 1,
          maxWidth: "1320px",
          margin: "0 auto",
          width: "100%",
          padding: "32px 20px 80px",
        }}
      >
        <h1
          className="font-serif"
          style={{
            fontSize: "clamp(30px, 3.5vw, 42px)",
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: "28px",
          }}
        >
          Cart &amp; Checkout
        </h1>

        {/* Global Payment Notice / Warning */}
        {paymentNotice && (
          <div
            style={{
              padding: "14px 18px",
              backgroundColor: "rgba(217, 83, 79, 0.08)",
              border: "1px solid rgba(217, 83, 79, 0.3)",
              borderRadius: "12px",
              color: "#c0392b",
              fontSize: "14px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{paymentNotice}</span>
            <button
              onClick={() => setPaymentNotice(null)}
              style={{ fontSize: "12px", textDecoration: "underline", color: "#c0392b" }}
            >
              Dismiss
            </button>
          </div>
        )}

        {cart.length === 0 && !isOrderPlaced ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              backgroundColor: "#fff",
              borderRadius: "20px",
              border: "1px solid var(--border-light, #e8dfd5)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛍️</div>
            <h2 className="font-serif" style={{ fontSize: "24px", marginBottom: "8px" }}>
              Your shopping bag is empty
            </h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
              Explore our handcrafted sarees, paintings, and artisan creations.
            </p>
            <Link
              href="/shop"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                backgroundColor: "var(--btn-dark, #2e3830)",
                color: "#f7f4ee",
                borderRadius: "9999px",
                fontWeight: 600,
                fontSize: "15px",
              }}
            >
              Explore Shop
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: "48px",
              alignItems: "start",
            }}
            className="cart-checkout-grid"
          >
            {/* Left Column: Cart Items + Checkout Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
              {/* Cart Items List */}
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "20px",
                  padding: "24px",
                  border: "1px solid var(--border-light, #e8dfd5)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: "16px",
                    borderBottom: "1px solid var(--border-light)",
                    marginBottom: "20px",
                  }}
                >
                  <h2
                    className="font-serif"
                    style={{ fontSize: "20px", fontWeight: 600 }}
                  >
                    Your Cart ({cart.reduce((a, b) => a + b.quantity, 0)})
                  </h2>
                  <button
                    type="button"
                    onClick={clearCart}
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      textDecoration: "underline",
                    }}
                  >
                    Clear all
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        gap: "16px",
                        alignItems: "center",
                        paddingBottom: "20px",
                        borderBottom: "1px solid rgba(232, 223, 213, 0.6)",
                        opacity: item.isOutOfStock ? 0.65 : 1,
                      }}
                    >
                      {/* Item Thumbnail */}
                      <div
                        style={{
                          position: "relative",
                          width: "84px",
                          height: "105px",
                          borderRadius: "10px",
                          overflow: "hidden",
                          backgroundColor: "#f5f0e8",
                          flexShrink: 0,
                        }}
                      >
                        <Image
                          src={item.product.images[0] || "/products/placeholder.webp"}
                          alt={item.product.name}
                          fill
                          sizes="84px"
                          style={{ objectFit: "cover" }}
                        />
                      </div>

                      {/* Item Details */}
                      <div style={{ flex: 1 }}>
                        <Link href={`/shop/${item.product.slug}`}>
                          <h3
                            className="font-serif"
                            style={{
                              fontSize: "18px",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              marginBottom: "4px",
                            }}
                          >
                            {item.product.name}
                          </h3>
                        </Link>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            marginBottom: "4px",
                          }}
                        >
                          {item.selectedSize || "Standard size"}
                        </p>

                        {/* Out of stock / Stock warning */}
                        {item.stockWarning && (
                          <p
                            style={{
                              fontSize: "11px",
                              color: "#c0392b",
                              fontWeight: 600,
                              marginBottom: "6px",
                            }}
                          >
                            ⚠ {item.stockWarning}
                          </p>
                        )}

                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          ₹{item.product.price.toLocaleString("en-IN")}
                        </span>
                      </div>

                      {/* Quantity Stepper */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          border: "1px solid var(--border-light)",
                          borderRadius: "9999px",
                          padding: "2px 6px",
                          backgroundColor: "var(--bg-cream)",
                        }}
                      >
                        <button
                          type="button"
                          disabled={isCartLoading}
                          onClick={() => updateQuantity(item.id, -1)}
                          style={{
                            width: "26px",
                            height: "26px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            opacity: isCartLoading ? 0.5 : 1,
                          }}
                        >
                          −
                        </button>
                        <span
                          style={{
                            minWidth: "24px",
                            textAlign: "center",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isCartLoading || item.isOutOfStock}
                          onClick={() => updateQuantity(item.id, 1)}
                          style={{
                            width: "26px",
                            height: "26px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            opacity: isCartLoading || item.isOutOfStock ? 0.5 : 1,
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Trash Delete */}
                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          color: "#8c7d70",
                          padding: "8px",
                          transition: "color 0.2s",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          fill="none"
                          style={{ width: "18px", height: "18px" }}
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checkout Progress Tabs */}
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "20px",
                  padding: "28px",
                  border: "1px solid var(--border-light, #e8dfd5)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "28px",
                    position: "relative",
                  }}
                >
                  {[
                    { num: 1, label: "Shipping" },
                    { num: 2, label: "Payment" },
                    { num: 3, label: "Confirmation" },
                  ].map((step) => (
                    <div
                      key={step.num}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        opacity: currentStep >= step.num ? 1 : 0.45,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        if (step.num === 1) setCurrentStep(1);
                        else if (step.num === 2 && validateShippingForm()) setCurrentStep(2);
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          backgroundColor:
                            currentStep >= step.num
                              ? "var(--btn-dark)"
                              : "var(--border-light)",
                          color: "#f7f4ee",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                        }}
                      >
                        {step.num}
                      </div>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: currentStep === step.num ? 600 : 500,
                          color: "var(--text-primary)",
                        }}
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                {checkoutError && (
                  <div
                    style={{
                      padding: "12px 16px",
                      backgroundColor: "rgba(217, 83, 79, 0.08)",
                      border: "1px solid rgba(217, 83, 79, 0.25)",
                      borderRadius: "8px",
                      color: "#c0392b",
                      fontSize: "13px",
                      marginBottom: "20px",
                    }}
                  >
                    {checkoutError}
                  </div>
                )}

                <form onSubmit={handlePlaceOrder}>
                  {/* Step 1: Shipping Address */}
                  {currentStep === 1 && (
                    <div>
                      <h3
                        className="font-serif"
                        style={{
                          fontSize: "20px",
                          marginBottom: "18px",
                          color: "var(--text-primary)",
                        }}
                      >
                        Shipping Address
                      </h3>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                              marginBottom: "6px",
                            }}
                          >
                            Full Name *
                          </label>
                          <input
                            type="text"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            required
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-light)",
                              backgroundColor: "var(--bg-cream)",
                              fontFamily: "inherit",
                              fontSize: "14px",
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                              marginBottom: "6px",
                            }}
                          >
                            Phone Number * (10 digits)
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                            placeholder="e.g. 9876543210"
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-light)",
                              backgroundColor: "var(--bg-cream)",
                              fontFamily: "inherit",
                              fontSize: "14px",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: "16px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                            marginBottom: "6px",
                          }}
                        >
                          Email (for order updates)
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-light)",
                            backgroundColor: "var(--bg-cream)",
                            fontFamily: "inherit",
                            fontSize: "14px",
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: "16px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                            marginBottom: "6px",
                          }}
                        >
                          Address *
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          required
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-light)",
                            backgroundColor: "var(--bg-cream)",
                            fontFamily: "inherit",
                            fontSize: "14px",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: "14px",
                          marginBottom: "20px",
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                              marginBottom: "6px",
                            }}
                          >
                            City *
                          </label>
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            required
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-light)",
                              backgroundColor: "var(--bg-cream)",
                              fontFamily: "inherit",
                              fontSize: "14px",
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                              marginBottom: "6px",
                            }}
                          >
                            State *
                          </label>
                          <input
                            type="text"
                            name="state"
                            value={formData.state}
                            onChange={handleInputChange}
                            required
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-light)",
                              backgroundColor: "var(--bg-cream)",
                              fontFamily: "inherit",
                              fontSize: "14px",
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                              marginBottom: "6px",
                            }}
                          >
                            Pincode * (6 digits)
                          </label>
                          <input
                            type="text"
                            name="pincode"
                            maxLength={6}
                            value={formData.pincode}
                            onChange={handleInputChange}
                            required
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "8px",
                              border: "1px solid var(--border-light)",
                              backgroundColor: "var(--bg-cream)",
                              fontFamily: "inherit",
                              fontSize: "14px",
                            }}
                          />
                        </div>
                      </div>

                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                          marginBottom: "28px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          name="saveAddress"
                          checked={formData.saveAddress}
                          onChange={handleInputChange}
                          style={{ accentColor: "var(--btn-dark)" }}
                        />
                        <span>Save this address for next time</span>
                      </label>

                      {/* Delivery Options */}
                      <h4
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "var(--text-muted)",
                          marginBottom: "12px",
                        }}
                      >
                        Delivery Options
                      </h4>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          marginBottom: "28px",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "14px 16px",
                            borderRadius: "10px",
                            border:
                              deliveryOption === "standard"
                                ? "2px solid var(--btn-dark)"
                                : "1px solid var(--border-light)",
                            backgroundColor:
                              deliveryOption === "standard"
                                ? "rgba(46, 56, 48, 0.04)"
                                : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <input
                              type="radio"
                              name="delivery"
                              checked={deliveryOption === "standard"}
                              onChange={() => setDeliveryOption("standard")}
                              style={{ accentColor: "var(--btn-dark)" }}
                            />
                            <div>
                              <span style={{ fontWeight: 600, fontSize: "14px" }}>
                                Standard Delivery (5-7 days)
                              </span>
                              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                Insured transport in bespoke artisan boxes
                              </p>
                            </div>
                          </div>
                          <span
                            style={{
                              fontWeight: 700,
                              color:
                                appliedCoupon?.freeShipping || subtotal >= 2000
                                  ? "#27ae60"
                                  : "var(--text-primary)",
                            }}
                          >
                            {appliedCoupon?.freeShipping || subtotal >= 2000 ? "Free" : "₹150"}
                          </span>
                        </label>

                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "14px 16px",
                            borderRadius: "10px",
                            border:
                              deliveryOption === "express"
                                ? "2px solid var(--btn-dark)"
                                : "1px solid var(--border-light)",
                            backgroundColor:
                              deliveryOption === "express"
                                ? "rgba(46, 56, 48, 0.04)"
                                : "#fff",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <input
                              type="radio"
                              name="delivery"
                              checked={deliveryOption === "express"}
                              onChange={() => setDeliveryOption("express")}
                              style={{ accentColor: "var(--btn-dark)" }}
                            />
                            <div>
                              <span style={{ fontWeight: 600, fontSize: "14px" }}>
                                Express Delivery (1-2 days)
                              </span>
                              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                Priority dispatch via air express
                              </p>
                            </div>
                          </div>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            ₹150
                          </span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={handleProceedToPayment}
                        style={{
                          width: "100%",
                          padding: "14px",
                          backgroundColor: "var(--btn-dark)",
                          color: "#f7f4ee",
                          borderRadius: "9999px",
                          fontWeight: 600,
                          fontSize: "15px",
                        }}
                      >
                        Continue to Payment
                      </button>
                    </div>
                  )}

                  {/* Step 2: Payment Method */}
                  {currentStep === 2 && (
                    <div>
                      <h3
                        className="font-serif"
                        style={{
                          fontSize: "20px",
                          marginBottom: "18px",
                          color: "var(--text-primary)",
                        }}
                      >
                        Payment Method
                      </h3>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          marginBottom: "28px",
                        }}
                      >
                        {[
                          {
                            id: "upi",
                            title: "UPI / Net Banking",
                            sub: "Google Pay, PhonePe, Paytm, BHIM UPI",
                            icon: "⚡",
                          },
                          {
                            id: "card",
                            title: "Credit / Debit Card",
                            sub: "Visa, Mastercard, RuPay, Amex",
                            icon: "💳",
                          },
                          {
                            id: "wallet",
                            title: "Wallets",
                            sub: "Amazon Pay, Mobikwik, Paytm Wallet",
                            icon: "👛",
                          },
                          {
                            id: "cod",
                            title: "Cash on Delivery (COD)",
                            sub: "Pay with cash or UPI at delivery",
                            icon: "💵",
                          },
                        ].map((m) => (
                          <label
                            key={m.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "14px 16px",
                              borderRadius: "10px",
                              border:
                                paymentMethod === m.id
                                  ? "2px solid var(--btn-dark)"
                                  : "1px solid var(--border-light)",
                              backgroundColor:
                                paymentMethod === m.id
                                  ? "rgba(46, 56, 48, 0.04)"
                                  : "#fff",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <input
                                type="radio"
                                name="payment"
                                checked={paymentMethod === m.id}
                                onChange={() => setPaymentMethod(m.id)}
                                style={{ accentColor: "var(--btn-dark)" }}
                              />
                              <div>
                                <span style={{ fontWeight: 600, fontSize: "14px" }}>
                                  {m.title}
                                </span>
                                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                  {m.sub}
                                </p>
                              </div>
                            </div>
                            <span style={{ fontSize: "18px" }}>{m.icon}</span>
                          </label>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: "12px" }}>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          style={{
                            flex: 1,
                            padding: "14px",
                            border: "1px solid var(--border-light)",
                            borderRadius: "9999px",
                            fontWeight: 600,
                            backgroundColor: "#fff",
                          }}
                        >
                          Back to Shipping
                        </button>

                        <button
                          type="submit"
                          disabled={isSubmitting || hasStockIssue}
                          style={{
                            flex: 2,
                            padding: "14px",
                            backgroundColor:
                              hasStockIssue || isSubmitting
                                ? "var(--border-light)"
                                : "var(--btn-dark)",
                            color: "#f7f4ee",
                            borderRadius: "9999px",
                            fontWeight: 600,
                            fontSize: "15px",
                            boxShadow: "0 6px 18px rgba(46, 56, 48, 0.2)",
                            cursor: hasStockIssue || isSubmitting ? "not-allowed" : "pointer",
                          }}
                        >
                          {isSubmitting
                            ? "Securing Order..."
                            : `Place Order (₹${finalPayableTotal.toLocaleString("en-IN")})`}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Right Column: Order Summary & Coupons */}
            <div
              style={{
                position: "sticky",
                top: "100px",
                backgroundColor: "#fff",
                borderRadius: "20px",
                padding: "28px",
                border: "1px solid var(--border-light, #e8dfd5)",
                boxShadow: "0 6px 24px rgba(0,0,0,0.04)",
              }}
              className="order-summary-card"
            >
              <h2
                className="font-serif"
                style={{
                  fontSize: "22px",
                  fontWeight: 600,
                  marginBottom: "20px",
                  color: "var(--text-primary)",
                }}
              >
                Order Summary
              </h2>

              {/* Coupon Form */}
              <div
                style={{
                  marginBottom: "20px",
                  paddingBottom: "18px",
                  borderBottom: "1px solid var(--border-light)",
                }}
              >
                {appliedCoupon ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "rgba(39, 174, 96, 0.08)",
                      border: "1px solid rgba(39, 174, 96, 0.3)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "13px",
                          letterSpacing: "0.05em",
                          color: "#27ae60",
                        }}
                      >
                        ✓ {appliedCoupon.code}
                      </span>
                      <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        Saved ₹{appliedCoupon.discountAmount.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      style={{
                        fontSize: "12px",
                        color: "#c0392b",
                        fontWeight: 600,
                        textDecoration: "underline",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="Coupon Code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          borderRadius: "8px",
                          border: "1px solid var(--border-light)",
                          backgroundColor: "var(--bg-cream)",
                          fontSize: "13px",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                        }}
                      />
                      <button
                        type="submit"
                        disabled={isApplyingCoupon || !couponInput.trim()}
                        style={{
                          padding: "10px 18px",
                          backgroundColor: "var(--btn-dark)",
                          color: "#f7f4ee",
                          borderRadius: "8px",
                          fontWeight: 600,
                          fontSize: "13px",
                          cursor: isApplyingCoupon || !couponInput.trim() ? "not-allowed" : "pointer",
                          opacity: isApplyingCoupon || !couponInput.trim() ? 0.6 : 1,
                        }}
                      >
                        {isApplyingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                    {couponError && (
                      <p style={{ color: "#c0392b", fontSize: "12px", marginTop: "6px" }}>
                        {couponError}
                      </p>
                    )}
                  </form>
                )}
              </div>

              {/* Price Breakdown */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  paddingBottom: "20px",
                  borderBottom: "1px solid var(--border-light)",
                  marginBottom: "20px",
                  fontSize: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Shipping</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: effectiveShippingCost === 0 ? "#27ae60" : "var(--text-primary)",
                    }}
                  >
                    {effectiveShippingCost === 0 ? "FREE" : `₹${effectiveShippingCost}`}
                  </span>
                </div>

                {appliedCoupon && appliedCoupon.discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#27ae60", fontWeight: 600 }}>
                      Discount ({appliedCoupon.code})
                    </span>
                    <span style={{ color: "#27ae60", fontWeight: 600 }}>
                      − ₹{appliedCoupon.discountAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Taxes (5% GST)</span>
                  <span style={{ fontWeight: 500, color: "var(--text-muted)", fontSize: "12px" }}>
                    Included in item prices
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Impact Donation</span>
                  <span style={{ fontWeight: 600, color: "var(--accent-gold)" }}>
                    Included (100% NGO)
                  </span>
                </div>
              </div>

              {/* Total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "24px",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  Total
                </span>
                <span
                  style={{
                    fontSize: "26px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  ₹{finalPayableTotal.toLocaleString("en-IN")}
                </span>
              </div>

              <button
                type="button"
                disabled={hasStockIssue || isSubmitting}
                onClick={() => {
                  if (currentStep === 1) handleProceedToPayment();
                  else {
                    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                    handlePlaceOrder(fakeEvent);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "16px",
                  backgroundColor:
                    hasStockIssue || isSubmitting ? "var(--border-light)" : "var(--btn-dark, #2e3830)",
                  color: "#f7f4ee",
                  borderRadius: "9999px",
                  fontWeight: 600,
                  fontSize: "15px",
                  boxShadow: "0 6px 18px rgba(46, 56, 48, 0.2)",
                  marginBottom: "16px",
                  display: "block",
                  textAlign: "center",
                  cursor: hasStockIssue || isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {currentStep === 1 ? "Proceed to Payment" : "Complete Purchase"}
              </button>

              <Link
                href="/shop"
                style={{
                  display: "block",
                  textAlign: "center",
                  fontSize: "13px",
                  color: "var(--accent-gold)",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}

        {/* Real Order Placed Confirmation Modal */}
        {isOrderPlaced && placedOrder && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              backgroundColor: "rgba(44, 38, 33, 0.65)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "var(--bg-cream, #f7f4ee)",
                borderRadius: "24px",
                padding: "36px 32px",
                maxWidth: "520px",
                width: "100%",
                textAlign: "center",
                boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                border: "1px solid var(--border-light)",
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(39, 174, 96, 0.12)",
                  color: "#27ae60",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  fontSize: "36px",
                }}
              >
                ✓
              </div>

              <h2
                className="font-serif"
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "10px",
                }}
              >
                Thank You for Your Order!
              </h2>

              <p
                style={{
                  fontSize: "15px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  marginBottom: "20px",
                }}
              >
                Your order <strong>#{placedOrder.orderNumber}</strong> has been
                confirmed. Our master artisans are preparing your handcrafted sarees with
                sincere care.
              </p>

              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  padding: "16px",
                  border: "1px solid var(--border-light)",
                  marginBottom: "24px",
                  textAlign: "left",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Delivering to:</span>
                  <span style={{ fontWeight: 600 }}>{placedOrder.recipientName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Payment Method:</span>
                  <span style={{ fontWeight: 600 }}>{placedOrder.paymentMethod}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Expected dispatch:</span>
                  <span style={{ fontWeight: 600 }}>Within 24-48 Hours</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Amount Paid:</span>
                  <span style={{ fontWeight: 700, color: "var(--btn-dark)" }}>
                    ₹{placedOrder.totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Link
                  href={`/orders/${placedOrder.orderId}${placedOrder.accessToken ? `?token=${placedOrder.accessToken}` : ""}`}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "14px",
                    backgroundColor: "var(--btn-dark)",
                    color: "#f7f4ee",
                    borderRadius: "9999px",
                    fontWeight: 600,
                    fontSize: "15px",
                    textAlign: "center",
                    textDecoration: "none",
                  }}
                >
                  Track Order &amp; Tax Invoice &rarr;
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsOrderPlaced(false);
                    setPlacedOrder(null);
                    clearCart();
                  }}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: "transparent",
                    border: "1px solid var(--border-light)",
                    color: "var(--text-secondary)",
                    borderRadius: "9999px",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Return to Shop
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
      <MobileBottomBar />
    </div>
  );
}
