"use client";

import Image from "next/image";

export function FinalCtaSection() {
  return (
    <section id="final-cta" className="landing-section section-final-cta">
      <div className="landing-container">
        <div className="final-cta-banner">
          {/* Left Visual: Premium Gift Photograph */}
          <div className="final-cta-visual">
            <Image
              src="/landing/cta_banner_gift_v2.webp"
              alt="Handcrafted artisan gift package wrapped with satin ribbon and dried botanicals"
              fill
              sizes="(max-width: 768px) 100vw, 420px"
              className="final-cta-photo"
            />
          </div>

          {/* Right Content: Headline, Description & 2 Action Buttons */}
          <div className="final-cta-content">
            <h2 className="final-cta-headline font-serif">
              Find your next <br className="hidden-mobile" />
              meaningful gift.
            </h2>

            <p className="final-cta-description font-sans">
              Shop the collection or create a gifting experience for your business.
            </p>

            <div className="final-cta-buttons">
              <a href="#featured-products" className="btn-charcoal">
                <span>Shop the Collection</span>
                <span className="btn-arrow">→</span>
              </a>

              <button
                type="button"
                className="btn-outline-charcoal"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setTimeout(() => {
                    const el = document.getElementById("corp-company");
                    if (el) el.focus();
                  }, 800);
                }}
              >
                Create a Gifting Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
