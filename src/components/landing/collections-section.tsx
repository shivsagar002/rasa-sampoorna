"use client";

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

export function CollectionsSection() {
  return (
    <section id="collections" className="landing-section section-collections">
      <div className="landing-container">
        <div className="collections-layout">
          {/* Left Intro Text Column */}
          <div className="collections-intro">
            <span className="editorial-eyebrow">OUR COLLECTIONS</span>
            <h2 className="editorial-headline">
              Discover the art <br className="hidden-mobile" />
              of making
            </h2>
            <p className="editorial-description">
              Timeless pieces, thoughtfully created by our talented artisans.
            </p>
            <a href="#featured-products" className="editorial-link">
              <span>View All Collections</span>
              <span className="link-arrow">→</span>
            </a>
          </div>

          {/* Right 3-Card Grid */}
          <div className="collections-grid">
            {COLLECTIONS.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="collection-card group"
                id={`collection-card-${item.id}`}
              >
                <div className="collection-image-wrapper">
                  <Image
                    src={item.image}
                    alt={`${item.name} collection by RASA Sampoorna artisans`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 280px"
                    className="collection-image"
                  />
                  {/* Subtle wishlist / bookmark pill */}
                  <div className="collection-card-pill" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                </div>

                <div className="collection-card-body">
                  <h3 className="collection-card-title">{item.name}</h3>
                  <p className="collection-card-desc">{item.description}</p>
                  <span className="collection-explore-link">
                    <span>Explore</span>
                    <span className="link-arrow">→</span>
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
