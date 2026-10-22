"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";
import { SiteFooter } from "@/components/landing/site-footer";

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_DATA: Record<string, FAQItem[]> = {
  General: [
    {
      q: "What makes RASA Sampoorna creations unique?",
      a: "Every creation at RASA Sampoorna (By Hrdyasara) is a one-of-a-kind original work of art. Our sarees, lyrical paintings, crochet items, and gift hampers are created by women from disadvantaged backgrounds and neurodivergent artisans who have trained in traditional hand-painting techniques. No two pieces are ever identical.",
    },
    {
      q: "Where are your workshops located?",
      a: "Our primary creative center and artisan studio is located in Bengaluru, Karnataka, with affiliated rural artisan clusters in Tumakuru and Ramanagara.",
    },
    {
      q: "How does my purchase support the artisans?",
      a: "100% of proceeds go back into providing sustainable living wages, dignified employment, healthcare stipends, assistive technologies, and holistic creative rehabilitation for our artisans.",
    },
    {
      q: "Can I visit the workshop or meet the artists?",
      a: "Yes! We welcome visitors by prior appointment at our Bengaluru studio on Tuesdays and Thursdays. Please drop us an email at care@rasasampoorna.com.",
    },
  ],
  "Shipping & Delivery": [
    {
      q: "What are your shipping charges across India?",
      a: "We offer complimentary standard shipping on all orders above ₹1,999 across all serviceable pin codes in India. For orders below ₹1,999, a flat shipping fee of ₹99 applies. Review our comprehensive Shipping Policy for transit details.",
    },
    {
      q: "How long does standard delivery take?",
      a: "Orders are typically dispatched within 24 to 48 hours. Metro delivery takes 2 to 4 business days, while non-metro and regional deliveries take 4 to 7 business days.",
    },
    {
      q: "Do you ship internationally?",
      a: "Yes, we ship to over 40 countries including the United States, United Kingdom, Canada, UAE, Singapore, and Australia. International shipping is calculated at checkout based on weight and destination.",
    },
    {
      q: "How will I know when my parcel has shipped?",
      a: "You will receive an automated tracking notification via WhatsApp, SMS, and email with the courier tracking URL as soon as the package is handed over to our logistics partners (BlueDart / DHL / Delhivery).",
    },
  ],
  "Returns & Exchanges": [
    {
      q: "What is your return and exchange policy?",
      a: "We offer a 7-day hassle-free replacement and refund policy for transit damage or defects. Please check our Returns & Refund Policy for full eligibility details.",
    },
    {
      q: "How do I initiate an exchange or return?",
      a: "Simply email care@rasasampoorna.com or WhatsApp +91 98765 43210 with your order ID and a photo of the item. Our support team will confirm pickup within 24 hours.",
    },
    {
      q: "Are customized corporate gifts eligible for return?",
      a: "Bespoke orders with custom logos or personalized artwork are non-returnable unless received in a damaged condition.",
    },
  ],
  "Payment Options": [
    {
      q: "What payment methods do you accept?",
      a: "We accept all major payment methods including UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards (Visa, Mastercard, RuPay, Amex), Net Banking across 50+ Indian banks, and Cash on Delivery (COD).",
    },
    {
      q: "Is it safe to pay online on RASA Sampoorna?",
      a: "Absolutely. All transactions are processed through 256-bit SSL encrypted payment gateways complying with PCI-DSS Level 1 compliance. We do not store your card or bank credentials.",
    },
    {
      q: "Is Cash on Delivery (COD) available everywhere?",
      a: "COD is available across most major pincodes in India for orders up to ₹15,000.",
    },
  ],
  "Corporate Orders": [
    {
      q: "What is the minimum order quantity for corporate gifting?",
      a: "Our curated gift boxes can be ordered in batches starting from 25 units. For custom branding, packaging sleeves, and personalized greeting cards, the minimum order is 50 units.",
    },
    {
      q: "Can you deliver directly to multiple employee addresses?",
      a: "Yes! We offer pan-India multi-address drop-shipping. Simply share your employee address sheet and we will handle all individual dispatches, tracking, and delivery notifications.",
    },
    {
      q: "What is the lead time for large festive orders?",
      a: "For orders between 50 to 500 units, we recommend placing your enquiry 2 to 3 weeks in advance to ensure our artisans have adequate time to handcraft and hand-paint each item with care.",
    },
    {
      q: "Can we request a sample hamper before ordering in bulk?",
      a: "Yes, sample boxes can be ordered directly through our Corporate Gifting page or by writing to corporate@hrdyasara.org. The sample cost is adjusted against your bulk order total.",
    },
  ],
};

