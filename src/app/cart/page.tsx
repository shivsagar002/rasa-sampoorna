"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";
import { SiteFooter } from "@/components/landing/site-footer";
import { useShop } from "@/context/shop-context";

export default function CartAndCheckoutPage() {
  const { cart, updateQuantity, removeFromCart, clearCart, subtotal } = useShop();

  const [deliveryOption, setDeliveryOption] = useState<"standard" | "express">(
    "standard"
  );
  const [paymentMethod, setPaymentMethod] = useState<string>("upi");
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isOrderPlaced, setIsOrderPlaced] = useState<boolean>(false);

  // Address form fields
  const [formData, setFormData] = useState({
    fullName: "Priya Sharma",
    phone: "+91 98765 43210",
    address: "Flat 402, Lotus Residency, Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
    saveAddress: true,
  });

  const shippingCost = deliveryOption === "express" ? 150 : 0;
  const finalTotal = subtotal + shippingCost;

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
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOrderPlaced(true);
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
                          src={item.product.images[0]}
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
                            marginBottom: "8px",
                          }}
                        >
                          {item.selectedSize || "Standard size"}
                        </p>
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
                          onClick={() => updateQuantity(item.id, -1)}
                          style={{
                            width: "26px",
                            height: "26px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
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
                          onClick={() => updateQuantity(item.id, 1)}
                          style={{
                            width: "26px",
                            height: "26px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
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
                      onClick={() => setCurrentStep(step.num)}
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
                            Phone Number *
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
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
                            Pincode *
                          </label>
                          <input
                            type="text"
                            name="pincode"
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
                          <span style={{ fontWeight: 700, color: "#27ae60" }}>
                            Free
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
                        onClick={() => setCurrentStep(2)}
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
                          style={{
                            flex: 2,
                            padding: "14px",
                            backgroundColor: "var(--btn-dark)",
                            color: "#f7f4ee",
                            borderRadius: "9999px",
                            fontWeight: 600,
                            fontSize: "15px",
                            boxShadow: "0 6px 18px rgba(46, 56, 48, 0.2)",
                          }}
                        >
                          Place Order (₹{finalTotal.toLocaleString("en-IN")})
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Right Column: Order Summary */}
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
                  <span style={{ fontWeight: 600 }}>
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Shipping</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: shippingCost === 0 ? "#27ae60" : "var(--text-primary)",
                    }}
                  >
                    {shippingCost === 0 ? "FREE" : `₹${shippingCost}`}
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
                  ₹{finalTotal.toLocaleString("en-IN")}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1) setCurrentStep(2);
                  else setIsOrderPlaced(true);
                }}
                style={{
                  width: "100%",
                  padding: "16px",
                  backgroundColor: "var(--btn-dark, #2e3830)",
                  color: "#f7f4ee",
                  borderRadius: "9999px",
                  fontWeight: 600,
                  fontSize: "15px",
                  boxShadow: "0 6px 18px rgba(46, 56, 48, 0.2)",
                  marginBottom: "16px",
                  display: "block",
                  textAlign: "center",
                }}
              >
                Proceed to Checkout
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

        {/* Order Placed Success Modal */}
        {isOrderPlaced && (
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
                Your order <strong>#HS-{Math.floor(100000 + Math.random() * 900000)}</strong> has been
                received with sincere gratitude. Our master artisans are preparing your
                handcrafted pieces with care.
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
                  <span style={{ fontWeight: 600 }}>{formData.fullName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Expected dispatch:</span>
                  <span style={{ fontWeight: 600 }}>Within 48 Hours</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Amount Paid:</span>
                  <span style={{ fontWeight: 700, color: "var(--btn-dark)" }}>
                    ₹{finalTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsOrderPlaced(false);
                  clearCart();
                }}
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
                Return to Shop
              </button>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
      <MobileBottomBar />
    </div>
  );
}
