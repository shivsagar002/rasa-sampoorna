"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

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
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {/* SECTION F1 — OUR STORY / BRAND PHILOSOPHY */}
      <section id="philosophy" className="landing-section section-story">
        <div className="landing-container">
          <div className="philosophy-layout">
            <div className="philosophy-collage">
              <div className="philosophy-collage-main">
                <Image
                  src="/landing/philosophy_gallery_v3.webp"
                  alt="Artisan in a hand-painted saree at the RASA Sampoorna atelier"
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 90vw, 800px"
                  className="philosophy-photo"
                />
              </div>
              <div className="philosophy-collage-stack">
                <div className="philosophy-collage-tile">
                  <Image
                    src="/products/product_bloom_bag_v2.webp"
                    alt="Handmade crochet Bloom Bag"
                    fill
                    sizes="180px"
                    className="philosophy-photo"
                  />
                </div>
                <div className="philosophy-collage-tile">
                  <Image
                    src="/landing/collection_crochet_v2.webp"
                    alt="Handcrafted crochet detail by RASA Sampoorna artisans"
                    fill
                    sizes="180px"
                    className="philosophy-photo"
                  />
                </div>
              </div>
            </div>

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
          </div>
        </div>
      </section>

      {/* SECTION F2 — FAQs & CONTACT */}
      <section id="faqs" className="landing-section section-faq">
        <div className="landing-container">
          <div className="faq-contact-grid">
            <div className="faq-column">
              <span className="editorial-eyebrow">FAQ</span>
              <h3 className="faq-main-title font-serif">Quick answers to your questions.</h3>

              <div className="faq-accordion-list">
                {FAQS.map((faq) => {
                  const isOpen = openFaq === faq.id;

                  return (
                    <div
                      key={faq.id}
                      className={`faq-accordion-item${isOpen ? " is-open" : ""}`}
                      onMouseEnter={() => setOpenFaq(faq.id)}
                      onMouseLeave={() => setOpenFaq(null)}
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(faq.id)}
                        className="faq-accordion-header"
                        aria-expanded={isOpen}
                      >
                        <span className="faq-question-text">{faq.question}</span>
                        <span className="faq-toggle-icon" aria-hidden="true">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>

                      <div className="faq-accordion-body">
                        <p className="faq-answer-text">{faq.answer}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="contact-column" id="contact">
              <div className="faq-contact-photo">
                <Image
                  src="/landing/faq_contact_portrait.jpg"
                  alt="An artisan from RASA Sampoorna, here to help with your questions"
                  fill
                  sizes="(max-width: 768px) 100vw, 420px"
                  className="faq-contact-image"
                />
              </div>
            </div>
          </div>
      </div>
    </section>
    </>
  );
}
