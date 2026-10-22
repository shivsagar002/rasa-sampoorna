"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";
import { SiteFooter } from "@/components/landing/site-footer";

export default function ContactPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, val: string): string => {
    const trimmed = val.trim();
    if (field === "name") {
      if (!trimmed) return "Please enter your full name.";
      if (trimmed.length < 2) return "Name must be at least 2 characters.";
    }
    if (field === "email") {
      if (!trimmed) return "Please enter your email address.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return "Please enter a valid email address.";
      }
    }
    if (field === "phone") {
      if (!trimmed) return "Please enter your contact number.";
      if (!/^[0-9+\s\-()]{8,16}$/.test(trimmed)) {
        return "Please enter a valid contact number.";
      }
    }
    if (field === "message") {
      if (!trimmed) return "Please provide your message or enquiry.";
    }
    return "";
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field as keyof typeof formData]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChange = (field: string, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (touched[field]) {
      const err = validateField(field, val);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {
      name: validateField("name", formData.name),
      email: validateField("email", formData.email),
      phone: validateField("phone", formData.phone),
      message: validateField("message", formData.message),
    };
    setTouched({ name: true, email: true, phone: true, message: true });
    setErrors(newErrors);

    if (Object.values(newErrors).some((msg) => msg !== "")) {
      return;
    }

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: "", email: "", phone: "", message: "" });
      setTouched({});
      setErrors({});
    }, 3500);
  };

  const faqs = [
    {
      q: "What are your shipping options?",
      a: "We provide complimentary standard delivery across India (5-7 business days) on all orders above ₹2,000. Express air delivery (1-2 business days) is available for ₹150. International shipping is also supported worldwide.",
    },
    {
      q: "Do you offer returns or exchanges?",
      a: "Yes! Since each handcrafted piece is unique, we want you to adore your purchase. We offer a 7-day hassle-free exchange policy from the date of delivery.",
    },
    {
      q: "How do I track my order?",
      a: "As soon as your parcel is dispatched from our Bengaluru workshop, you will receive an SMS and email with live courier tracking details (BlueDart / Delhivery / DTDC).",
    },
    {
      q: "Can I place a bulk order?",
      a: "Yes! We specialize in customized corporate and wedding bulk orders. Visit our Corporate Gifting page or contact us directly for volume tiers starting from 25 units.",
    },
    {
      q: "Do you offer custom packaging?",
      a: "All orders arrive in our signature keepsake gift boxes with unbleached cotton pouches, dried botanicals, and hand-signed artisan cards. Custom wax seals and corporate branding are also available.",
    },
    {
      q: "How can I make a corporate enquiry?",
      a: "You can submit the form on this page, visit our Corporate Gifting section, or email us directly at corporate@hrdyasara.org. We reply within 24 hours.",
    },
  ];

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
        className="px-4 sm:px-6"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: "56px",
            alignItems: "start",
          }}
          className="contact-layout-grid"
        >
          {/* Left Column: Get In Touch + Message Form */}
          <div>
            <div style={{ marginBottom: "36px" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--accent-gold, #8c7355)",
                  marginBottom: "8px",
                  display: "block",
                }}
              >
                Get In Touch
              </span>

              <h1
                className="font-serif"
                style={{
                  fontSize: "clamp(32px, 4vw, 46px)",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  marginBottom: "12px",
                }}
              >
                We&apos;re here to help.
              </h1>

              {/* Contact Meta List */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  marginTop: "24px",
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(140, 115, 85, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent-gold, #8c7355)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <div>
                    <strong style={{ color: "var(--text-primary)" }}>
                      +91 98765 43210
                    </strong>
                    <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>
                      (Mon – Fri, 10 AM – 6 PM)
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(140, 115, 85, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent-gold, #8c7355)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <a
                    href="mailto:hello@hrdyasara.org"
                    style={{
                      color: "var(--text-primary)",
                      textDecoration: "underline",
                    }}
                    className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355]"
                  >
                    hello@hrdyasara.org
                  </a>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(140, 115, 85, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent-gold, #8c7355)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <span>Bengaluru, Karnataka, India</span>
                </div>
              </div>

              {/* Social Channels */}
              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  marginTop: "20px",
                  fontSize: "14px",
                }}
              >
                {["Facebook", "Instagram", "Twitter", "LinkedIn"].map((platform) => (
                  <span
                    key={platform}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "9999px",
                      backgroundColor: "#fff",
                      border: "1px solid var(--border-light)",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>

            {/* Send Us A Message Form */}
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "20px",
                padding: "clamp(20px, 4vw, 32px)",
                border: "1px solid var(--border-light, #e8dfd5)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.03)",
              }}
            >
              <h2
                className="font-serif"
                style={{
                  fontSize: "22px",
                  marginBottom: "20px",
                  color: "var(--text-primary)",
                }}
              >
                Send us a message
              </h2>

              {isSubmitted ? (
                <div
                  style={{
                    padding: "30px 20px",
                    textAlign: "center",
                    backgroundColor: "rgba(39, 174, 96, 0.08)",
                    borderRadius: "12px",
                    border: "1px solid rgba(39, 174, 96, 0.3)",
                  }}
                  role="status"
                >
                  <span style={{ fontSize: "32px", color: "#27ae60" }}>✓</span>
                  <h3
                    className="font-serif"
                    style={{ fontSize: "20px", marginTop: "10px", marginBottom: "6px" }}
                  >
                    Message Sent!
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                    Thank you for reaching out. We will respond within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div style={{ marginBottom: "16px" }}>
                    <label
                      htmlFor="contact-name"
                      style={{
                        display: "block",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                        fontWeight: 500,
                      }}
                    >
                      Name *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      onBlur={() => handleBlur("name")}
                      aria-invalid={!!(touched.name && errors.name)}
                      aria-describedby={touched.name && errors.name ? "name-error" : undefined}
                      placeholder="Your full name"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: touched.name && errors.name ? "1px solid #c0392b" : "1px solid var(--border-light)",
                        backgroundColor: touched.name && errors.name ? "#fffaf9" : "var(--bg-cream)",
                        fontFamily: "inherit",
                        fontSize: "14px",
                        minHeight: "44px",
                      }}
                      className="transition-colors focus:outline-none focus:ring-2 focus:ring-[#8c7355]/30 focus:border-[#8c7355]"
                    />
                    {touched.name && errors.name && (
                      <p id="name-error" role="alert" style={{ fontSize: "12px", color: "#c0392b", marginTop: "4px" }}>
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                      gap: "14px",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <label
                        htmlFor="contact-email"
                        style={{
                          display: "block",
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          marginBottom: "6px",
                          fontWeight: 500,
                        }}
                      >
                        Email *
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        onBlur={() => handleBlur("email")}
                        aria-invalid={!!(touched.email && errors.email)}
                        aria-describedby={touched.email && errors.email ? "email-error" : undefined}
                        placeholder="you@email.com"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: touched.email && errors.email ? "1px solid #c0392b" : "1px solid var(--border-light)",
                          backgroundColor: touched.email && errors.email ? "#fffaf9" : "var(--bg-cream)",
                          fontFamily: "inherit",
                          fontSize: "14px",
                          minHeight: "44px",
                        }}
                        className="transition-colors focus:outline-none focus:ring-2 focus:ring-[#8c7355]/30 focus:border-[#8c7355]"
                      />
                      {touched.email && errors.email && (
                        <p id="email-error" role="alert" style={{ fontSize: "12px", color: "#c0392b", marginTop: "4px" }}>
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="contact-phone"
                        style={{
                          display: "block",
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          marginBottom: "6px",
                          fontWeight: 500,
                        }}
                      >
                        Phone Number *
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        onBlur={() => handleBlur("phone")}
                        aria-invalid={!!(touched.phone && errors.phone)}
                        aria-describedby={touched.phone && errors.phone ? "phone-error" : undefined}
                        placeholder="+91 98765 43210"
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: touched.phone && errors.phone ? "1px solid #c0392b" : "1px solid var(--border-light)",
                          backgroundColor: touched.phone && errors.phone ? "#fffaf9" : "var(--bg-cream)",
                          fontFamily: "inherit",
                          fontSize: "14px",
                          minHeight: "44px",
                        }}
                        className="transition-colors focus:outline-none focus:ring-2 focus:ring-[#8c7355]/30 focus:border-[#8c7355]"
                      />
                      {touched.phone && errors.phone && (
                        <p id="phone-error" role="alert" style={{ fontSize: "12px", color: "#c0392b", marginTop: "4px" }}>
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: "22px" }}>
                    <label
                      htmlFor="contact-message"
                      style={{
                        display: "block",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                        fontWeight: 500,
                      }}
                    >
                      Message *
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      required
                      value={formData.message}
                      onChange={(e) => handleChange("message", e.target.value)}
                      onBlur={() => handleBlur("message")}
                      aria-invalid={!!(touched.message && errors.message)}
                      aria-describedby={touched.message && errors.message ? "message-error" : undefined}
                      placeholder="How can we assist you today?"
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: touched.message && errors.message ? "1px solid #c0392b" : "1px solid var(--border-light)",
                        backgroundColor: touched.message && errors.message ? "#fffaf9" : "var(--bg-cream)",
                        fontFamily: "inherit",
                        fontSize: "14px",
                      }}
                      className="transition-colors focus:outline-none focus:ring-2 focus:ring-[#8c7355]/30 focus:border-[#8c7355]"
                    />
                    {touched.message && errors.message && (
                      <p id="message-error" role="alert" style={{ fontSize: "12px", color: "#c0392b", marginTop: "4px" }}>
                        {errors.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    style={{
                      width: "100%",
                      padding: "14px",
                      backgroundColor: "var(--btn-dark, #2e3830)",
                      color: "#f7f4ee",
                      borderRadius: "9999px",
                      fontWeight: 600,
                      fontSize: "15px",
                      boxShadow: "0 6px 18px rgba(46, 56, 48, 0.2)",
                      minHeight: "44px",
                      cursor: "pointer",
                    }}
                    className="transition-all active:scale-[0.99] hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355]"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Visual Artwork Card + FAQ Accordion */}
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* Visual Card (as in mockup) */}
            <div
              style={{
                position: "relative",
                aspectRatio: "16 / 10",
                borderRadius: "20px",
                overflow: "hidden",
                border: "1px solid var(--border-light)",
                backgroundColor: "#f5f0e8",
                boxShadow: "0 6px 20px rgba(0,0,0,0.04)",
              }}
            >
              <Image
                src="/products/product_tranquil_thoughts.webp"
                alt="Tranquil handcrafted painting"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "cover" }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  right: "16px",
                  backgroundColor: "rgba(255, 255, 255, 0.94)",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                Bengaluru Creative Atelier
              </div>
            </div>

            {/* Frequently Asked Questions Preview */}
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "20px",
                padding: "clamp(20px, 4vw, 28px)",
                border: "1px solid var(--border-light, #e8dfd5)",
                boxShadow: "0 4px 18px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <h2
                  className="font-serif"
                  style={{ fontSize: "22px", color: "var(--text-primary)" }}
                >
                  Frequently Asked Questions
                </h2>
                <Link
                  href="/faq"
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--accent-gold)",
                    textDecoration: "underline",
                  }}
                  className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355]"
                >
                  View All FAQs →
                </Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderBottom:
                        idx === faqs.length - 1
                          ? "none"
                          : "1px solid var(--border-light)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveFaq(activeFaq === idx ? null : idx)
                      }
                      aria-expanded={activeFaq === idx}
                      aria-controls={`contact-faq-answer-${idx}`}
                      id={`contact-faq-btn-${idx}`}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px 0",
                        textAlign: "left",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                      className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355] rounded-xs"
                    >
                      <span style={{ paddingRight: "12px" }}>{faq.q}</span>
                      <span
                        aria-hidden="true"
                        style={{
                          fontSize: "18px",
                          color: "var(--text-muted)",
                          marginLeft: "12px",
                          flexShrink: 0,
                        }}
                      >
                        {activeFaq === idx ? "−" : "+"}
                      </span>
                    </button>

                    {activeFaq === idx && (
                      <div
                        id={`contact-faq-answer-${idx}`}
                        role="region"
                        aria-labelledby={`contact-faq-btn-${idx}`}
                      >
                        <p
                          style={{
                            fontSize: "13px",
                            lineHeight: 1.65,
                            color: "var(--text-secondary)",
                            paddingBottom: "16px",
                          }}
                        >
                          {faq.a}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
      <MobileBottomBar />
    </div>
  );
}
