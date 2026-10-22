"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/navigation/site-header";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";
import { SiteFooter } from "@/components/landing/site-footer";
import { CORPORATE_PACKAGES } from "@/data/products";

export default function CorporateGiftingPage() {
  const [selectedOption, setSelectedOption] = useState<string>("Curated Hampers");
  const [selectedPackage, setSelectedPackage] = useState<
    (typeof CORPORATE_PACKAGES)[0] | null
  >(null);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    quantity: "50-100",
    budgetPerBox: "₹2,500 - ₹5,000",
    message: "",
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (name: string, value: string) => {
    switch (name) {
      case "companyName":
        return value.trim() ? "" : "Company or organization name is required";
      case "contactPerson":
        return value.trim() ? "" : "Contact person name is required";
      case "email":
        if (!value.trim()) return "Work email address is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid work email address";
        return "";
      case "phone":
        if (!value.trim()) return "Contact phone number is required";
        if (value.replace(/\D/g, "").length < 10) return "Please enter a valid phone number (min 10 digits)";
        return "";
      default:
        return "";
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, formData[field as keyof typeof formData]),
    }));
  };

  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {
      companyName: validateField("companyName", formData.companyName),
      contactPerson: validateField("contactPerson", formData.contactPerson),
      email: validateField("email", formData.email),
      phone: validateField("phone", formData.phone),
    };

    setTouched({
      companyName: true,
      contactPerson: true,
      email: true,
      phone: true,
    });
    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) {
      return;
    }

    setEnquirySuccess(true);
    setTimeout(() => {
      setEnquirySuccess(false);
      setIsEnquiryModalOpen(false);
      setTouched({});
      setErrors({});
    }, 2800);
  };

  const giftingOptions = [
    { id: "Curated Hampers", label: "Curated Hampers" },
    { id: "Custom Gifts", label: "Custom Gifts" },
    { id: "Packaging Options", label: "Packaging Options" },
    { id: "Bulk Orders", label: "Bulk Orders" },
  ];

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
          padding: "32px 20px 80px",
        }}
      >
        {/* Hero Section (as shown in desktop and mobile mockups) */}
        <section
          style={{
            backgroundColor: "#fff",
            borderRadius: "24px",
            border: "1px solid var(--border-light, #e8dfd5)",
            overflow: "hidden",
            marginBottom: "56px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.03)",
          }}
          className="corporate-hero-card"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 1.15fr",
              alignItems: "center",
            }}
            className="corporate-hero-grid"
          >
            {/* Left Narrative */}
            <div
              style={{
                padding: "clamp(32px, 5vw, 64px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--accent-gold, #8c7355)",
                  marginBottom: "12px",
                }}
              >
                Corporate Gifting
              </span>

              <h1
                className="font-serif"
                style={{
                  fontSize: "clamp(34px, 4.2vw, 54px)",
                  fontWeight: 500,
                  color: "var(--text-primary, #2c2621)",
                  lineHeight: 1.15,
                  marginBottom: "16px",
                }}
              >
                Gifts that mean more.
              </h1>

              <p
                style={{
                  fontSize: "16px",
                  lineHeight: 1.65,
                  color: "var(--text-secondary, #5a4e42)",
                  marginBottom: "32px",
                  maxWidth: "460px",
                }}
              >
                Thoughtful gifting for teams, clients, celebrations and special
                occasions. Every hamper is handcrafted with love by women
                artisans and differently-abled creators.
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => setIsEnquiryModalOpen(true)}
                  style={{
                    padding: "14px 32px",
                    backgroundColor: "var(--btn-dark, #2e3830)",
                    color: "#f7f4ee",
                    fontSize: "15px",
                    fontWeight: 600,
                    borderRadius: "9999px",
                    boxShadow: "0 6px 20px rgba(46, 56, 48, 0.2)",
                    transition: "all 0.2s ease",
                  }}
                >
                  Enquire for Corporate Gifts
                </button>
              </div>
            </div>

            {/* Right Visual (High Res Hamper) */}
            <div
              style={{
                position: "relative",
                aspectRatio: "16 / 11",
                width: "100%",
                height: "100%",
                minHeight: "360px",
                backgroundColor: "#f5f0e8",
              }}
            >
              <Image
                src="/images/corporate_hero_hamper.jpg"
                alt="Luxury Corporate Gifting Hamper Box"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>
        </section>

        {/* "Our Gifting Options" Pill Tabs */}
        <section style={{ marginBottom: "56px" }}>
          <h2
            className="font-serif"
            style={{
              fontSize: "clamp(24px, 3vw, 32px)",
              color: "var(--text-primary)",
              marginBottom: "20px",
            }}
          >
            Our Gifting Options
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
            }}
          >
            {giftingOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOption(opt.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 20px",
                  backgroundColor:
                    selectedOption === opt.id
                      ? "var(--btn-dark, #2e3830)"
                      : "#fff",
                  color:
                    selectedOption === opt.id
                      ? "#f7f4ee"
                      : "var(--text-primary, #2c2621)",
                  borderRadius: "14px",
                  border:
                    selectedOption === opt.id
                      ? "1.5px solid var(--btn-dark)"
                      : "1px solid var(--border-light, #e8dfd5)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "14px" }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Featured Gift Packages Grid */}
        <section style={{ marginBottom: "64px" }}>
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
              Featured Gift Packages
            </h2>
            <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              Custom branding available for 25+ boxes
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
              gap: "28px",
              alignItems: "stretch",
            }}
            className="corporate-packages-grid"
          >
            {CORPORATE_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: "20px",
                  overflow: "hidden",
                  border: "1px solid var(--border-light, #e8dfd5)",
                  boxShadow: "0 4px 18px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                }}
                className="package-card"
              >
                {/* Photo Frame */}
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "4 / 3",
                    backgroundColor: "#f5f0e8",
                  }}
                >
                  <Image
                    src={pkg.image}
                    alt={pkg.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                </div>

                {/* Details */}
                <div
                  style={{
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: "10px",
                    }}
                  >
                    <h3
                      className="font-serif"
                      style={{
                        fontSize: "22px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {pkg.name}
                    </h3>
                    <span
                      style={{
                        fontSize: "17px",
                        fontWeight: 700,
                        color: "var(--accent-gold)",
                      }}
                    >
                      {pkg.priceStart}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "var(--text-secondary)",
                      marginBottom: "14px",
                      flex: 1,
                    }}
                  >
                    {pkg.description}
                  </p>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--accent-gold, #8c7355)",
                      fontWeight: 600,
                      marginBottom: "16px",
                    }}
                  >
                    Includes {pkg.contents.length} Handcrafted Inclusions
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "auto",
                      paddingTop: "16px",
                      borderTop: "1px solid var(--border-light)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPackage(pkg)}
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--btn-dark)",
                        textDecoration: "underline",
                      }}
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEnquiryModalOpen(true)}
                      style={{
                        padding: "8px 18px",
                        backgroundColor: "var(--btn-dark)",
                        color: "#f7f4ee",
                        borderRadius: "9999px",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      Order Bulk
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Package Customization Options */}
        <section style={{ marginBottom: "64px" }}>
          <div style={{ marginBottom: "24px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--accent-gold, #8c7355)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Tailored Finishing
            </span>
            <h2
              className="font-serif"
              style={{
                fontSize: "clamp(24px, 3vw, 32px)",
                color: "var(--text-primary)",
                marginBottom: "8px",
              }}
            >
              Package Customization Options
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              Custom branding and bespoke details available for orders of 25+ boxes.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
              gap: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid var(--border-light, #e8dfd5)",
                borderRadius: "16px",
                padding: "22px 20px",
              }}
            >
              <h3
                className="font-serif"
                style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                Branded Sleeves &amp; Logos
              </h3>
              <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                Custom corporate logo placement on packaging sleeves, belly bands, and festive ribbon tags.
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid var(--border-light, #e8dfd5)",
                borderRadius: "16px",
                padding: "22px 20px",
              }}
            >
              <h3
                className="font-serif"
                style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                Personalized Greeting Cards
              </h3>
              <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                Hand-signed artisan message cards, custom-printed leadership letters, and signature wax seals.
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid var(--border-light, #e8dfd5)",
                borderRadius: "16px",
                padding: "22px 20px",
              }}
            >
              <h3
                className="font-serif"
                style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                Curated Artisan Inclusions
              </h3>
              <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                Flexible item combinations: original framed miniature paintings, botanical candles, or brass bells.
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid var(--border-light, #e8dfd5)",
                borderRadius: "16px",
                padding: "22px 20px",
              }}
            >
              <h3
                className="font-serif"
                style={{
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                Keepsake Chests &amp; Boxes
              </h3>
              <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                Choice of solid walnut wood keepsake chests, engraved pine boxes, or reusable unbleached cotton pouches.
              </p>
            </div>
          </div>
        </section>

        {/* Three-Step Order Process */}
        <section style={{ marginBottom: "64px" }}>
          <div style={{ marginBottom: "24px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--accent-gold, #8c7355)",
                display: "block",
                marginBottom: "6px",
              }}
            >
              Concierge Process
            </span>
            <h2
              className="font-serif"
              style={{
                fontSize: "clamp(24px, 3vw, 32px)",
                color: "var(--text-primary)",
                marginBottom: "8px",
              }}
            >
              Three-Step Corporate Ordering
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              A dedicated gifting lead assists your organization from consultation to doorstep dispatch.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: "24px",
              marginBottom: "32px",
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid var(--border-light, #e8dfd5)",
                borderRadius: "20px",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--accent-gold, #8c7355)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "12px",
                }}
              >
                Step 01
              </span>
              <h3
                className="font-serif"
                style={{
                  fontSize: "19px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "10px",
                }}
              >
                Share Your Requirement
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: 1.65,
                  color: "var(--text-secondary)",
                }}
              >
                Specify your estimated quantity, target budget per box, occasion, and branding needs through our corporate enquiry form.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid var(--border-light, #e8dfd5)",
                borderRadius: "20px",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--accent-gold, #8c7355)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "12px",
                }}
              >
                Step 02
              </span>
              <h3
                className="font-serif"
                style={{
                  fontSize: "19px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "10px",
                }}
              >
                Curation &amp; 24h Mockups
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: 1.65,
                  color: "var(--text-secondary)",
                }}
              >
                Our team responds within 24 hours with a tailored catalogue, curated sample options, and digital logo branding mockups.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                backgroundColor: "#fff",
                border: "1px solid var(--border-light, #e8dfd5)",
                borderRadius: "20px",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--accent-gold, #8c7355)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "12px",
                }}
              >
                Step 03
              </span>
              <h3
                className="font-serif"
                style={{
                  fontSize: "19px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "10px",
                }}
              >
                Handcrafted Production &amp; Delivery
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: 1.65,
                  color: "var(--text-secondary)",
                }}
              >
                Artisans hand-finish each keepsake hamper, verify contents individually, and manage coordinated pan-India doorstep dispatch.
              </p>
            </div>
          </div>

          {/* CTA linking to Enquiry Form */}
          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setIsEnquiryModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 32px",
                backgroundColor: "var(--btn-dark, #2e3830)",
                color: "#f7f4ee",
                fontSize: "15px",
                fontWeight: 600,
                borderRadius: "9999px",
                boxShadow: "0 6px 20px rgba(46, 56, 48, 0.18)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <span>Submit Corporate Enquiry</span>
              <span>→</span>
            </button>
          </div>
        </section>

        {/* "Custom Gifting" CTA Banner Card */}
        <section
          style={{
            backgroundColor: "#FAF7F2",
            border: "1px solid var(--border-light, #e8dfd5)",
            borderRadius: "24px",
            padding: "48px 36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--accent-gold)",
              }}
            >
              Custom Gifting
            </span>
            <h2
              className="font-serif"
              style={{
                fontSize: "clamp(26px, 3.5vw, 36px)",
                color: "var(--text-primary)",
                marginTop: "6px",
                marginBottom: "8px",
              }}
            >
              Tell us about your corporate gifting needs
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
              Tailored curation, customized artwork motifs, corporate logos, and
              direct doorstep dispatch.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsEnquiryModalOpen(true)}
            style={{
              padding: "16px 36px",
              backgroundColor: "var(--btn-dark, #2e3830)",
              color: "#f7f4ee",
              borderRadius: "9999px",
              fontSize: "15px",
              fontWeight: 600,
              boxShadow: "0 6px 20px rgba(46, 56, 48, 0.2)",
            }}
          >
            Get in Touch
          </button>
        </section>

        {/* Package Details Modal */}
        {selectedPackage && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              backgroundColor: "rgba(44, 38, 33, 0.65)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={() => setSelectedPackage(null)}
          >
            <div
              style={{
                backgroundColor: "var(--bg-cream)",
                borderRadius: "24px",
                padding: "32px",
                maxWidth: "600px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                border: "1px solid var(--border-light)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h3 className="font-serif" style={{ fontSize: "26px" }}>
                    {selectedPackage.name}
                  </h3>
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "var(--accent-gold)",
                    }}
                  >
                    {selectedPackage.priceStart}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPackage(null)}
                  style={{ fontSize: "20px", color: "var(--text-muted)" }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  position: "relative",
                  aspectRatio: "16 / 9",
                  borderRadius: "14px",
                  overflow: "hidden",
                  marginBottom: "20px",
                }}
              >
                <Image
                  src={selectedPackage.image}
                  alt={selectedPackage.name}
                  fill
                  style={{ objectFit: "cover" }}
                />
              </div>

              <p
                style={{
                  fontSize: "15px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  marginBottom: "20px",
                }}
              >
                {selectedPackage.description}
              </p>

              <h4
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: "10px",
                }}
              >
                Hamper Inclusions
              </h4>
              <ul
                style={{
                  paddingLeft: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  marginBottom: "28px",
                }}
              >
                {selectedPackage.contents.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => {
                  setSelectedPackage(null);
                  setIsEnquiryModalOpen(true);
                }}
                style={{
                  width: "100%",
                  padding: "14px",
                  backgroundColor: "var(--btn-dark)",
                  color: "#f7f4ee",
                  borderRadius: "9999px",
                  fontWeight: 600,
                }}
              >
                Request Proposal for this Package
              </button>
            </div>
          </div>
        )}

        {/* Corporate Enquiry Form Modal */}
        {isEnquiryModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              backgroundColor: "rgba(44, 38, 33, 0.65)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            onClick={() => setIsEnquiryModalOpen(false)}
          >
            <div
              style={{
                backgroundColor: "var(--bg-cream, #f7f4ee)",
                borderRadius: "24px",
                padding: "clamp(20px, 4vw, 36px)",
                maxWidth: "640px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                border: "1px solid var(--border-light)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {enquirySuccess ? (
                <div style={{ textAlign: "center", padding: "40px 10px" }}>
                  <div style={{ fontSize: "44px", color: "#27ae60", marginBottom: "16px" }}>
                    ✓
                  </div>
                  <h3 className="font-serif" style={{ fontSize: "28px", marginBottom: "10px" }}>
                    Enquiry Received!
                  </h3>
                  <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    Thank you. Our corporate gifting lead will reach out to you within 24 hours with a custom catalogue and mockups.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "20px",
                    }}
                  >
                    <div>
                      <h3
                        className="font-serif"
                        style={{ fontSize: "26px", color: "var(--text-primary)" }}
                      >
                        Corporate Gifting Enquiry
                      </h3>
                      <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                        Share your requirement and get a tailored catalogue within 24h.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEnquiryModalOpen(false)}
                      style={{ fontSize: "20px", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}
                      aria-label="Close modal"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleEnquirySubmit} noValidate>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
                        gap: "16px",
                        marginBottom: "16px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            marginBottom: "6px",
                          }}
                        >
                          Company / Organization *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.companyName}
                          onChange={(e) => handleFieldChange("companyName", e.target.value)}
                          onBlur={() => handleFieldBlur("companyName")}
                          placeholder="e.g. Acme Corp"
                          style={{
                            width: "100%",
                            minHeight: "44px",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: errors.companyName && touched.companyName
                              ? "1.5px solid #c0392b"
                              : "1px solid var(--border-light, #e8dfd5)",
                            backgroundColor: "#fff",
                            fontFamily: "inherit",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        />
                        {errors.companyName && touched.companyName && (
                          <span style={{ fontSize: "12px", color: "#c0392b", marginTop: "4px", display: "block" }}>
                            {errors.companyName}
                          </span>
                        )}
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            marginBottom: "6px",
                          }}
                        >
                          Contact Person *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.contactPerson}
                          onChange={(e) => handleFieldChange("contactPerson", e.target.value)}
                          onBlur={() => handleFieldBlur("contactPerson")}
                          placeholder="Your Name"
                          style={{
                            width: "100%",
                            minHeight: "44px",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: errors.contactPerson && touched.contactPerson
                              ? "1.5px solid #c0392b"
                              : "1px solid var(--border-light, #e8dfd5)",
                            backgroundColor: "#fff",
                            fontFamily: "inherit",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        />
                        {errors.contactPerson && touched.contactPerson && (
                          <span style={{ fontSize: "12px", color: "#c0392b", marginTop: "4px", display: "block" }}>
                            {errors.contactPerson}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
                        gap: "16px",
                        marginBottom: "16px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            marginBottom: "6px",
                          }}
                        >
                          Work Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => handleFieldChange("email", e.target.value)}
                          onBlur={() => handleFieldBlur("email")}
                          placeholder="name@company.com"
                          style={{
                            width: "100%",
                            minHeight: "44px",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: errors.email && touched.email
                              ? "1.5px solid #c0392b"
                              : "1px solid var(--border-light, #e8dfd5)",
                            backgroundColor: "#fff",
                            fontFamily: "inherit",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        />
                        {errors.email && touched.email && (
                          <span style={{ fontSize: "12px", color: "#c0392b", marginTop: "4px", display: "block" }}>
                            {errors.email}
                          </span>
                        )}
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            marginBottom: "6px",
                          }}
                        >
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => handleFieldChange("phone", e.target.value)}
                          onBlur={() => handleFieldBlur("phone")}
                          placeholder="+91 98765 00000"
                          style={{
                            width: "100%",
                            minHeight: "44px",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: errors.phone && touched.phone
                              ? "1.5px solid #c0392b"
                              : "1px solid var(--border-light, #e8dfd5)",
                            backgroundColor: "#fff",
                            fontFamily: "inherit",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        />
                        {errors.phone && touched.phone && (
                          <span style={{ fontSize: "12px", color: "#c0392b", marginTop: "4px", display: "block" }}>
                            {errors.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
                        gap: "16px",
                        marginBottom: "16px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            marginBottom: "6px",
                          }}
                        >
                          Estimated Quantity
                        </label>
                        <select
                          value={formData.quantity}
                          onChange={(e) =>
                            setFormData({ ...formData, quantity: e.target.value })
                          }
                          style={{
                            width: "100%",
                            minHeight: "44px",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-light)",
                            backgroundColor: "#fff",
                            fontFamily: "inherit",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value="25-50">25 - 50 hampers</option>
                          <option value="50-100">50 - 100 hampers</option>
                          <option value="100-300">100 - 300 hampers</option>
                          <option value="300+">300+ hampers</option>
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            display: "block",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            marginBottom: "6px",
                          }}
                        >
                          Target Budget Per Hamper
                        </label>
                        <select
                          value={formData.budgetPerBox}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              budgetPerBox: e.target.value,
                            })
                          }
                          style={{
                            width: "100%",
                            minHeight: "44px",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-light)",
                            backgroundColor: "#fff",
                            fontFamily: "inherit",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value="Under ₹2,000">Under ₹2,000</option>
                          <option value="₹2,000 - ₹3,500">₹2,000 - ₹3,500</option>
                          <option value="₹3,500 - ₹5,000">₹3,500 - ₹5,000</option>
                          <option value="₹5,000+">₹5,000+ (Ultra Luxury)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: "24px" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          marginBottom: "6px",
                        }}
                      >
                        Special Requirements / Occasion
                      </label>
                      <textarea
                        rows={3}
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        placeholder="e.g. Diwali celebration, new employee onboarding, custom logo branding..."
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid var(--border-light)",
                          backgroundColor: "#fff",
                          fontFamily: "inherit",
                          fontSize: "14px",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      style={{
                        width: "100%",
                        minHeight: "48px",
                        padding: "14px",
                        backgroundColor: "var(--btn-dark)",
                        color: "#f7f4ee",
                        borderRadius: "9999px",
                        fontWeight: 600,
                        fontSize: "15px",
                        cursor: "pointer",
                        border: "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Submit Corporate Enquiry
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
      <MobileBottomBar />
    </div>
  );
}
