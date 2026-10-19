"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";
import { SiteFooter } from "@/components/landing/site-footer";
import { PRODUCTS, Product } from "@/data/products";
import { useShop } from "@/context/shop-context";

export default function ShopPage() {
  const { toggleWishlist, isInWishlist, addToCart } = useShop();

  // Filter & sorting states
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [maxPrice, setMaxPrice] = useState<number>(20000);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [quickAddedId, setQuickAddedId] = useState<string | null>(null);

  const categoriesList = ["All", "Sarees", "Paintings", "Crochet", "Hampers"];
  const materialsList = ["Silk", "Cotton", "Wool", "Canvas", "Brass", "Mixed"];

  // Sync category from URL parameter without blocking SSR/prerender
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("cat");
      if (cat && ["Sarees", "Paintings", "Crochet", "Hampers"].includes(cat)) {
        setSelectedCategory(cat);
      }
    }
  }, []);

  const handleMaterialToggle = (material: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(material)
        ? prev.filter((m) => m !== material)
        : [...prev, material]
    );
  };

  // Filter logic
  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      // Category match
      if (selectedCategory && selectedCategory !== "All" && p.category !== selectedCategory) {
        return false;
      }
      // Price match
      if (p.price > maxPrice) {
        return false;
      }
      // Material match
      if (selectedMaterials.length > 0) {
        const matchesMaterial = selectedMaterials.some((mat) =>
          p.material.toLowerCase().includes(mat.toLowerCase())
        );
        if (!matchesMaterial) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0; // Newest / default
    });
  }, [selectedCategory, maxPrice, selectedMaterials, sortBy]);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    setQuickAddedId(product.id);
    setTimeout(() => setQuickAddedId(null), 1800);
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
      {/* Universal Luxury Header */}
      <SiteHeader solidBackground />

      <main
        style={{
          flex: 1,
          maxWidth: "1380px",
          margin: "0 auto",
          width: "100%",
          padding: "32px 20px 80px",
        }}
      >
        {/* Page Header */}
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h1
                className="font-serif"
                style={{
                  fontSize: "clamp(32px, 4vw, 46px)",
                  fontWeight: 500,
                  color: "var(--text-primary, #2c2621)",
                  lineHeight: 1.15,
                }}
              >
                {selectedCategory === "All" ? "All Creations" : selectedCategory}
              </h1>
              <p
                style={{
                  color: "var(--text-muted, #8c7d70)",
                  fontSize: "15px",
                  marginTop: "6px",
                  letterSpacing: "0.02em",
                }}
              >
                Hand-painted. Handcrafted. Heartfelt.
              </p>
            </div>

            {/* Desktop Sort & Count */}
            <div
              className="desktop-sort-bar"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                }}
              >
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid var(--border-light, #e8dfd5)",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>

              <span
                style={{
                  fontSize: "14px",
                  color: "var(--text-muted)",
                }}
              >
                {filteredProducts.length} Products
              </span>
            </div>
          </div>

          {/* Mobile Filter & Sort Bar (as shown in mobile mockup) */}
          <div
            className="mobile-filter-bar"
            style={{
              marginTop: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: "#fff",
                border: "1px solid var(--border-light, #e8dfd5)",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
                fill="none"
                style={{ width: "16px", height: "16px" }}
              >
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              <span>Filters</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  backgroundColor: "#fff",
                  border: "1px solid var(--border-light, #e8dfd5)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                }}
              >
                <option value="newest">Sort: Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>

              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {filteredProducts.length} items
              </span>
            </div>
          </div>
        </div>

        {/* Layout Grid: Sidebar + Product Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            gap: "36px",
            alignItems: "start",
          }}
          className="shop-main-layout"
        >
          {/* Desktop Filter Sidebar */}
          <aside
            className="desktop-filter-sidebar"
            style={{
              backgroundColor: "rgba(250, 247, 242, 0.7)",
              border: "1px solid var(--border-light, #e8dfd5)",
              borderRadius: "16px",
              padding: "24px 20px",
              position: "sticky",
              top: "100px",
            }}
          >
            {/* Category Filter */}
            <div style={{ marginBottom: "28px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-primary)",
                  marginBottom: "14px",
                }}
              >
                Categories
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {categoriesList.map((cat) => (
                  <label
                    key={cat}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "14px",
                      color:
                        selectedCategory === cat
                          ? "var(--btn-dark)"
                          : "var(--text-secondary)",
                      cursor: "pointer",
                      fontWeight: selectedCategory === cat ? 600 : 400,
                    }}
                  >
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === cat}
                      onChange={() => setSelectedCategory(cat)}
                      style={{ accentColor: "var(--btn-dark)" }}
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range Slider */}
            <div style={{ marginBottom: "28px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-primary)",
                  }}
                >
                  Price Range
                </h3>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--accent-gold)",
                  }}
                >
                  ₹0 - ₹{maxPrice.toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: "var(--btn-dark)",
                  cursor: "pointer",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                <span>₹0</span>
                <span>₹15,000</span>
              </div>
            </div>

            {/* Availability */}
            <div style={{ marginBottom: "28px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-primary)",
                  marginBottom: "12px",
                }}
              >
                Availability
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    style={{ accentColor: "var(--btn-dark)" }}
                  />
                  <span>In Stock</span>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "14px",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    style={{ accentColor: "var(--btn-dark)" }}
                  />
                  <span>Out of Stock</span>
                </label>
              </div>
            </div>

            {/* Material */}
            <div style={{ marginBottom: "28px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-primary)",
                  marginBottom: "12px",
                }}
              >
                Material
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {materialsList.map((mat) => (
                  <label
                    key={mat}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "14px",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMaterials.includes(mat)}
                      onChange={() => handleMaterialToggle(mat)}
                      style={{ accentColor: "var(--btn-dark)" }}
                    />
                    <span>{mat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-primary)",
                  marginBottom: "12px",
                }}
              >
                Size
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {["One Size", "S", "M", "L", "XL"].map((sz, idx) => (
                  <button
                    key={sz}
                    type="button"
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      border:
                        idx === 0
                          ? "1.5px solid var(--btn-dark)"
                          : "1px solid var(--border-light)",
                      backgroundColor: idx === 0 ? "var(--btn-dark)" : "#fff",
                      color: idx === 0 ? "#f7f4ee" : "var(--text-secondary)",
                      fontWeight: idx === 0 ? 600 : 400,
                    }}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <section>
            {filteredProducts.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  backgroundColor: "#fff",
                  borderRadius: "16px",
                  border: "1px solid var(--border-light)",
                }}
              >
                <p className="font-serif" style={{ fontSize: "22px" }}>
                  No creations match your selected filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("Sarees");
                    setMaxPrice(15000);
                    setSelectedMaterials([]);
                  }}
                  style={{
                    marginTop: "16px",
                    padding: "10px 20px",
                    backgroundColor: "var(--btn-dark)",
                    color: "#f7f4ee",
                    borderRadius: "9999px",
                    fontSize: "14px",
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="shop-product-grid">
                {filteredProducts.map((product) => {
                  const wishlisted = isInWishlist(product.id);
                  const isQuickAdded = quickAddedId === product.id;

                  return (
                    <div
                      key={product.id}
                      className="product-card"
                      style={{
                        backgroundColor: "#fff",
                        borderRadius: "16px",
                        overflow: "hidden",
                        border: "1px solid var(--border-light, #e8dfd5)",
                        transition: "transform 0.25s ease, box-shadow 0.25s ease",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {/* Image Frame */}
                      <div
                        style={{
                          position: "relative",
                          aspectRatio: "3 / 4",
                          backgroundColor: "#f2ece4",
                          overflow: "hidden",
                        }}
                      >
                        <Link href={`/shop/${product.slug}`}>
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 33vw"
                            style={{
                              objectFit: "cover",
                              transition: "transform 0.4s ease",
                            }}
                            className="product-img-hover"
                          />
                        </Link>

                        {/* Wishlist Button */}
                        <button
                          type="button"
                          aria-label={`Save ${product.name} to wishlist`}
                          onClick={() => toggleWishlist(product.id)}
                          style={{
                            position: "absolute",
                            top: "12px",
                            right: "12px",
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            backdropFilter: "blur(4px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            style={{
                              width: "18px",
                              height: "18px",
                              fill: wishlisted ? "#b33939" : "none",
                              stroke: wishlisted ? "#b33939" : "var(--text-primary)",
                              strokeWidth: 1.8,
                            }}
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        </button>

                        {/* Quick Add Overlay on Hover */}
                        <div
                          className="quick-add-overlay"
                          style={{
                            position: "absolute",
                            bottom: "12px",
                            left: "12px",
                            right: "12px",
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleQuickAdd(e, product)}
                            style={{
                              flex: 1,
                              padding: "10px",
                              backgroundColor: isQuickAdded
                                ? "var(--accent-gold, #8c7355)"
                                : "var(--btn-dark, #2e3830)",
                              color: "#f7f4ee",
                              fontSize: "13px",
                              fontWeight: 600,
                              borderRadius: "9999px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              transition: "all 0.2s ease",
                            }}
                          >
                            {isQuickAdded ? "✓ Added to Cart" : "Quick Add"}
                          </button>
                        </div>
                      </div>

                      {/* Content Block */}
                      <div
                        style={{
                          padding: "16px 18px 20px",
                          display: "flex",
                          flexDirection: "column",
                          flex: 1,
                        }}
                      >
                        <Link href={`/shop/${product.slug}`}>
                          <h3
                            className="font-serif"
                            style={{
                              fontSize: "19px",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              marginBottom: "4px",
                            }}
                          >
                            {product.name}
                          </h3>
                        </Link>

                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            marginBottom: "12px",
                            letterSpacing: "0.01em",
                          }}
                        >
                          {product.tag}
                        </p>

                        <div
                          style={{
                            marginTop: "auto",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "17px",
                              fontWeight: 700,
                              color: "var(--text-primary)",
                            }}
                          >
                            ₹{product.price.toLocaleString("en-IN")}
                          </span>

                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--accent-gold)",
                              fontWeight: 600,
                            }}
                          >
                            ★ {product.rating} ({product.reviewCount})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Mobile Filters Slide-in Bottom Sheet */}
      {isMobileFilterOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(44, 38, 33, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div
            style={{
              backgroundColor: "var(--bg-cream, #f7f4ee)",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
              padding: "24px",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                paddingBottom: "12px",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <h3 className="font-serif" style={{ fontSize: "22px" }}>
                Filter Creations
              </h3>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                style={{ fontSize: "18px", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Mobile Categories */}
            <div style={{ marginBottom: "20px" }}>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: "8px",
                }}
              >
                Category
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "9999px",
                      fontSize: "14px",
                      backgroundColor:
                        selectedCategory === cat ? "var(--btn-dark)" : "#fff",
                      color: selectedCategory === cat ? "#f7f4ee" : "var(--text-primary)",
                      border: "1px solid var(--border-light)",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Price */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                  Max Price: ₹{maxPrice.toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="15000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--btn-dark)" }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("Sarees");
                  setMaxPrice(15000);
                  setSelectedMaterials([]);
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "1px solid var(--border-light)",
                  borderRadius: "9999px",
                  fontSize: "14px",
                  backgroundColor: "#fff",
                }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                style={{
                  flex: 2,
                  padding: "12px",
                  backgroundColor: "var(--btn-dark)",
                  color: "#f7f4ee",
                  borderRadius: "9999px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Apply Filters ({filteredProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Footer */}
      <SiteFooter />

      {/* Mobile Sticky Bottom Bar */}
      <MobileBottomBar />
    </div>
  );
}