export default function FAQPage() {
  const categories = Object.keys(FAQ_DATA);
  const [activeCategory, setActiveCategory] = useState<string>("General");
  const [activeQuestion, setActiveQuestion] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");

  const currentQuestions = FAQ_DATA[activeCategory] || [];

  // Filter if user searched
  const filteredList = searchQuery.trim()
    ? Object.entries(FAQ_DATA).flatMap(([cat, items]) =>
        items
          .filter(
            (item) =>
              item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.a.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((item) => ({ ...item, category: cat }))
      )
    : null;

  return (
    <div
      style={{
        backgroundColor: "var(--bg-cream, #f7f4ee)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <SiteHeader solidBackground />

      <main
        style={{
          flex: 1,
          maxWidth: "1280px",
          margin: "0 auto",
          width: "100%",
          padding: "40px 20px 80px",
          position: "relative",
        }}
      >
        {/* Botanical Background Watercolor Element */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            width: "280px",
            height: "280px",
            opacity: 0.28,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <Image
            src="/images/botanical_decor_leaves.jpg"
            alt="Botanical Leaf Decor"
            fill
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Header Block */}
        <div
          style={{
            textAlign: "center",
            maxWidth: "680px",
            margin: "0 auto 48px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <h1
            className="font-serif"
            style={{
              fontSize: "clamp(34px, 4.5vw, 52px)",
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: "14px",
              lineHeight: 1.15,
            }}
          >
            Frequently Asked Questions
          </h1>
          <p
            style={{
              fontSize: "16px",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            Find answers to common questions about our products, shipping,
            artisan collective, and corporate gifting.
          </p>

          {/* Search Bar */}
          <div
            style={{
              marginTop: "28px",
              position: "relative",
              maxWidth: "520px",
              margin: "28px auto 0",
            }}
          >
            <input
              type="text"
              aria-label="Search frequently asked questions"
              placeholder="Search for answers (e.g. shipping, returns, fabric)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 20px 14px 44px",
                borderRadius: "9999px",
                border: "1px solid var(--border-light, #e8dfd5)",
                backgroundColor: "#fff",
                fontFamily: "inherit",
                fontSize: "14px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                minHeight: "44px",
              }}
              className="transition-all focus:outline-none focus:ring-2 focus:ring-[#8c7355]/30 focus:border-[#8c7355]"
            />
            <svg
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
              fill="none"
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "18px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "18px",
                height: "18px",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  fontSize: "14px",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
                className="hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#8c7355]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content Layout: Categories Left + Accordions Right */}
        {filteredList ? (
          /* Search Results View */
          <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 1 }}>
            <p style={{ marginBottom: "20px", color: "var(--text-muted)", fontSize: "14px" }}>
              Showing {filteredList.length} results for &ldquo;{searchQuery}&rdquo;:
            </p>
            {filteredList.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  backgroundColor: "#fff",
                  borderRadius: "16px",
                  border: "1px solid var(--border-light)",
                }}
              >
                <p style={{ fontSize: "16px", color: "var(--text-secondary)" }}>
                  No answers found for that query.
                </p>
                <Link
                  href="/contact"
                  style={{
                    display: "inline-block",
                    marginTop: "14px",
                    color: "var(--accent-gold)",
                    fontWeight: 600,
                    textDecoration: "underline",
                  }}
                >
                  Contact our support team directly →
                </Link>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "20px",
                  padding: "24px 32px",
                  border: "1px solid var(--border-light)",
                }}
              >
                {filteredList.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderBottom:
                        idx === filteredList.length - 1
                          ? "none"
                          : "1px solid var(--border-light)",
                      padding: "16px 0",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "var(--accent-gold)",
                        marginBottom: "4px",
                      }}
                    >
                      {item.category}
                    </span>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
                      {item.q}
                    </h3>
                    <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Standard Categorized View (Matching Mockup) */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "240px 1fr",
              gap: "48px",
              alignItems: "start",
              position: "relative",
              zIndex: 1,
            }}
            className="faq-layout-grid"
          >
            {/* Desktop Category Nav Sidebar */}
            <aside
              className="faq-sidebar"
              style={{
                backgroundColor: "#fff",
                borderRadius: "18px",
                border: "1px solid var(--border-light, #e8dfd5)",
                padding: "16px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
                position: "sticky",
                top: "100px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={activeCategory === cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setActiveQuestion(0);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      fontSize: "14px",
                      fontWeight: activeCategory === cat ? 600 : 500,
                      backgroundColor:
                        activeCategory === cat
                          ? "var(--btn-dark, #2e3830)"
                          : "transparent",
                      color:
                        activeCategory === cat
                          ? "#f7f4ee"
                          : "var(--text-primary, #2c2621)",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355]"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </aside>

            {/* Mobile Category Chips (as shown in mobile mockup) */}
            <div
              className="faq-mobile-chips"
              style={{
                display: "none",
                overflowX: "auto",
                gap: "8px",
                paddingBottom: "12px",
                marginBottom: "20px",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={activeCategory === cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setActiveQuestion(0);
                  }}
                  style={{
                    whiteSpace: "nowrap",
                    padding: "8px 16px",
                    borderRadius: "9999px",
                    fontSize: "13px",
                    fontWeight: activeCategory === cat ? 600 : 500,
                    backgroundColor:
                      activeCategory === cat ? "var(--btn-dark)" : "#fff",
                    color: activeCategory === cat ? "#f7f4ee" : "var(--text-primary)",
                    border: "1px solid var(--border-light)",
                    cursor: "pointer",
                  }}
                  className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355]"
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Accordion Questions List */}
            <section
              style={{
                backgroundColor: "#fff",
                borderRadius: "20px",
                padding: "clamp(20px, 4vw, 36px)",
                border: "1px solid var(--border-light, #e8dfd5)",
                boxShadow: "0 6px 24px rgba(0,0,0,0.03)",
              }}
            >
              <h2
                className="font-serif"
                style={{
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "20px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--border-light)",
                }}
              >
                {activeCategory} Questions
              </h2>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {currentQuestions.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderBottom:
                        idx === currentQuestions.length - 1
                          ? "none"
                          : "1px solid var(--border-light)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveQuestion(activeQuestion === idx ? null : idx)
                      }
                      aria-expanded={activeQuestion === idx}
                      aria-controls={`faq-answer-${idx}`}
                      id={`faq-btn-${idx}`}
                      style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "18px 0",
                        textAlign: "left",
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                      className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8c7355] rounded-xs"
                    >
                      <span style={{ paddingRight: "16px" }}>{item.q}</span>
                      <span
                        aria-hidden="true"
                        style={{
                          fontSize: "20px",
                          color: "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        {activeQuestion === idx ? "−" : "+"}
                      </span>
                    </button>

                    {activeQuestion === idx && (
                      <div
                        id={`faq-answer-${idx}`}
                        role="region"
                        aria-labelledby={`faq-btn-${idx}`}
                      >
                        <p
                          style={{
                            fontSize: "14px",
                            lineHeight: 1.7,
                            color: "var(--text-secondary)",
                            paddingBottom: "20px",
                          }}
                        >
                          {item.a}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Still Have Questions CTA */}
        <section
          style={{
            marginTop: "64px",
            textAlign: "center",
            padding: "48px 24px",
            backgroundColor: "#FAF7F2",
            borderRadius: "24px",
            border: "1px solid var(--border-light)",
          }}
        >
          <h3
            className="font-serif"
            style={{ fontSize: "28px", color: "var(--text-primary)", marginBottom: "8px" }}
          >
            Still have questions?
          </h3>
          <p
            style={{
              fontSize: "15px",
              color: "var(--text-secondary)",
              maxWidth: "500px",
              margin: "0 auto 24px",
            }}
          >
            We are always here to assist you with custom orders, sizing advice, or gift curation.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "14px" }}>
            <Link
              href="/contact"
              style={{
                padding: "12px 28px",
                backgroundColor: "var(--btn-dark, #2e3830)",
                color: "#f7f4ee",
                borderRadius: "9999px",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Contact Support
            </Link>
            <Link
              href="/corporate-gifting"
              style={{
                padding: "12px 28px",
                backgroundColor: "#fff",
                border: "1px solid var(--border-light)",
                borderRadius: "9999px",
                fontWeight: 600,
                fontSize: "14px",
                color: "var(--text-primary)",
              }}
            >
              Corporate Enquiries
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
      <MobileBottomBar />
    </div>
  );
}
