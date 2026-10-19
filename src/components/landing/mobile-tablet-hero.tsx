"use client";

import Image from "next/image";
import Link from "next/link";

export function MobileTabletHero() {
  return (
    <section className="static-hero-mobile-tablet">
      {/* 1. Hero Image Container with soft gradient fade into cream */}
      <div className="static-hero-image-wrapper">
        <Image
          src="/frames/frame_000298.webp"
          alt="Artisan woman in hand-painted saree seated with lotus painting and crochet creation"
          fill
          priority={true}
          sizes="(max-width: 1024px) 100vw, 800px"
          className="static-hero-img"
        />
        {/* Soft bottom dissolve into background cream */}
        <div className="static-hero-gradient-overlay" aria-hidden="true" />
      </div>

      {/* 2. Text Content & CTA Buttons matching exact design */}
      <div className="static-hero-content">
        <div className="scene-eyebrow">CRAFTED WITH PURPOSE</div>

        <h1 className="static-hero-heading font-serif">
          Art that <br />
          moves hearts.
        </h1>

        <p className="static-hero-description font-sans">
          Handcrafted sarees, paintings and crochet creations made with purpose.
        </p>

        <div className="btn-group static-hero-btn-group">
          <Link href="/shop" className="btn-primary">
            <span>Explore the Collection</span>
            <span>→</span>
          </Link>

          <Link href="/#makers" className="btn-secondary">
            Our Story
          </Link>
        </div>
      </div>
    </section>
  );
}
