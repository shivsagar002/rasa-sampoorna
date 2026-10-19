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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: "", email: "", phone: "", message: "" });
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
                  <span style={{ fontSize: "18px" }}>📞</span>
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
                  <span style={{ fontSize: "18px" }}>✉️</span>
                  <a
                    href="mailto:hello@hrdyasara.org"
                    style={{
                      color: "var(--text-primary)",
                      textDecoration: "underline",
                    }}
                  >
                    hello@hrdyasara.org
                  </a>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "18px" }}>📍</span>
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
                padding: "32px",
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
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                      }}
                    >
                      Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Your full name"
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
                      gridTemplateColumns: "1fr 1fr",
                      gap: "14px",
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
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="you@email.com"
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
                        required
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="+91"
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

                  <div style={{ marginBottom: "22px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                        marginBottom: "6px",
                      }}
                    >
                      Message *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      placeholder="How can we assist you today?"
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
                    }}
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
                padding: "28px",
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
                      }}
                    >
                      <span>{faq.q}</span>
                      <span
                        style={{
                          fontSize: "18px",
                          color: "var(--text-muted)",
                          marginLeft: "12px",
                        }}
                      >
                        {activeFaq === idx ? "−" : "+"}
                      </span>
                    </button>

                    {activeFaq === idx && (
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
