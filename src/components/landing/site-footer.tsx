"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BotanicalBranch } from "./botanical-decor";

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [currentYear, setCurrentYear] = useState<number>(2026);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer id="footer" className="landing-footer">
      <div className="landing-container relative">
        {/* Botanical leaf flourish on bottom-right */}
        <div className="footer-botanical-br" aria-hidden="true">
          <BotanicalBranch color="rgba(140, 115, 85, 0.35)" />
        </div>

        {/* Main Multi-Column Grid */}
        <div className="footer-columns-grid">
          {/* Brand Info Column */}
          <div className="footer-brand-col">
            <Link href="/" className="footer-brand-logo" aria-label="RASA (By Hrdyasara) Home">
              <div className="footer-emblem" aria-hidden="true">
                <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
                  <path
                    d="M20 33C20 33 8 25 8 16.5C8 12.3579 11.3579 9 15.5 9C17.5 9 19.2 10 20 11.5C20.8 10 22.5 9 24.5 9C28.6421 9 32 12.3579 32 16.5C32 25 20 33 20 33Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 12C20 12 17 18 17 22C17 24.5 18.5 26 20 26C21.5 26 23 24.5 23 22C23 18 20 12 20 12Z"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="footer-brand-text">
                <span className="footer-brand-title font-serif">RASA</span>
                <span className="footer-brand-sub font-sans">(BY HRDYASARA)</span>
              </div>
            </Link>

            <p className="footer-tagline font-sans" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Art. Inclusion. Impact. Handcrafted heritage by neurodiverse artisans with dignity and living wages.
            </p>
          </div>

          {/* Shop Column */}
          <div className="footer-nav-col">
            <h4 className="footer-col-heading font-sans">Shop</h4>
            <ul className="footer-link-list">
              <li><Link href="/shop?category=Sarees" className="footer-link">Handcrafted Sarees</Link></li>
              <li><Link href="/shop?category=Paintings" className="footer-link">Lyrical Paintings</Link></li>
              <li><Link href="/shop?category=Crochet" className="footer-link">Artisanal Crochet</Link></li>
              <li><Link href="/shop?category=Hampers" className="footer-link">Curated Hampers</Link></li>
              <li><Link href="/shop" className="footer-link">All 24 Creations</Link></li>
            </ul>
          </div>

          {/* Corporate Gifting Column */}
          <div className="footer-nav-col">
            <h4 className="footer-col-heading font-sans">Corporate Gifting</h4>
            <ul className="footer-link-list">
              <li><Link href="/corporate-gifting" className="footer-link">Curated Packages</Link></li>
              <li><Link href="/corporate-gifting" className="footer-link">Bespoke Branding</Link></li>
              <li><Link href="/contact" className="footer-link">Bulk Inquiries</Link></li>
            </ul>
          </div>

          {/* Quick Links Column */}
          <div className="footer-nav-col">
            <h4 className="footer-col-heading font-sans">Quick Links</h4>
            <ul className="footer-link-list">
              <li><Link href="/#makers" className="footer-link">Our Story &amp; Artisans</Link></li>
              <li><Link href="/faq" className="footer-link">FAQs</Link></li>
              <li><Link href="/contact" className="footer-link">Contact Us</Link></li>
              <li><Link href="/cart" className="footer-link">Your Cart</Link></li>
              <li><Link href="/account" className="footer-link">My Account / Sign In</Link></li>
            </ul>
          </div>

          {/* Stay Connected Column */}
          <div className="footer-newsletter-col">
            <h4 className="footer-col-heading font-sans">Stay Connected</h4>

            {/* Social Icons */}
            <div className="footer-social-row">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="YouTube">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                </svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>

            {/* Newsletter Pill Input */}
            <form onSubmit={handleSubscribe} className="footer-newsletter-form">
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="footer-newsletter-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="footer-newsletter-btn" aria-label="Subscribe to newsletter">
                →
              </button>
            </form>
            {subscribed && (
              <p className="footer-sub-success font-sans">
                Thank you for joining our conscious circle.
              </p>
            )}
          </div>
        </div>

        {/* Bottom Legal Copyright Bar */}
        <div className="footer-bottom-bar">
          <div className="footer-copyright font-sans">
            © {currentYear} RASA Sampoorna (By Hrdyasara). All rights reserved.
          </div>

          <div className="footer-legal-links font-sans">
            <Link href="/privacy-policy" className="footer-legal-link">Privacy Policy</Link>
            <span className="legal-sep">|</span>
            <Link href="/terms-and-conditions" className="footer-legal-link">Terms &amp; Conditions</Link>
            <span className="legal-sep">|</span>
            <Link href="/shipping-policy" className="footer-legal-link">Shipping &amp; Delivery</Link>
            <span className="legal-sep">|</span>
            <Link href="/refund-policy" className="footer-legal-link">Returns &amp; Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
