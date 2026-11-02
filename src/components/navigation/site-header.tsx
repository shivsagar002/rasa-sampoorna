"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShop } from "@/context/shop-context";

interface SiteHeaderProps {
  solidBackground?: boolean;
}

export function SiteHeader({ solidBackground = false }: SiteHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentHash, setCurrentHash] = useState("");
  const pathname = usePathname();
  const { cartCount, wishlist } = useShop();
  const hamburgerBtnRef = useRef<HTMLButtonElement>(null);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    hamburgerBtnRef.current?.focus();
  };

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const updateHash = () => setCurrentHash(window.location.hash);

    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen || isSearchOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen, isSearchOpen]);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Our Story", href: "/#makers" },
    { label: "Corporate Gifting", href: "/corporate-gifting" },
    { label: "Contact", href: "/contact" },
    { label: "FAQ", href: "/faq" },
  ];

  const isNavLinkActive = (href: string) => {
    if (href.includes("#")) {
      const [path, hash] = href.split("#");
      return pathname === path && currentHash === `#${hash}`;
    }

    if (href === "/") {
      return pathname === "/" && currentHash !== "#makers";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>

      <header
        className={`site-header ${
          isScrolled || solidBackground ? "is-scrolled" : ""
        }`}
        style={
          solidBackground
            ? {
                backgroundColor: "rgba(247, 244, 238, 0.98)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid var(--border-light, #e8dfd5)",
              }
            : undefined
        }
      >
        <div className="header-container">
          {/* Brand Logo: RASA (By Hrdyasara) */}
          <Link
            href="/"
            className="brand-logo"
            aria-label="RASA (By Hrdyasara) Home"
          >
            <div className="brand-emblem">
              <svg
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: "100%", height: "100%", stroke: "currentColor" }}
              >
                <path
                  d="M20 33C20 33 8 25 8 16.5C8 12.3579 11.3579 9 15.5 9C17.5 9 19.2 10 20 11.5C20.8 10 22.5 9 24.5 9C28.6421 9 32 12.3579 32 16.5C32 25 20 33 20 33Z"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 12C20 12 17 18 17 22C17 24.5 18.5 26 20 26C21.5 26 23 24.5 23 22C23 18 20 12 20 12Z"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13 23C15 25 18 26.5 20 26.5C22 26.5 25 25 27 23"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="brand-text-block">
              <span className="brand-title">RASA</span>
              <span className="brand-subtitle">(BY HRDYASARA)</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="nav-links" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = isNavLinkActive(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`nav-link ${isActive ? "is-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Icon Actions */}
          <div className="header-actions">
            {/* Search Trigger */}
            <button
              type="button"
              aria-label="Search Catalog"
              className="action-btn"
              onClick={() => setIsSearchOpen(true)}
            >
              <svg
                className="action-icon"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            {/* Wishlist Link */}
            <Link
              href="/shop"
              aria-label={`Wishlist (${wishlist.length} saved)`}
              className="action-btn wishlist-action"
              style={{ position: "relative" }}
              title="Saved to Wishlist"
            >
              <svg
                className="action-icon"
                viewBox="0 0 24 24"
                fill={wishlist.length > 0 ? "var(--btn-dark)" : "none"}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {wishlist.length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    right: "3px",
                    width: "7px",
                    height: "7px",
                    backgroundColor: "var(--accent-gold, #8c7355)",
                    borderRadius: "50%",
                    pointerEvents: "none",
                  }}
                />
              )}
            </Link>

            {/* Shopping Bag / Cart */}
            <Link
              href="/cart"
              aria-label={`Shopping Bag (${cartCount} items)`}
              className="action-btn cart-action"
              style={{ position: "relative" }}
            >
              <svg
                className="action-icon"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {cartCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    backgroundColor: "var(--btn-dark, #2e3830)",
                    color: "#f7f4ee",
                    fontSize: "10px",
                    fontWeight: 700,
                    borderRadius: "9999px",
                    minWidth: "16px",
                    height: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 2px",
                  }}
                >
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Account */}
            <Link
              href="/account"
              aria-label="User Account"
              className="action-btn account-action"
            >
              <svg
                className="action-icon"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>

            {/* Hamburger Button (Mobile / Tablet) */}
            <button
              ref={hamburgerBtnRef}
              type="button"
              aria-label={isMobileMenuOpen ? "Close Menu" : "Open Menu"}
              aria-expanded={isMobileMenuOpen}
              className="action-btn hamburger-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <svg
                  className="action-icon"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  className="action-icon"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Calculated height spacer so content NEVER starts below the fixed navbar */}
      <div className="site-header-spacer" aria-hidden="true" />

      {/* Mobile Slide-Out Drawer */}
      <div
        className={`mobile-nav-drawer ${isMobileMenuOpen ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
      >
        <div className="mobile-drawer-backdrop" onClick={closeMobileMenu} />
        <div className="mobile-drawer-panel">
          <div className="mobile-drawer-header">
            <div className="brand-text-block">
              <span className="brand-title">RASA</span>
              <span className="brand-subtitle">(BY HRDYASARA)</span>
            </div>
            <button
              type="button"
              className="drawer-close-btn"
              aria-label="Close Menu"
              onClick={closeMobileMenu}
            >
              ✕
            </button>
          </div>

          <nav className="mobile-drawer-shortcuts" aria-label="Your account">
            <Link
              href="/shop"
              className="mobile-drawer-shortcut"
              aria-label={`Wishlist, ${wishlist.length} saved`}
              onClick={closeMobileMenu}
            >
              <span className="mobile-drawer-shortcut-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {wishlist.length > 0 && <span className="mobile-drawer-shortcut-badge" />}
              </span>
              <span>Wishlist</span>
            </Link>
            <Link
              href="/cart"
              className="mobile-drawer-shortcut"
              aria-label={`Cart, ${cartCount} items`}
              onClick={closeMobileMenu}
            >
              <span className="mobile-drawer-shortcut-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {cartCount > 0 && (
                  <span className="mobile-drawer-shortcut-badge">{cartCount}</span>
                )}
              </span>
              <span>Cart</span>
            </Link>
            <Link
              href="/account"
              className="mobile-drawer-shortcut"
              aria-label="Account"
              onClick={closeMobileMenu}
            >
              <span className="mobile-drawer-shortcut-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span>Account</span>
            </Link>
          </nav>

          <nav className="mobile-drawer-nav">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`mobile-nav-link ${isNavLinkActive(link.href) ? "is-active" : ""}`}
                aria-current={isNavLinkActive(link.href) ? "page" : undefined}
                onClick={closeMobileMenu}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mobile-drawer-footer">
            <p className="mobile-drawer-tagline font-serif">
              RASA Sampoorna
            </p>
            <p className="mobile-drawer-contact font-sans" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Art. Inclusion. Impact.
            </p>
            <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <Link href="/privacy-policy" onClick={closeMobileMenu} style={{ textDecoration: "underline" }}>Privacy</Link>
              <span>•</span>
              <Link href="/terms-and-conditions" onClick={closeMobileMenu} style={{ textDecoration: "underline" }}>Terms</Link>
              <span>•</span>
              <Link href="/shipping-policy" onClick={closeMobileMenu} style={{ textDecoration: "underline" }}>Shipping</Link>
              <span>•</span>
              <Link href="/refund-policy" onClick={closeMobileMenu} style={{ textDecoration: "underline" }}>Returns</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Search Overlay Modal */}
      {isSearchOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "rgba(44, 38, 33, 0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "80px",
          }}
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            style={{
              backgroundColor: "var(--bg-cream, #f7f4ee)",
              borderRadius: "16px",
              padding: "24px",
              width: "90%",
              maxWidth: "600px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              border: "1px solid var(--border-light, #e8dfd5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h3 className="font-serif" style={{ fontSize: "20px" }}>
                Search Creations
              </h3>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                style={{ fontSize: "18px", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderBottom: "2px solid var(--btn-dark)",
                paddingBottom: "8px",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                style={{ width: "20px", height: "20px", color: "var(--text-muted)" }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search sarees, paintings, crochet, gifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "16px",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ marginTop: "16px" }}>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Popular Searches
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {["Lotus Bloom Saree", "Silk Sarees", "Corporate Hampers", "Paintings"].map(
                  (term) => (
                    <Link
                      key={term}
                      href={`/shop?q=${encodeURIComponent(term)}`}
                      onClick={() => setIsSearchOpen(false)}
                      style={{
                        padding: "6px 14px",
                        backgroundColor: "#fff",
                        border: "1px solid var(--border-light)",
                        borderRadius: "9999px",
                        fontSize: "13px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {term}
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
