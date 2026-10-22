"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export function FinalCtaSection() {
  const [ctaContent, setCtaContent] = useState({
    title: "Find your next meaningful gift.",
    subtitle: "Shop the collection or create a gifting experience for your business.",
    primaryButtonLabel: "Shop the Collection",
    primaryButtonLink: "/shop",
    secondaryButtonLabel: "Create a Gifting Order",
    secondaryButtonLink: "/corporate-gifting",
    isVisible: true,
  });

  useEffect(() => {
    let isMounted = true;
    fetch("/api/v1/cms/homepage")
      .then((r) => r.json())
      .then((res) => {
        if (isMounted && res.data?.finalCta) {
          setCtaContent((prev) => ({ ...prev, ...res.data.finalCta }));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  if (!ctaContent.isVisible) return null;

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
              {ctaContent.title}
            </h2>

            <p className="final-cta-description font-sans">
              {ctaContent.subtitle}
            </p>

            <div className="final-cta-buttons">
              <Link href={ctaContent.primaryButtonLink || "/shop"} className="btn-charcoal">
                <span>{ctaContent.primaryButtonLabel}</span>
                <span className="btn-arrow">→</span>
              </Link>

              <Link
                href={ctaContent.secondaryButtonLink || "/corporate-gifting"}
                className="btn-outline-charcoal"
              >
                {ctaContent.secondaryButtonLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
