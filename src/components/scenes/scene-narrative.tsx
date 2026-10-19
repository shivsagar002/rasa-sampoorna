"use client";

import { useState } from "react";
import { MinimalEnquiryForm } from "./minimal-enquiry-form";
import { CorporateEnquiryModal } from "./corporate-enquiry-modal";

interface SceneNarrativeProps {
  scrollProgress: number;
}

export function SceneNarrative({ scrollProgress }: SceneNarrativeProps) {
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);

  // SCENE 1: Hero (scroll 0.0 to 0.22) - Positioned on LEFT
  const getScene1Style = () => {
    let opacity = 1;
    let translateY = 0;

    if (scrollProgress <= 0.16) {
      translateY = -scrollProgress * 80;
      opacity = 1;
    } else if (scrollProgress > 0.16 && scrollProgress <= 0.24) {
      const progress = (scrollProgress - 0.16) / 0.08;
      opacity = 1 - progress;
      translateY = -0.16 * 80 - 25 * progress;
    } else {
      opacity = 0;
      translateY = -40;
    }

    return {
      opacity: Math.max(0, Math.min(1, opacity)),
      transform: `translateY(calc(-50% + ${translateY}px))`,
      pointerEvents: (opacity > 0.3 ? "auto" : "none") as "auto" | "none",
    };
  };

  // SCENE 2: Artisan Women - SHIFTED forward in scroll effect (scroll 0.30 to 0.54)
  const getScene2Style = () => {
    let opacity = 0;
    let translateY = 25;

    if (scrollProgress >= 0.30 && scrollProgress <= 0.54) {
      if (scrollProgress < 0.36) {
        const progress = (scrollProgress - 0.30) / 0.06;
        opacity = progress;
        translateY = 20 * (1 - progress);
      } else if (scrollProgress > 0.48) {
        const progress = (scrollProgress - 0.48) / 0.06;
        opacity = 1 - progress;
        translateY = -20 * progress;
      } else {
        const activeProgress = (scrollProgress - 0.36) / (0.48 - 0.36);
        opacity = 1;
        translateY = -12 * activeProgress;
      }
    }

    return {
      opacity: Math.max(0, Math.min(1, opacity)),
      transform: `translateY(calc(-50% + ${translateY}px))`,
      pointerEvents: (opacity > 0.3 ? "auto" : "none") as "auto" | "none",
    };
  };

  // SCENE 3: Children's Painting - SHIFTED after camera settles (scroll 0.58 to 0.84)
  const getScene3Style = () => {
    let opacity = 0;
    let translateY = 25;

    if (scrollProgress >= 0.58 && scrollProgress <= 0.84) {
      if (scrollProgress < 0.64) {
        const progress = (scrollProgress - 0.58) / 0.06;
        opacity = progress;
        translateY = 20 * (1 - progress);
      } else if (scrollProgress > 0.78) {
        const progress = (scrollProgress - 0.78) / 0.06;
        opacity = 1 - progress;
        translateY = -20 * progress;
      } else {
        const activeProgress = (scrollProgress - 0.64) / (0.78 - 0.64);
        opacity = 1;
        translateY = -12 * activeProgress;
      }
    }

    return {
      opacity: Math.max(0, Math.min(1, opacity)),
      transform: `translateY(calc(-50% + ${translateY}px))`,
      pointerEvents: (opacity > 0.3 ? "auto" : "none") as "auto" | "none",
    };
  };

  // SCENE 4: Corporate Gifting (scroll 0.86 to 1.0) - Vertically balanced, slightly shifted up
  const getScene4Style = () => {
    let opacity = 0;
    let translateY = 14;

    if (scrollProgress >= 0.86) {
      if (scrollProgress < 0.92) {
        const progress = (scrollProgress - 0.86) / 0.06;
        opacity = progress;
        translateY = 14 * (1 - progress);
      } else {
        const activeProgress = (scrollProgress - 0.92) / 0.08;
        opacity = 1;
        translateY = -4 * activeProgress;
      }
    }

    return {
      opacity: Math.max(0, Math.min(1, opacity)),
      transform: `translateY(calc(-50% + ${translateY}px))`,
      pointerEvents: (opacity > 0.3 ? "auto" : "none") as "auto" | "none",
    };
  };

  // BOTTOM DOCK BAR: Desktop only, strictly sticks to bottom with 0px translateY during Scene 1
  const getBottomBarStyle = () => {
    let opacity = 1;
    let translateY = 0;

    if (scrollProgress <= 0.16) {
      opacity = 1;
      translateY = 0;
    } else if (scrollProgress > 0.16 && scrollProgress <= 0.24) {
      const progress = (scrollProgress - 0.16) / 0.08;
      opacity = Math.max(0, 1 - progress);
      translateY = progress * 60;
    } else {
      opacity = 0;
      translateY = 60;
    }

    return {
      opacity,
      transform: `translateY(${translateY}px)`,
      pointerEvents: (opacity > 0.3 ? "auto" : "none") as "auto" | "none",
    };
  };

  const scene1 = getScene1Style();
  const scene2 = getScene2Style();
  const scene3 = getScene3Style();
  const scene4 = getScene4Style();
  const bottomBarStyle = getBottomBarStyle();

  return (
    <>
      <div className="narrative-container">
        {/* Narrative Text Content Area */}
        <div className="narrative-content-area">
          {/* SCENE 1: Hero Scene - LEFT */}
          <div className="scene-block scene-left" style={scene1}>
            <div className="scene-eyebrow">CRAFTED WITH PURPOSE</div>

            <h1 className="scene-heading">
              Art that <br />
              moves hearts.
            </h1>

            <p className="scene-description">
              Handcrafted sarees, paintings and crochet creations <br />
              by the women and differently-abled children <br />
              of RASA Sampoorna (By Hrdyasara).
            </p>

            <div className="btn-group">
              <button type="button" className="btn-primary">
                <span>Explore the Collection</span>
                <span>→</span>
              </button>

              <button type="button" className="btn-secondary">
                Our Story
              </button>
            </div>
          </div>

          {/* SCENE 2: Artisan Women Weaving Dignity - RIGHT (clean wall) */}
          <div className="scene-block scene-right" style={scene2}>
            <div className="scene-eyebrow">EMPOWERING ARTISAN WOMEN</div>

            <h2 className="scene-heading">
              Hands that <br />
              weave dignity.
            </h2>

            <p className="scene-description">
              Every stitch fosters independence. Over 150 rural women artisans find sustainable livelihoods through traditional crochet and heritage textile arts.
            </p>

            <div className="btn-group">
              <button type="button" className="btn-primary">
                <span>Discover Their Journey</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* SCENE 3: Inclusive Children's Painting - RIGHT (clean wall while child paints on left) */}
          <div className="scene-block scene-right" style={scene3}>
            <div className="scene-eyebrow">INCLUSIVE CREATIVITY</div>

            <h2 className="scene-heading">
              Colors of pure, <br />
              innocent joy.
            </h2>

            <p className="scene-description">
              Our differently-abled children express their world through vibrant botanical brushstrokes, inspiring the floral motifs that grace our handcrafted collections.
            </p>

            <div className="btn-group">
              <button type="button" className="btn-primary">
                <span>Meet the Young Artists</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* SCENE 4: Corporate Gifting LEFT - Minimal Matching Enquiry Form */}
          <div className="scene-block scene-left corporate-enquiry-minimal" style={scene4}>
            <MinimalEnquiryForm />
          </div>

          {/* SCENE 4: Corporate Gifting RIGHT - Perfectly aligned with equal top & bottom spacing */}
          <div className="scene-block scene-right corporate-narrative-block" style={scene4}>
            <div className="scene-eyebrow" style={{ marginBottom: "10px" }}>CONSCIOUS CORPORATE GIFTING</div>

            <h2 className="scene-heading" style={{ fontSize: "clamp(2.35rem, 3.1vw, 2.85rem)", lineHeight: 1.1, marginBottom: "12px" }}>
              Gifts with <br />
              enduring purpose.
            </h2>

            <p className="scene-description" style={{ fontSize: "0.88rem", lineHeight: 1.55, marginBottom: "20px" }}>
              Celebrate meaningful partnerships with bespoke artisan gift hampers, organic scented candles, and handcrafted keepsakes that empower rural women and differently-abled children.
            </p>

            <div className="btn-group">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsEnquiryOpen(true)}
              >
                <span>Explore</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Category Bar (Strictly sticks to bottom, Desktop only) */}
        <div className="bottom-category-bar desktop-only-dock" style={bottomBarStyle}>
          <div className="category-bar-inner">
            {/* 1. Sarees */}
            <div className="category-card">
              <div className="category-icon-wrapper">
                <svg viewBox="0 0 32 32" fill="none" style={{ width: "100%", height: "100%", stroke: "currentColor" }} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4C8 10 7 20 8 28H24C25 20 23 12 18 4L12 4Z" />
                  <path d="M15 8C13 14 13 22 14 28" />
                  <path d="M18 12C16 17 17 24 18 28" />
                </svg>
              </div>
              <div className="category-info">
                <span className="category-name">Sarees</span>
                <span className="category-sub">
                  <span>Wearable art. Timeless beauty.</span>
                  <span className="category-arrow">→</span>
                </span>
              </div>
            </div>

            {/* 2. Paintings */}
            <div className="category-card">
              <div className="category-icon-wrapper">
                <svg viewBox="0 0 32 32" fill="none" style={{ width: "100%", height: "100%", stroke: "currentColor" }} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 5C10 5 6 9.5 6 15C6 20.5 10 27 16 27C18.5 27 20 25.5 20 24C20 22.8 19.2 21.8 19.2 20.6C19.2 19.2 20.4 18 21.8 18H23.5C26.5 18 29 15.5 29 12.5C29 8.5 23.2 5 16 5Z" />
                  <circle cx="11" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="16" cy="10" r="1.5" fill="currentColor" />
                  <circle cx="21" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="18" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <div className="category-info">
                <span className="category-name">Paintings</span>
                <span className="category-sub">
                  <span>Original art. Unique stories.</span>
                  <span className="category-arrow">→</span>
                </span>
              </div>
            </div>

            {/* 3. Crochet */}
            <div className="category-card">
              <div className="category-icon-wrapper">
                <svg viewBox="0 0 32 32" fill="none" style={{ width: "100%", height: "100%", stroke: "currentColor" }} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="16" cy="16" r="4" />
                  <path d="M16 6C14 6 13 8 13 10C13 12 16 12 16 12C16 12 19 12 19 10C19 8 18 6 16 6Z" />
                  <path d="M16 26C14 26 13 24 13 22C13 20 16 20 16 20C16 20 19 20 19 22C19 24 18 26 16 26Z" />
                  <path d="M6 16C6 14 8 13 10 13C12 13 12 16 12 16C12 16 12 19 10 19C8 19 6 18 6 16Z" />
                  <path d="M26 16C26 14 24 13 22 13C20 13 20 16 20 16C20 16 20 19 22 19C24 19 26 18 26 16Z" />
                </svg>
              </div>
              <div className="category-info">
                <span className="category-name">Crochet</span>
                <span className="category-sub">
                  <span>Handmade with heart.</span>
                  <span className="category-arrow">→</span>
                </span>
              </div>
            </div>

            {/* 4. Corporate Gifting */}
            <div className="category-card">
              <div className="category-icon-wrapper">
                <svg viewBox="0 0 32 32" fill="none" style={{ width: "100%", height: "100%", stroke: "currentColor" }} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="14" width="22" height="13" rx="1.5" />
                  <rect x="3" y="9" width="26" height="5" rx="1" />
                  <line x1="16" y1="9" x2="16" y2="27" />
                  <path d="M16 9C14 6 10 5 10 7C10 9 16 9 16 9Z" />
                  <path d="M16 9C18 6 22 5 22 7C22 9 16 9 16 9Z" />
                </svg>
              </div>
              <div className="category-info">
                <span className="category-name">Corporate Gifting</span>
                <span className="category-sub">
                  <span>Thoughtful gifts. Greater impact.</span>
                  <span className="category-arrow">→</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Luxury Corporate Gifting Concierge Modal */}
      <CorporateEnquiryModal
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
      />
    </>
  );
}
