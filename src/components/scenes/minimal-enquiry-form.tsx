"use client";

import { useState } from "react";

export function MinimalEnquiryForm() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    quantity: "",
    contactPref: "Email",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="minimal-form-container">
        <div className="scene-eyebrow" style={{ marginBottom: "10px" }}>BESPOKE PARTNERSHIPS</div>
        <h3 className="scene-heading-form font-serif">
          Enquiry Received
        </h3>
        <p className="scene-description-form font-sans" style={{ marginBottom: "18px" }}>
          Thank you. Our corporate gifting concierge will connect with your team via {formData.contactPref.toLowerCase()} within 24 hours with a curated proposal.
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setFormData({
              company: "",
              name: "",
              email: "",
              phone: "",
              quantity: "",
              contactPref: "Email",
              notes: "",
            });
            setSubmitted(false);
          }}
        >
          Submit another enquiry
        </button>
      </div>
    );
  }

  return (
    <div className="minimal-form-container">
      <div className="scene-eyebrow" style={{ marginBottom: "10px" }}>BESPOKE PARTNERSHIPS</div>

      <h3 className="scene-heading-form font-serif">
        Corporate Gift <br />
        Enquiry
      </h3>

      <p className="scene-description-form font-sans">
        Collaborate with our atelier for handcrafted hampers, conscious packaging and bespoke branding.
      </p>

      <form onSubmit={handleSubmit} className="minimal-form-fields">
        {/* Row 1: Company & Contact Name */}
        <div className="form-row-duo">
          <div className="minimal-field">
            <label className="minimal-label" htmlFor="corp-company">Company</label>
            <input
              id="corp-company"
              type="text"
              required
              placeholder="e.g. Acme Corp"
              className="minimal-input"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>

          <div className="minimal-field">
            <label className="minimal-label" htmlFor="corp-name">Contact Name</label>
            <input
              id="corp-name"
              type="text"
              required
              placeholder="Your Name"
              className="minimal-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
        </div>

        {/* Row 2: Work Email & Phone / WhatsApp */}
        <div className="form-row-duo">
          <div className="minimal-field">
            <label className="minimal-label" htmlFor="corp-email">Work Email</label>
            <input
              id="corp-email"
              type="email"
              required
              placeholder="contact@company.com"
              className="minimal-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="minimal-field">
            <label className="minimal-label" htmlFor="corp-phone">Phone / WhatsApp</label>
            <input
              id="corp-phone"
              type="tel"
              placeholder="+91 98765 43210"
              className="minimal-input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </div>

        {/* Row 3: Quantity (Numbers only) & Preferred Contact Option */}
        <div className="form-row-duo">
          <div className="minimal-field">
            <label className="minimal-label" htmlFor="corp-qty">Quantity (Hampers)</label>
            <input
              id="corp-qty"
              type="number"
              min="1"
              step="1"
              required
              placeholder="e.g. 150"
              className="minimal-input"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            />
          </div>

          <div className="minimal-field">
            <label className="minimal-label" htmlFor="corp-pref">Contact Preference</label>
            <select
              id="corp-pref"
              className="minimal-select"
              value={formData.contactPref}
              onChange={(e) => setFormData({ ...formData, contactPref: e.target.value })}
            >
              <option value="Email">Email</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Phone Call">Phone Call</option>
            </select>
          </div>
        </div>

        {/* Row 4: Occasion / Details */}
        <div className="minimal-field">
          <label className="minimal-label" htmlFor="corp-notes">Occasion / Details</label>
          <input
            id="corp-notes"
            type="text"
            placeholder="e.g. Festive gifting, Annual Summit, Leadership welcome"
            className="minimal-input"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="form-actions" style={{ marginTop: "12px" }}>
          <button type="submit" className="btn-primary">
            <span>Request Curated Proposal</span>
            <span>→</span>
          </button>
        </div>
      </form>
    </div>
  );
}
