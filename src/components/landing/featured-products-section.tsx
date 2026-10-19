"use client";

import Image from "next/image";
import { useState } from "react";

interface ProductItem {
  id: string;
  name: string;
  material: string;
  badge?: string;
  priceFormatted: string;
  image: string;
}

const FEATURED_PRODUCTS: ProductItem[] = [
  {
    id: "lotus-bloom-saree",
    name: "Lotus Bloom Saree",
    material: "Hand-painted silk",
    badge: "One of a kind",
    priceFormatted: "₹ 12,500",
    image: "/products/product_lotus_saree_v2.webp",
  },
  {
    id: "tranquil-thoughts",
    name: "Tranquil Thoughts",
    material: "Original painting",
    badge: "Canvas",
    priceFormatted: "₹ 8,500",
    image: "/products/product_tranquil_thoughts_v2.webp",
  },
  {
    id: "bloom-bag",
    name: "Bloom Bag",
    material: "Handmade crochet",
    badge: "Cotton",
    priceFormatted: "₹ 2,800",
    image: "/products/product_bloom_bag_v2.webp",
  },
  {
    id: "floral-bouquet",
    name: "Floral Bouquet",
    material: "Handmade crochet",
    badge: "Cotton",
    priceFormatted: "₹ 1,200",
    image: "/products/product_floral_bouquet_v2.webp",
  },
];

export function FeaturedProductsSection() {
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlist((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section id="featured-products" className="landing-section section-products">
      <div className="landing-container">
        {/* Header Row */}
        <div className="products-header">
          <div className="products-header-text">
            <span className="editorial-eyebrow">FEATURED PRODUCTS</span>
            <h2 className="editorial-headline">
              Handpicked <br className="hidden-mobile" />
              just for you.
            </h2>
            <p className="editorial-description">Unique pieces. Limited stock.</p>
          </div>

          <div className="products-header-link">
            <a href="#featured-products" className="editorial-link">
              <span>View All Products</span>
              <span className="link-arrow">→</span>
            </a>
          </div>
        </div>

        {/* 4-Column Product Grid */}
        <div className="products-grid">
          {FEATURED_PRODUCTS.map((product) => {
            const isWishlisted = Boolean(wishlist[product.id]);

            return (
              <div key={product.id} className="product-card group" id={`product-${product.id}`}>
                {/* Product Image Frame */}
                <div className="product-image-container">
                  <Image
                    src={product.image}
                    alt={`${product.name} handcrafted by RASA Sampoorna artisans`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 280px"
                    className="product-image"
                  />

                  {/* Wishlist Heart Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleWishlist(product.id, e)}
                    className={`product-wishlist-btn ${isWishlisted ? "is-active" : ""}`}
                    aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill={isWishlisted ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="w-4 h-4 text-charcoal"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>

                {/* Product Details */}
                <div className="product-details">
                  <h3 className="product-name font-serif">{product.name}</h3>

                  <div className="product-meta font-sans">
                    <span>{product.material}</span>
                    {product.badge && (
                      <>
                        <span className="meta-sep">|</span>
                        <span>{product.badge}</span>
                      </>
                    )}
                  </div>

                  <div className="product-price-row">
                    <span className="product-price font-sans">{product.priceFormatted}</span>

                    {/* Quick Add / Bag Icon Button */}
                    <button
                      type="button"
                      className="product-bag-btn"
                      aria-label={`Enquire or buy ${product.name}`}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        setTimeout(() => {
                          const el = document.getElementById("corp-company");
                          if (el) el.focus();
                        }, 800);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile View All Products Button */}
        <div className="products-footer-cta">
          <a href="#featured-products" className="btn-secondary-pill">
            <span>View All Products</span>
            <span className="btn-arrow">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
