"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface CollectionItem {
  id: string;
  name: string;
  description: string;
  image: string;
  href: string;
}

const COLLECTIONS: CollectionItem[] = [
  {
    id: "sarees",
    name: "Sarees",
    description: "Wearable art & hand-painted textiles",
    image: "/landing/collection_sarees_v2.webp",
    href: "#featured-products",
  },
  {
    id: "paintings",
    name: "Paintings",
    description: "Original artwork & expressive creations",
    image: "/landing/collection_paintings_v2.webp",
    href: "#featured-products",
  },
  {
    id: "crochet",
    name: "Crochet",
    description: "Handmade accessories & gifts",
    image: "/landing/collection_crochet_v2.webp",
    href: "#featured-products",
  },
];

const AUTOPLAY_MS = 3000;

export function CollectionsSection() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % COLLECTIONS.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <section id="collections" className="landing-section section-collections">
      <div className="landing-container">
        <div className="collections-layout">
          <div
            className="collections-carousel"
            aria-roledescription="carousel"
            aria-label="Our collections"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <div className="collections-carousel-stage">
              <div
                className="collections-carousel-track"
                style={{ transform: `translateX(-${index * 100}%)` }}
              >
                {COLLECTIONS.map((item, itemIndex) => (
                  <a
                    key={item.id}
                    href={item.href}
                    className="collection-card group"
                    id={`collection-card-${item.id}`}
                    aria-hidden={itemIndex !== index}
                  >
                    <div className="collection-image-wrapper">
                      <Image
                        src={item.image}
                        alt={`${item.name} collection by RASA Sampoorna artisans`}
                        fill
                        sizes="100vw"
                        className="collection-image"
                      />
                    </div>
                  </a>
                ))}
              </div>

              <div className="collections-hero-copy">
                <span className="editorial-eyebrow">OUR COLLECTIONS</span>
                <h2 className="editorial-headline">
                  Discover the art <br />
                  of making
                </h2>
              </div>
            </div>

            <div className="collections-slide-copy">
              <h3 className="collection-card-title">{COLLECTIONS[index].name}</h3>
              <p className="collection-card-desc">{COLLECTIONS[index].description}</p>
              <a href={COLLECTIONS[index].href} className="collection-explore-link">
                <span>Explore</span>
                <span className="link-arrow">→</span>
              </a>
              <p className="editorial-description">
                Timeless pieces, thoughtfully created by our talented artisans.
              </p>
              <a href="#featured-products" className="editorial-link">
                <span>View All Collections</span>
                <span className="link-arrow">→</span>
              </a>
            </div>

            <div className="collections-carousel-dots">
              {COLLECTIONS.map((item, itemIndex) => (
                <button
                  key={item.id}
                  type="button"
                  className={itemIndex === index ? "is-active" : ""}
                  aria-label={`Show ${item.name}`}
                  aria-current={itemIndex === index ? "true" : undefined}
                  onClick={() => setIndex(itemIndex)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
