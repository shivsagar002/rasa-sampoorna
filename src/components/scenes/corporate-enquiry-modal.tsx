"use client";

import { useState } from "react";

interface CorporateEnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CorporateEnquiryModal({
  isOpen,
  onClose,
}: CorporateEnquiryModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [quantity, setQuantity] = useState("50–200");
  const [formData, setFormData] = useState({
    company: "",
    name: "",
    email: "",
    requirements: "",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="enquiry-modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div
        className="enquiry-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close Enquiry Panel"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.8" fill="none">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="modal-header">
          <span className="scene-eyebrow">BESPOKE PARTNERSHIPS</span>
          <h2 className="modal-title font-serif">
            Corporate Gifting <br />
            Concierge
          </h2>
          <p className="modal-subtitle">
            Curated artisan hampers, organic scented candles, and custom branding tailored for meaningful corporate gifting.
          </p>
        </div>

        {submitted ? (
          <div className="modal-success-state">
            <div className="modal-success-icon">✓</div>
            <h3 className="modal-success-heading font-serif">Thank You for Your Interest</h3>
            <p className="modal-success-text">
              Our gifting concierge will connect with your team within 24 hours with a bespoke catalogue and custom curation proposal.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: "24px" }}
              onClick={onClose}
            >
              <span>Return to Experience</span>
              <span>→</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="modal-form-grid">
              <div className="modal-input-group">
                <label className="modal-label" htmlFor="modal-company">
                  Company / Organization
                </label>
                <input
                  id="modal-company"
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  className="modal-input"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="modal-input-group">
                <label className="modal-label" htmlFor="modal-name">
                  Contact Name
                </label>
                <input
                  id="modal-name"
                  type="text"
                  required
                  placeholder="Your Full Name"
                  className="modal-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-input-group">
              <label className="modal-label" htmlFor="modal-email">
                Work Email
              </label>
              <input
                id="modal-email"
                type="email"
                required
                placeholder="contact@company.com"
                className="modal-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="modal-input-group">
              <label className="modal-label">Estimated Hamper Quantity</label>
              <div className="modal-quantity-row">
                {["25–50", "50–200", "200–500", "500+"].map((qty) => (
                  <button
                    type="button"
                    key={qty}
                    className={`modal-qty-chip ${quantity === qty ? "is-selected" : ""}`}
                    onClick={() => setQuantity(qty)}
                  >
                    {qty}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-input-group">
              <label className="modal-label" htmlFor="modal-notes">
                Occasion / Gifting Details
              </label>
              <input
                id="modal-notes"
                type="text"
                placeholder="Festive gifting, Annual Summit, Executive welcome"
                className="modal-input"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              />
            </div>

            <div className="modal-actions">
              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                <span>Request Bespoke Proposal</span>
                <span>→</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
