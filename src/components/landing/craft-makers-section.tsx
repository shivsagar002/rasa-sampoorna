"use client";

import Image from "next/image";
import { BotanicalBranch } from "./botanical-decor";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export function CraftMakersSection() {
  return (
    <section id="makers" className="landing-section section-makers">
      <div className="landing-container">
        <div className="makers-layout">
          {/* Visual Side: Artisan Photo Composition */}
          <ScrollReveal direction="left" className="makers-visual-col">
            <div className="makers-collage-wrapper">
              {/* Botanical Accent top-left */}
              <div className="makers-botanical-tl" aria-hidden="true">
                <BotanicalBranch color="rgba(95, 120, 90, 0.45)" />
              </div>

              {/* Main Photo Collage */}
              <div className="makers-main-image-frame">
                <Image
                  src="/landing/artisans_collage_v2.webp"
                  alt="Artisan women and neurodiverse creators handcrafting sarees and paintings at RASA Sampoorna"
                  width={620}
                  height={312}
                  className="makers-collage-img"
                  priority={false}
                />
              </div>

              {/* Botanical Accent bottom-right */}
              <div className="makers-botanical-br" aria-hidden="true">
                <BotanicalBranch color="rgba(95, 120, 90, 0.35)" />
              </div>
            </div>
          </ScrollReveal>

          {/* Narrative Story Side */}
          <ScrollReveal direction="right" className="makers-story-col">
            <span className="editorial-eyebrow">THE PEOPLE BEHIND THE CRAFT</span>

            <h2 className="editorial-headline">
              Talent deserves <br />
              to be seen.
            </h2>

            <p className="editorial-description">
              We create opportunities for women and differently-abled children to
              express their creativity, build skills, and lead more independent
              lives.
            </p>

            <div className="makers-cta-row">
              <a href="#philosophy" className="btn-charcoal">
                <span>Learn More</span>
                <span className="btn-arrow">→</span>
              </a>
            </div>

          </ScrollReveal>

          <ScrollReveal direction="bottom" delay={120} className="makers-followup-col">
            {/* Editorial Quote Card */}
            <div className="makers-quote-card">
              <span className="quote-mark" aria-hidden="true">“</span>
              <p className="quote-text font-serif">
                Every piece carries a story of courage, creativity and hope.
              </p>
              <div className="quote-divider" />
            </div>

            {/* Impact Metrics */}
            <div className="makers-impact-stats">
              <div className="impact-stat-item">
                <div className="impact-stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="impact-stat-label">Women Empowered</div>
              </div>

              <div className="impact-stat-item">
                <div className="impact-stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                </div>
                <div className="impact-stat-label">
                  <span className="impact-stat-label-desktop">Differently-abled Children</span>
                  <span className="impact-stat-label-mobile">Inclusive Growth</span>
                </div>
              </div>

              <div className="impact-stat-item">
                <div className="impact-stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className="impact-stat-label">Artistic Creations</div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
