"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BotanicalBranch } from "./botanical-decor";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    id: "shipping",
    question: "Shipping & Delivery",
    answer: "We ship all across India with sustainable, plastic-free packaging. Standard domestic shipping typically takes 4–7 business days. Express delivery is available upon request for corporate orders.",
  },
  {
    id: "returns",
    question: "Returns & Exchanges",
    answer: "Each handcrafted piece is unique and made with tremendous care. If an item arrives damaged or differs from what was ordered, please notify us within 48 hours for a replacement or store credit.",
  },
  {
    id: "payment",
    question: "Payment Options",
    answer: "We accept all major credit and debit cards, UPI, net banking, and corporate wire transfers for bulk gifting hampers.",
  },
  {
    id: "care",
    question: "Product Care",
    answer: "Dry clean only for hand-painted silk and tussar sarees. Crochet creations can be gently spot cleaned with cold water and mild eco-friendly detergent.",
  },
  {
    id: "corporate",
    question: "Corporate Orders",
    answer: "We specialize in bespoke corporate hampers with custom branding, wax seals, organic scented candles, and personalized notes for quantities from 25 to 500+ units.",
  },
  {
    id: "general",
    question: "General Enquiries",
    answer: "Feel free to reach out to our team at hello@hrdyasara.org for collaborations, artist workshops, or tailored order assistance.",
  },
];

export function BrandPhilosophySection() {
  const [openFaq, setOpenFaq] = useState<string | null>("shipping");

  const toggleFaq = (id: string) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {/* SECTION F1 — OUR STORY / BRAND PHILOSOPHY */}
      <section id="philosophy" className="landing-section section-story">
        <div className="landing-container">
          <div className="philosophy-layout">
            <div className="philosophy-text-col">
              <span className="editorial-eyebrow">OUR STORY</span>
              <h2 className="editorial-headline">
                A little more <br />
                than a purchase.
              </h2>
              <p className="editorial-description">
                When creativity finds opportunity, beautiful things happen. Art,
                inclusion, and community come together to create a brighter future.
              </p>
              <Link href="/contact" className="editorial-link">
                <span>Learn More About RASA Sampoorna</span>
                <span className="link-arrow">→</span>
              </Link>
            </div>

            <div className="philosophy-image-col">
              <div className="philosophy-image-frame">
                <Image
                  src="/landing/philosophy_gallery_v3.webp"
                  alt="Artisan woman in hand-painted saree admiring framed artwork at RASA Sampoorna atelier gallery"
                  fill
                  unoptimized={true}
                  sizes="(max-width: 768px) 100vw, 680px"
                  className="philosophy-photo"
                />
                <div className="philosophy-botanical" aria-hidden="true">
                  <BotanicalBranch color="rgba(120, 100, 80, 0.35)" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION F2 — FAQs & CONTACT */}
      <section id="faqs" className="landing-section section-faq">
        <div className="landing-container">
          <div className="faq-contact-grid">
            {/* FAQ Column */}
            <div className="faq-column">
              <span className="editorial-eyebrow">FAQ</span>
              <h3 className="faq-main-title font-serif">Quick answers to your questions.</h3>

            <div className="faq-accordion-list">
              {FAQS.map((faq) => {
                const isOpen = openFaq === faq.id;

                return (
                  <div key={faq.id} className="faq-accordion-item">
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      className="faq-accordion-header"
                      aria-expanded={isOpen}
                    >
                      <span className="faq-question-text">{faq.question}</span>
                      <span className="faq-toggle-icon">{isOpen ? "−" : "+"}</span>
                    </button>

                    {isOpen && (
                      <div className="faq-accordion-body">
                        <p className="faq-answer-text">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Us Column */}
          <div className="contact-column" id="contact">
            <div className="contact-card">
              <span className="editorial-eyebrow">CONTACT US</span>
              <h3 className="contact-card-title font-serif">We&apos;re here to help.</h3>

              <div className="contact-info-list font-sans">
                {/* Phone */}
                <div className="contact-item">
                  <div className="contact-item-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div>
                    <div className="contact-primary-text">+91 98765 43210</div>
                    <div className="contact-sub-text">Mon – Fri, 10 AM – 6 PM</div>
                  </div>
                </div>

                {/* Email */}
                <div className="contact-item">
                  <div className="contact-item-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div>
                    <div className="contact-primary-text">hello@hrdyasara.org</div>
                  </div>
                </div>

                {/* Location */}
                <div className="contact-item">
                  <div className="contact-item-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <div className="contact-primary-text">Bengaluru, Karnataka, India</div>
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              <div className="contact-social-row">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="RASA (by HrdyaSara) Instagram">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="RASA (by HrdyaSara) Facebook">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="RASA (by HrdyaSara) YouTube">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                  </svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="RASA (by HrdyaSara) LinkedIn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
              </div>

              <button
                type="button"
                className="btn-charcoal w-full text-center justify-center"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setTimeout(() => {
                    const el = document.getElementById("corp-company");
                    if (el) el.focus();
                  }, 800);
                }}
              >
                <span>Send us a message</span>
                <span className="btn-arrow">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
