"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SiteHeader } from "@/components/navigation/site-header";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";
import { SiteFooter } from "@/components/landing/site-footer";
import { PRODUCTS, RELATED_PRODUCTS, Product } from "@/data/products";
import { useShop } from "@/context/shop-context";

interface ProductDetailViewProps {
  slug?: string;
  initialProduct?: Product | null;
}

export function ProductDetailView({ slug: propSlug, initialProduct }: ProductDetailViewProps) {
  const params = useParams();
  const currentSlug = propSlug || (params?.slug as string);

  // Find product by initialProduct, then by slug, or default to first saree
  const product: Product =
    initialProduct ||
    PRODUCTS.find((p) => p.slug === currentSlug) ||
    PRODUCTS[0];

  const { addToCart, isInWishlist, toggleWishlist } = useShop();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeAccordion, setActiveAccordion] = useState<string | null>("details");
  const [isAddedFeedback, setIsAddedFeedback] = useState(false);

  const isWishlisted = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product, quantity, product.size);
    setIsAddedFeedback(true);
    setTimeout(() => setIsAddedFeedback(false), 2400);
  };

  const toggleAccordion = (key: string) => {
    setActiveAccordion(activeAccordion === key ? null : key);
  };

  return (
    <div
      style={{
        backgroundColor: "var(--bg-cream, #f7f4ee)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader solidBackground />

      <main
        style={{
          flex: 1,
          maxWidth: "1320px",
          margin: "0 auto",
          width: "100%",
          padding: "24px 20px 80px",
        }}
      >
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          style={{
            marginBottom: "28px",
            fontSize: "13px",
            color: "var(--text-muted, #8c7d70)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/shop">Shop</Link>
          <span>/</span>
          <Link href={`/shop?cat=${product.category}`}>{product.category}</Link>
          <span>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            {product.name}
          </span>
        </nav>

        {/* Main Product Layout (Gallery Left, Info Right) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)",
            gap: "52px",
            alignItems: "start",
          }}
          className="pdp-main-grid"
        >
          {/* Gallery Section */}
          <div
            style={{
              display: "flex",
              gap: "20px",
            }}
            className="pdp-gallery-container"
          >
            {/* Vertical Thumbnails (Desktop) */}
            <div
              className="pdp-thumbnails-col"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                width: "90px",
                flexShrink: 0,
              }}
            >
              {product.images.map((img, idx) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "3 / 4",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border:
                      selectedImageIndex === idx
                        ? "2px solid var(--btn-dark, #2e3830)"
                        : "1px solid var(--border-light, #e8dfd5)",
                    opacity: selectedImageIndex === idx ? 1 : 0.75,
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    backgroundColor: "#f5f0e8",
                  }}
                >
                  <Image
                    src={img}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    fill
                    sizes="90px"
                    style={{ objectFit: "cover" }}
                  />
                </button>
              ))}
            </div>

            {/* Main Featured Image */}
            <div
              style={{
                flex: 1,
                position: "relative",
                aspectRatio: "3 / 4",
                borderRadius: "20px",
                overflow: "hidden",
                backgroundColor: "#f5f0e8",
                boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
                border: "1px solid var(--border-light, #e8dfd5)",
              }}
              className="pdp-main-image-wrap"
            >
              <Image
                src={product.images[selectedImageIndex] || product.images[0]}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{
                  objectFit: "cover",
                  transition: "transform 0.4s ease",
                }}
              />

              {/* Artisan Badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "16px",
                  backgroundColor: "rgba(255, 255, 255, 0.92)",
                  backdropFilter: "blur(6px)",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--btn-dark)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🌿</span> 100% Hand-Painted Heritage Craft
              </div>
            </div>
          </div>

          {/* Product Details Section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Title & Reviews */}
            <h1
              className="font-serif"
              style={{
                fontSize: "clamp(30px, 3.2vw, 42px)",
                fontWeight: 600,
                color: "var(--text-primary, #2c2621)",
                lineHeight: 1.2,
                marginBottom: "8px",
              }}
            >
              {product.name}
            </h1>

            {/* Rating Stars */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  color: "var(--accent-gold, #8c7355)",
                  fontSize: "15px",
                  display: "flex",
                  gap: "2px",
                }}
              >
                {"★".repeat(5)}
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {product.rating}
              </span>
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                ({product.reviewCount} reviews)
              </span>
            </div>

            {/* Price */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <span
                style={{
                  fontSize: "30px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                ₹{product.price.toLocaleString("en-IN")}
              </span>
              {product.originalPrice && (
                <span
                  style={{
                    fontSize: "18px",
                    color: "var(--text-muted)",
                    textDecoration: "line-through",
                  }}
                >
                  ₹{product.originalPrice.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {/* Description Paragraph */}
            <p
              style={{
                fontSize: "15px",
                lineHeight: 1.65,
                color: "var(--text-secondary)",
                marginBottom: "24px",
              }}
            >
              {product.description}
            </p>

            {/* Specs Summary Pill Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                padding: "16px",
                backgroundColor: "#fff",
                border: "1px solid var(--border-light, #e8dfd5)",
                borderRadius: "12px",
                marginBottom: "28px",
              }}
            >
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  Material
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {product.material}
                </span>
              </div>

              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  Size
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  Free size
                </span>
              </div>

              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  Availability
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#27ae60",
                  }}
                >
                  ● {product.availability}
                </span>
              </div>
            </div>

            {/* Quantity Selector + Add to Cart + Wishlist */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                marginBottom: "28px",
              }}
            >
              {/* Stepper */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#fff",
                  border: "1px solid var(--border-light, #e8dfd5)",
                  borderRadius: "9999px",
                  padding: "4px 8px",
                }}
              >
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    color: "var(--text-primary)",
                  }}
                >
                  −
                </button>
                <span
                  style={{
                    minWidth: "32px",
                    textAlign: "center",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => q + 1)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    color: "var(--text-primary)",
                  }}
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                style={{
                  flex: 1,
                  padding: "14px 28px",
                  backgroundColor: isAddedFeedback
                    ? "var(--accent-gold, #8c7355)"
                    : "var(--btn-dark, #2e3830)",
                  color: "#f7f4ee",
                  fontSize: "15px",
                  fontWeight: 600,
                  borderRadius: "9999px",
                  boxShadow: "0 6px 16px rgba(46, 56, 48, 0.2)",
                  transition: "all 0.25s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isAddedFeedback ? (
                  <>
                    <span>✓</span> Added to Bag
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ width: "18px", height: "18px" }}
                    >
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              {/* Wishlist Button */}
              <button
                type="button"
                aria-label={
                  isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
                onClick={() => toggleWishlist(product.id)}
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "#fff",
                  border: "1px solid var(--border-light, #e8dfd5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: "20px",
                    height: "20px",
                    fill: isWishlisted ? "#b33939" : "none",
                    stroke: isWishlisted ? "#b33939" : "var(--text-primary)",
                    strokeWidth: 1.8,
                  }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            {/* Perks Row (Free shipping, Easy Returns, Secure Payments) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                backgroundColor: "rgba(250, 247, 242, 0.8)",
                border: "1px solid var(--border-light, #e8dfd5)",
                borderRadius: "12px",
                marginBottom: "28px",
                fontSize: "12px",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🚚</span>
                <span>Free Shipping</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>↺</span>
                <span>Easy Returns</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🔒</span>
                <span>Secure Payments</span>
              </div>
            </div>

            {/* Accordion Tabs */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderTop: "1px solid var(--border-light, #e8dfd5)",
              }}
            >
              {/* Accordion 1: Product Details */}
              <div
                style={{
                  borderBottom: "1px solid var(--border-light, #e8dfd5)",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion("details")}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 0",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  <span>Product Details</span>
                  <span style={{ fontSize: "18px" }}>
                    {activeAccordion === "details" ? "−" : "+"}
                  </span>
                </button>
                {activeAccordion === "details" && (
                  <div
                    style={{
                      paddingBottom: "18px",
                      fontSize: "14px",
                      lineHeight: 1.7,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <ul
                      style={{
                        paddingLeft: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {product.detailsList.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Accordion 2: Maker's Note */}
              <div
                style={{
                  borderBottom: "1px solid var(--border-light, #e8dfd5)",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion("maker")}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 0",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  <span>Maker&apos;s Note</span>
                  <span style={{ fontSize: "18px" }}>
                    {activeAccordion === "maker" ? "−" : "+"}
                  </span>
                </button>
                {activeAccordion === "maker" && (
                  <div
                    style={{
                      paddingBottom: "18px",
                      fontSize: "14px",
                      lineHeight: 1.7,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <p style={{ fontStyle: "italic", marginBottom: "10px" }}>
                      &ldquo;{product.makerNote}&rdquo;
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--accent-gold)" }}>
                      100% of proceeds fund art therapy, assistive tools, and fair
                      wages for our artisan collective.
                    </p>
                  </div>
                )}
              </div>

              {/* Accordion 3: Shipping & Returns */}
              <div
                style={{
                  borderBottom: "1px solid var(--border-light, #e8dfd5)",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion("shipping")}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 0",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  <span>Shipping & Returns</span>
                  <span style={{ fontSize: "18px" }}>
                    {activeAccordion === "shipping" ? "−" : "+"}
                  </span>
                </button>
                {activeAccordion === "shipping" && (
                  <div
                    style={{
                      paddingBottom: "18px",
                      fontSize: "14px",
                      lineHeight: 1.7,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <p>{product.shippingNote}</p>
                    <p style={{ marginTop: "8px", fontSize: "13px" }}>
                      Each creation is carefully inspected, packed, and packaged in
                      sustainable unbleached cotton and mulberry paper before dispatch.
                    </p>
                    <div style={{ marginTop: "12px", display: "flex", gap: "16px", fontSize: "13px" }}>
                      <Link href="/shipping-policy" style={{ color: "var(--accent-gold)", textDecoration: "underline" }}>
                        Shipping Policy →
                      </Link>
                      <Link href="/refund-policy" style={{ color: "var(--accent-gold)", textDecoration: "underline" }}>
                        Return &amp; Refund Policy →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Same-Category Suggested Products Section */}
        <section style={{ marginTop: "80px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "28px",
            }}
          >
            <h2
              className="font-serif"
              style={{
                fontSize: "clamp(24px, 3vw, 32px)",
                color: "var(--text-primary)",
              }}
            >
              More in {product.category}
            </h2>
            <Link
              href={`/shop?cat=${product.category}`}
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--accent-gold)",
              }}
            >
              View All {product.category} →
            </Link>
          </div>

          <div className="related-products-grid">
            {(PRODUCTS.filter(
              (p) => p.category === product.category && p.id !== product.id
            ).slice(0, 4)).map((item) => (
              <Link
                key={item.id}
                href={`/shop/${item.slug}`}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: "1px solid var(--border-light, #e8dfd5)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                }}
                className="related-product-card"
              >
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    backgroundColor: "#f5f0e8",
                  }}
                >
                  <Image
                    src={item.images[0]}
                    alt={item.name}
                    fill
                    sizes="240px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      color: "var(--accent-gold, #8c7355)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "4px",
                    }}
                  >
                    {item.tag}
                  </span>
                  <h3
                    className="font-serif"
                    style={{
                      fontSize: "17px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: "6px",
                    }}
                  >
                    {item.name}
                  </h3>
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    ₹{item.price.toLocaleString("en-IN")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
      <MobileBottomBar />
    </div>
  );
}
