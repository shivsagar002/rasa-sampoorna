"use client";

import Image from "next/image";
import { useState } from "react";
import { BotanicalBranch } from "./botanical-decor";

interface BenefitItem {
  id: string;
  title: string;
  mobileTitle: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

const BENEFITS: BenefitItem[] = [
  {
    id: "curated",
    title: "Curated gifts & hampers",
    mobileTitle: "Curated hampers",
    icon: ({ className = "w-5 h-5" }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
  },
  {
    id: "packaging",
    title: "Custom packaging & personal notes",
    mobileTitle: "Custom packaging",
    icon: ({ className = "w-5 h-5" }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: "bulk",
    title: "Bulk orders for events & festivals",
    mobileTitle: "Bulk orders",
    icon: ({ className = "w-5 h-5" }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
];

const CAROUSEL_SLIDES = [
  {
    id: "slide-1",
    eyebrow: "BESPOKE PARTNERSHIPS",
    title: "Make every gesture meaningful.",
    description: "Curated packages for your team, clients and special occasions.",
  },
  {
    id: "slide-2",
    eyebrow: "SUSTAINABLE LUXURY",
    title: "Rooted in conscious values.",
    description: "Organic materials, zero-plastic packaging, and hand-loomed textiles.",
  },
  {
    id: "slide-3",
    eyebrow: "COMMUNITY IMPACT",
    title: "100% of proceeds empower lives.",
    description: "Supporting sustainable livelihood for rural women artisans.",
  },
];

export function CorporateGiftingSection() {
  const [activeSlide, setActiveSlide] = useState(0);

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
  };

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
  };

  const currentSlide = CAROUSEL_SLIDES[activeSlide];

  return (
    <section id="corporate-gifting" className="landing-section section-gifting">
      <div className="landing-container">
        <div className="gifting-layout">
          {/* Left Column: Narrative, Benefits & CTA */}
          <div className="gifting-text-col">
            <span className="editorial-eyebrow">CORPORATE GIFTING</span>

            <h2 className="editorial-headline">
              Gifts that <br />
              mean more.
            </h2>

            <p className="editorial-description">
              Thoughtful gifting for teams, clients, celebrations, and special occasions.
            </p>

            <ul className="gifting-benefits-list">
              {BENEFITS.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <li key={benefit.id} className="gifting-benefit-item">
                    <span className="benefit-icon-wrapper" aria-hidden="true">
                      <Icon className="w-4 h-4 text-charcoal" />
                    </span>
                    <span className="benefit-text">
                      <span className="gifting-benefit-desktop">{benefit.title}</span>
                      <span className="gifting-benefit-mobile">{benefit.mobileTitle}</span>
                    </span>
                  </li>
                );
              })}
              <li className="gifting-benefit-item gifting-mobile-benefit">
                <span className="benefit-icon-wrapper" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                  </svg>
                </span>
                <span className="gifting-benefit-mobile">Personal notes</span>
              </li>
            </ul>

            <div className="gifting-cta-row">
              <button
                type="button"
                className="btn-charcoal"
                onClick={() => {
                  // Smoothly scroll up to the existing hero enquiry form or focus
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setTimeout(() => {
                    const el = document.getElementById("corp-company");
                    if (el) el.focus();
                  }, 800);
                }}
              >
                <span>Plan Your Gifting Order</span>
                <span className="btn-arrow">→</span>
              </button>
            </div>
          </div>

          {/* Right Column: Visual Composition with Gift Box & Sliding Card */}
          <div className="gifting-visual-col">
            {/* Primary Large Gift Box Image */}
            <div className="gifting-main-photo-wrapper">
              <Image
                src="/landing/corporate_gift_box_v2.webp"
                alt="Luxury artisan corporate gift box with hand-painted artwork, scented candle, crochet creations, and gratitude note"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 520px"
                className="gifting-photo"
              />
            </div>

            {/* Floating Carousel Card (Matching Reference Design) */}
            <div className="gifting-carousel-card">
              <div className="gifting-card-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6">
                  <polyline points="20 12 20 22 4 22 4 12" />
                  <rect x="2" y="7" width="20" height="5" />
                  <line x1="12" y1="22" x2="12" y2="7" />
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
              </div>

              <h3 className="gifting-card-title font-serif">
                {currentSlide.title}
              </h3>

              <p className="gifting-card-desc font-sans">
                {currentSlide.description}
              </p>

              {/* Botanical Leaf flourish */}
              <div className="gifting-card-botanical" aria-hidden="true">
                <BotanicalBranch color="rgba(70, 95, 100, 0.35)" />
              </div>

              {/* Navigation Arrows */}
              <div className="gifting-card-nav">
                <button
                  type="button"
                  onClick={prevSlide}
                  className="card-nav-arrow"
                  aria-label="Previous gifting package highlight"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="card-nav-arrow"
                  aria-label="Next gifting package highlight"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
