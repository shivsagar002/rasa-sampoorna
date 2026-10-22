"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface PromoPopupData {
  enabled: boolean;
  message: string;
  linkText?: string;
  linkUrl?: string;
  imageUrl?: string;
  showPopup: boolean;
  popupTitle?: string;
  popupDescription?: string;
}

export function PromoOfferPopup() {
  const [popupData, setPopupData] = useState<PromoPopupData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Never show popup in admin routes
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
      return;
    }

    let isMounted = true;
    fetch("/api/v1/cms/homepage")
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        const strip = json.data?.content?.promoStrip || json.data?.promoStrip;
        if (strip && (strip.isEnabled ?? strip.enabled) && strip.showPopup !== false) {
          const data: PromoPopupData = {
            enabled: Boolean(strip.isEnabled ?? strip.enabled),
            message: strip.message || "Special Festive Handloom Offer",
            linkText: strip.linkText || "Explore Collection",
            linkUrl: strip.linkUrl || "/shop",
            imageUrl: strip.imageUrl || "/products/saree-lotus-main.jpg",
            showPopup: Boolean(strip.showPopup !== false),
            popupTitle: strip.popupTitle || "Exclusive Handloom Collection",
            popupDescription:
              strip.popupDescription ||
              strip.message ||
              "Pure handwoven mulberry and Kanjivaram silks, direct from master weaving clusters.",
          };

          setPopupData(data);

          // Check if previously dismissed in this browser session
          const dismissed = sessionStorage.getItem("rasa_offer_popup_dismissed");
          if (!dismissed) {
            // Slight delay so the page loads smoothly first
            const timer = setTimeout(() => {
              if (isMounted) setIsOpen(true);
            }, 600);
            return () => clearTimeout(timer);
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem("rasa_offer_popup_dismissed", "true");
    } catch {
      // sessionStorage unavailable
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", onKeyDown);
    }
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  if (!isOpen || !popupData || (typeof window !== "undefined" && window.location.pathname.startsWith("/admin"))) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Promotional Offer"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(44, 38, 33, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
    >
      <div
        style={{
          position: "relative",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          maxWidth: "460px",
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--border-light, #e8dfd5)",
          animation: "popupFadeIn 0.25s ease-out",
        }}
      >
        {/* Prominent Dismiss Cross Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close promotional offer"
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            color: "#2c2621",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
            zIndex: 10,
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
        >
          ✕
        </button>

        {/* Offer Banner Image */}
        {popupData.imageUrl && (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "220px",
              backgroundColor: "#f7f4ee",
            }}
          >
            <Image
              src={popupData.imageUrl}
              alt={popupData.popupTitle || "Promotional Offer"}
              fill
              style={{ objectFit: "cover" }}
              priority
              unoptimized={popupData.imageUrl.startsWith("http")}
            />
            {/* Subtle Gradient Overly at Bottom of Image */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "40px",
                background: "linear-gradient(to top, rgba(0,0,0,0.3), transparent)",
              }}
            />
          </div>
        )}

        {/* Content Box */}
        <div style={{ padding: "20px 24px 24px", textAlign: "center" }}>
          <span
            style={{
              display: "inline-block",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--accent-terracotta, #802a2a)",
              backgroundColor: "rgba(128, 42, 42, 0.08)",
              padding: "3px 10px",
              borderRadius: "4px",
              marginBottom: "8px",
            }}
          >
            Limited Period Offer
          </span>

          <h3
            className="font-serif"
            style={{
              fontSize: "20px",
              color: "var(--text-primary, #2c2621)",
              margin: "0 0 8px",
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            {popupData.popupTitle}
          </h3>

          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary, #5a4e44)",
              margin: "0 0 18px",
              lineHeight: 1.5,
            }}
          >
            {popupData.popupDescription}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Link
              href={popupData.linkUrl || "/shop"}
              onClick={handleDismiss}
              style={{
                display: "block",
                width: "100%",
                padding: "11px 20px",
                backgroundColor: "var(--btn-dark, #2e3830)",
                color: "#f7f4ee",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                textAlign: "center",
                transition: "background-color 0.15s ease",
              }}
            >
              {popupData.linkText || "Explore Offer"}
            </Link>

            <button
              type="button"
              onClick={handleDismiss}
              style={{
                background: "none",
                border: "none",
                fontSize: "12px",
                color: "var(--text-muted, #8c7d70)",
                cursor: "pointer",
                padding: "6px",
                textDecoration: "underline",
              }}
            >
              Continue to Website
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
