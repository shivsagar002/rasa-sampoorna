"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HomepageCms,
  ContentPageCms,
  StoreSettings,
  CmsRevision,
} from "@/modules/cms/cms.schema";
import { DirectImageUpload } from "@/components/admin/direct-image-upload";

export function AdminCmsTab() {
  const [activeSubTab, setActiveSubTab] = useState<"homepage" | "pages" | "settings">("homepage");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 1. Homepage CMS State
  const [homepageForm, setHomepageForm] = useState<HomepageCms | null>(null);
  const [homepageStatus, setHomepageStatus] = useState<string>("PUBLISHED");
  const [homepageVersion, setHomepageVersion] = useState<number>(1);
  const [homepageRevisions, setHomepageRevisions] = useState<CmsRevision[]>([]);

  // 2. Policy / Informational Pages State
  const [selectedPageSlug, setSelectedPageSlug] = useState<string>("shipping-policy");
  const [pageList, setPageList] = useState<any[]>([]);
  const [pageForm, setPageForm] = useState<ContentPageCms | null>(null);
  const [pageStatus, setPageStatus] = useState<string>("PUBLISHED");
  const [pageVersion, setPageVersion] = useState<number>(1);
  const [pageRevisions, setPageRevisions] = useState<CmsRevision[]>([]);

  // 3. Store Settings State
  const [settingsForm, setSettingsForm] = useState<StoreSettings | null>(null);
  const [integrationsStatus, setIntegrationsStatus] = useState<any | null>(null);

  // Revisions Modal
  const [showRevisionModal, setShowRevisionModal] = useState<"homepage" | "page" | null>(null);

  // Load Homepage CMS
  const loadHomepageData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/cms/homepage");
      const json = await res.json();
      if (res.ok && json.data) {
        setHomepageForm(json.data.content);
        setHomepageStatus(json.data.status);
        setHomepageVersion(json.data.version);
        setHomepageRevisions(json.data.revisions || []);
      }
    } catch (err: any) {
      setMessage({ text: "Failed to load homepage CMS content.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Load Pages List and Selected Page
  const loadPagesList = async () => {
    try {
      const res = await fetch("/api/v1/admin/cms/pages");
      const json = await res.json();
      if (res.ok && json.data) {
        setPageList(json.data);
      }
    } catch (err) {
      console.warn("Failed to load CMS pages list:", err);
    }
  };

  const loadPageDetail = async (slug: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/cms/pages/${slug}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setPageForm(json.data.content);
        setPageStatus(json.data.status);
        setPageVersion(json.data.version);
        setPageRevisions(json.data.revisions || []);
      }
    } catch (err: any) {
      setMessage({ text: `Failed to load '${slug}' content.`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Load Store Settings
  const loadStoreSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/cms/settings");
      const json = await res.json();
      if (res.ok && json.data) {
        setSettingsForm(json.data.settings);
        setIntegrationsStatus(json.data.integrations);
      }
    } catch (err: any) {
      setMessage({ text: "Failed to load store settings.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "homepage") {
      loadHomepageData();
    } else if (activeSubTab === "pages") {
      loadPagesList();
      loadPageDetail(selectedPageSlug);
    } else if (activeSubTab === "settings") {
      loadStoreSettings();
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (activeSubTab === "pages") {
      loadPageDetail(selectedPageSlug);
    }
  }, [selectedPageSlug]);

  // Actions: Homepage Draft & Publish
  const handleSaveHomepage = async (action: "SAVE_DRAFT" | "PUBLISH") => {
    if (!homepageForm) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/cms/homepage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          data: homepageForm,
          changeSummary: action === "PUBLISH" ? "Published live homepage" : "Draft update",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Operation failed.");

      setMessage({
        text: action === "PUBLISH" ? "Homepage successfully published live!" : "Homepage draft saved.",
        type: "success",
      });
      loadHomepageData();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Actions: Content Page Draft, Publish & Rollback
  const handleSavePage = async (action: "SAVE_DRAFT" | "PUBLISH") => {
    if (!pageForm) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/cms/pages/${selectedPageSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          data: pageForm,
          changeSummary: action === "PUBLISH" ? "Published live" : "Saved draft",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Operation failed.");

      setMessage({
        text: action === "PUBLISH" ? `'${selectedPageSlug}' published live!` : "Draft saved.",
        type: "success",
      });
      loadPageDetail(selectedPageSlug);
      loadPagesList();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (slug: string, targetVersion: number) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/cms/pages/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ROLLBACK",
          targetVersion,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Rollback failed.");

      setMessage({ text: `Successfully rolled back to version ${targetVersion}.`, type: "success" });
      setShowRevisionModal(null);
      loadPageDetail(slug);
      loadPagesList();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Actions: Save Store Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/cms/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update store settings.");

      setMessage({ text: "Store settings and operational parameters saved successfully.", type: "success" });
      loadStoreSettings();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* CMS Sub-Tabs Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          backgroundColor: "#fff",
          padding: "14px 20px",
          borderRadius: "12px",
          border: "1px solid var(--border-light, #e8dfd5)",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { id: "homepage", label: "Homepage & Banner Strip" },
            { id: "pages", label: "Informational & Policy Pages" },
            { id: "settings", label: "Store Settings & Integrations" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: activeSubTab === tab.id ? "1px solid var(--btn-dark, #2e3830)" : "1px solid #e8dfd5",
                backgroundColor: activeSubTab === tab.id ? "var(--btn-dark, #2e3830)" : "#fff",
                color: activeSubTab === tab.id ? "#f7f4ee" : "var(--text-primary, #2c2621)",
                fontSize: "13px",
                fontWeight: activeSubTab === tab.id ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeSubTab === "homepage" && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: 600,
                backgroundColor: homepageStatus === "PUBLISHED" ? "#f0f7f2" : "#fef9e7",
                color: homepageStatus === "PUBLISHED" ? "#205a3c" : "#8c7355",
              }}
            >
              {homepageStatus} • v{homepageVersion}
            </span>
            <a
              href="/?preview=true"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "12px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #e8dfd5",
                color: "#2c2621",
                textDecoration: "none",
                backgroundColor: "#fff",
              }}
            >
              Preview Live Draft ↗
            </a>
          </div>
        )}

        {activeSubTab === "pages" && pageForm && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: 600,
                backgroundColor: pageStatus === "PUBLISHED" ? "#f0f7f2" : "#fef9e7",
                color: pageStatus === "PUBLISHED" ? "#205a3c" : "#8c7355",
              }}
            >
              {pageStatus} • v{pageVersion}
            </span>
            <a
              href={`/${selectedPageSlug}?preview=true`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "12px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #e8dfd5",
                color: "#2c2621",
                textDecoration: "none",
                backgroundColor: "#fff",
              }}
            >
              Preview Draft ↗
            </a>
            {pageRevisions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRevisionModal("page")}
                style={{
                  fontSize: "12px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e8dfd5",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  color: "#5a4e44",
                }}
              >
                Revisions ({pageRevisions.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Feedback Messages */}
      {message && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            backgroundColor: message.type === "success" ? "#f0f7f2" : "#fdf2f2",
            border: `1px solid ${message.type === "success" ? "#b8deca" : "#f5c6cb"}`,
            color: message.type === "success" ? "#205a3c" : "#842029",
            fontSize: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "inherit" }}
          >
            ×
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. HOMEPAGE CMS EDITOR */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === "homepage" && homepageForm && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Top Promotional Announcement Strip */}
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px 24px",
              borderRadius: "12px",
              border: "1px solid #e8dfd5",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 className="font-serif" style={{ fontSize: "17px", color: "#2c2621", margin: 0 }}>
                  Top Header Announcement Strip
                </h3>
                <span style={{ fontSize: "12px", color: "#8c7d70" }}>
                  Global promotional banner rendered above navigation
                </span>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={homepageForm.promoStrip.isEnabled}
                  onChange={(e) =>
                    setHomepageForm({
                      ...homepageForm,
                      promoStrip: { ...homepageForm.promoStrip, isEnabled: e.target.checked },
                    })
                  }
                  style={{ accentColor: "var(--btn-dark, #2e3830)", cursor: "pointer" }}
                />
                <span style={{ fontWeight: 500 }}>Active / Visible</span>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Announcement &amp; Offer Text
                </label>
                <input
                  type="text"
                  value={homepageForm.promoStrip.message}
                  onChange={(e) =>
                    setHomepageForm({
                      ...homepageForm,
                      promoStrip: { ...homepageForm.promoStrip, message: e.target.value },
                    })
                  }
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Action Link Label
                </label>
                <input
                  type="text"
                  value={homepageForm.promoStrip.linkText || ""}
                  onChange={(e) =>
                    setHomepageForm({
                      ...homepageForm,
                      promoStrip: { ...homepageForm.promoStrip, linkText: e.target.value },
                    })
                  }
                  placeholder="e.g. Shop Now"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Destination URL
                </label>
                <input
                  type="text"
                  value={homepageForm.promoStrip.linkUrl || ""}
                  onChange={(e) =>
                    setHomepageForm({
                      ...homepageForm,
                      promoStrip: { ...homepageForm.promoStrip, linkUrl: e.target.value },
                    })
                  }
                  placeholder="e.g. /shop"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>
            </div>

            {/* Offer / Banner Image Direct Upload & On-Load Popup Settings */}
            <div style={{ borderTop: "1px solid #f0eae1", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <DirectImageUpload
                value={homepageForm.promoStrip.imageUrl || ""}
                onChange={(url) =>
                  setHomepageForm({
                    ...homepageForm,
                    promoStrip: { ...homepageForm.promoStrip, imageUrl: url },
                  })
                }
                label="Offer &amp; Promotional Banner Image (Direct Upload for Banner &amp; On-Load Popup Modal)"
                folder="cms"
                height="120px"
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Popup Modal Headline (Optional Override)
                  </label>
                  <input
                    type="text"
                    value={homepageForm.promoStrip.popupTitle || ""}
                    onChange={(e) =>
                      setHomepageForm({
                        ...homepageForm,
                        promoStrip: { ...homepageForm.promoStrip, popupTitle: e.target.value },
                      })
                    }
                    placeholder="e.g. Special Festive Silk Collection"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    Popup Modal Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={homepageForm.promoStrip.popupDescription || ""}
                    onChange={(e) =>
                      setHomepageForm({
                        ...homepageForm,
                        promoStrip: { ...homepageForm.promoStrip, popupDescription: e.target.value },
                      })
                    }
                    placeholder="e.g. Receive complimentary artisan gift packaging on all orders"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                  />
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer", color: "#5a4e44" }}>
                <input
                  type="checkbox"
                  checked={homepageForm.promoStrip.showPopup !== false}
                  onChange={(e) =>
                    setHomepageForm({
                      ...homepageForm,
                      promoStrip: { ...homepageForm.promoStrip, showPopup: e.target.checked },
                    })
                  }
                  style={{ accentColor: "var(--btn-dark, #2e3830)", cursor: "pointer" }}
                />
                <span style={{ fontWeight: 500 }}>
                  Show as full-page on-load Popup Modal with dismiss cross (✕) button
                </span>
              </label>
            </div>
          </div>

          {/* Hero Narrative & Buttons */}
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px 24px",
              borderRadius: "12px",
              border: "1px solid #e8dfd5",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <h3 className="font-serif" style={{ fontSize: "17px", color: "#2c2621", margin: 0 }}>
                Hero Narrative & Call-To-Action Controls
              </h3>
              <span style={{ fontSize: "12px", color: "#8c7d70" }}>
                Controls textual content and CTA buttons while strictly preserving the desktop canvas scroller and mobile layout
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Eyebrow Badge Tag
                </label>
                <input
                  type="text"
                  value={homepageForm.hero.eyebrow || ""}
                  onChange={(e) =>
                    setHomepageForm({
                      ...homepageForm,
                      hero: { ...homepageForm.hero, eyebrow: e.target.value },
                    })
                  }
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Hero Headline
                </label>
                <input
                  type="text"
                  value={homepageForm.hero.title}
                  onChange={(e) =>
                    setHomepageForm({
                      ...homepageForm,
                      hero: { ...homepageForm.hero, title: e.target.value },
                    })
                  }
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Hero Subtitle / Narrative
              </label>
              <textarea
                rows={2}
                value={homepageForm.hero.subtitle || ""}
                onChange={(e) =>
                  setHomepageForm({
                    ...homepageForm,
                    hero: { ...homepageForm.hero, subtitle: e.target.value },
                  })
                }
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Primary CTA Label
                </label>
                <input
                  type="text"
                  value={homepageForm.hero.primaryCtaLabel || ""}
                  onChange={(e) =>
                    setHomepageForm({
                      ...homepageForm,
                      hero: { ...homepageForm.hero, primaryCtaLabel: e.target.value },
                    })
                  }
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Primary CTA Destination
                </label>
                <input
                  type="text"
                  value={homepageForm.hero.primaryCtaUrl || ""}
                  onChange={(e) =>
                    setHomepageForm({
                      ...homepageForm,
                      hero: { ...homepageForm.hero, primaryCtaUrl: e.target.value },
                    })
                  }
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Secondary CTA Label
                </label>
                <input
                  type="text"
                  value={homepageForm.hero.secondaryCtaLabel || ""}
                  onChange={(e) =>
                    setHomepageForm({
                      ...homepageForm,
                      hero: { ...homepageForm.hero, secondaryCtaLabel: e.target.value },
                    })
                  }
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Secondary CTA Destination
                </label>
                <input
                  type="text"
                  value={homepageForm.hero.secondaryCtaUrl || ""}
                  onChange={(e) =>
                    setHomepageForm({
                      ...homepageForm,
                      hero: { ...homepageForm.hero, secondaryCtaUrl: e.target.value },
                    })
                  }
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>
            </div>
          </div>

          {/* Section Visibility & Ordering */}
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px 24px",
              borderRadius: "12px",
              border: "1px solid #e8dfd5",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <h3 className="font-serif" style={{ fontSize: "17px", color: "#2c2621", margin: 0 }}>
                Homepage Section Visibility & Toggles
              </h3>
              <span style={{ fontSize: "12px", color: "#8c7d70" }}>
                Enable or disable existing sections without changing layout or page order
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px" }}>
              {homepageForm.sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    backgroundColor: "#f7f4ee",
                    borderRadius: "6px",
                    border: "1px solid #e8dfd5",
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#2c2621" }}>{sec.name}</span>
                  <input
                    type="checkbox"
                    checked={sec.isVisible}
                    onChange={(e) => {
                      const updated = [...homepageForm.sections];
                      updated[idx] = { ...sec, isVisible: e.target.checked };
                      setHomepageForm({ ...homepageForm, sections: updated });
                    }}
                    style={{ accentColor: "var(--btn-dark, #2e3830)", cursor: "pointer" }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions Bar */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSaveHomepage("SAVE_DRAFT")}
              style={{
                padding: "10px 20px",
                border: "1px solid var(--border-light, #e8dfd5)",
                backgroundColor: "#fff",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Save Working Draft
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSaveHomepage("PUBLISH")}
              style={{
                padding: "10px 24px",
                backgroundColor: "var(--btn-dark, #2e3830)",
                color: "#f7f4ee",
                borderRadius: "8px",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Publish Live
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. POLICY & INFORMATIONAL PAGES EDITOR */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === "pages" && pageForm && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Page Selector Bar */}
          <div
            style={{
              backgroundColor: "#fff",
              padding: "16px 20px",
              borderRadius: "12px",
              border: "1px solid #e8dfd5",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#2c2621" }}>Select Page to Edit:</span>
            <select
              value={selectedPageSlug}
              onChange={(e) => setSelectedPageSlug(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #e8dfd5",
                fontSize: "13px",
                backgroundColor: "#f7f4ee",
                color: "#2c2621",
                cursor: "pointer",
              }}
            >
              {pageList.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title} ({p.status})
                </option>
              ))}
            </select>
          </div>

          {/* Page Details Form */}
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px 24px",
              borderRadius: "12px",
              border: "1px solid #e8dfd5",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Page Title (H1)
                </label>
                <input
                  type="text"
                  value={pageForm.title}
                  onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Eyebrow Tag
                </label>
                <input
                  type="text"
                  value={pageForm.eyebrow || ""}
                  onChange={(e) => setPageForm({ ...pageForm, eyebrow: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Last Updated Date
                </label>
                <input
                  type="text"
                  value={pageForm.lastUpdated || ""}
                  onChange={(e) => setPageForm({ ...pageForm, lastUpdated: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>
            </div>

            {/* Sections Editor */}
            <div style={{ marginTop: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h4 className="font-serif" style={{ fontSize: "16px", color: "#2c2621", margin: 0 }}>
                  Structured Content Sections ({pageForm.sections.length})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const newSection = {
                      id: `sec-${Date.now()}`,
                      heading: "New Policy Section",
                      body: "Enter detailed content here.",
                    };
                    setPageForm({ ...pageForm, sections: [...pageForm.sections, newSection] });
                  }}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#f7f4ee",
                    border: "1px solid #e8dfd5",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  + Add Section
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {pageForm.sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    style={{
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #e8dfd5",
                      backgroundColor: "#faf8f5",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#8c7355" }}>
                        Section {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = pageForm.sections.filter((_, i) => i !== idx);
                          setPageForm({ ...pageForm, sections: updated });
                        }}
                        style={{ background: "none", border: "none", color: "#842029", fontSize: "12px", cursor: "pointer" }}
                      >
                        Remove
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "2px" }}>
                          Heading
                        </label>
                        <input
                          type="text"
                          value={sec.heading}
                          onChange={(e) => {
                            const updated = [...pageForm.sections];
                            updated[idx] = { ...sec, heading: e.target.value };
                            setPageForm({ ...pageForm, sections: updated });
                          }}
                          style={{ width: "100%", padding: "6px 10px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "2px" }}>
                          Body Content
                        </label>
                        <textarea
                          rows={3}
                          value={sec.body}
                          onChange={(e) => {
                            const updated = [...pageForm.sections];
                            updated[idx] = { ...sec, body: e.target.value };
                            setPageForm({ ...pageForm, sections: updated });
                          }}
                          style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px", resize: "vertical" }}
                        />
                      </div>

                      {/* Optional Highlight Box */}
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "2px" }}>
                          Highlight Box (Optional Callout)
                        </label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px" }}>
                          <input
                            type="text"
                            placeholder="Callout Title"
                            value={sec.highlightBox?.title || ""}
                            onChange={(e) => {
                              const updated = [...pageForm.sections];
                              updated[idx] = {
                                ...sec,
                                highlightBox: {
                                  title: e.target.value,
                                  text: sec.highlightBox?.text || "",
                                },
                              };
                              setPageForm({ ...pageForm, sections: updated });
                            }}
                            style={{ padding: "6px 10px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "12px" }}
                          />
                          <input
                            type="text"
                            placeholder="Callout Text"
                            value={sec.highlightBox?.text || ""}
                            onChange={(e) => {
                              const updated = [...pageForm.sections];
                              updated[idx] = {
                                ...sec,
                                highlightBox: {
                                  title: sec.highlightBox?.title || "",
                                  text: e.target.value,
                                },
                              };
                              setPageForm({ ...pageForm, sections: updated });
                            }}
                            style={{ padding: "6px 10px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "12px" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px" }}>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSavePage("SAVE_DRAFT")}
                style={{
                  padding: "10px 20px",
                  border: "1px solid var(--border-light, #e8dfd5)",
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSavePage("PUBLISH")}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "var(--btn-dark, #2e3830)",
                  color: "#f7f4ee",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Publish Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. STORE SETTINGS & INTEGRATIONS */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === "settings" && settingsForm && (
        <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Integration Status Badges (Never exposes sensitive secrets) */}
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px 24px",
              borderRadius: "12px",
              border: "1px solid #e8dfd5",
            }}
          >
            <div style={{ marginBottom: "14px" }}>
              <h3 className="font-serif" style={{ fontSize: "17px", color: "#2c2621", margin: 0 }}>
                Operational Integrations Health
              </h3>
              <span style={{ fontSize: "12px", color: "#8c7d70" }}>
                Server-side provider connections (credentials securely guarded in environment secrets)
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
              <div style={{ padding: "12px 14px", backgroundColor: "#f7f4ee", borderRadius: "8px", border: "1px solid #e8dfd5" }}>
                <div style={{ fontSize: "11px", color: "#8c7d70", textTransform: "uppercase" }}>Razorpay Payments</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#2c2621", marginTop: "2px" }}>
                  {integrationsStatus?.razorpay?.mode || "Active"}
                </div>
                <div style={{ fontSize: "11px", color: "#205a3c", marginTop: "2px" }}>✓ Connected via Server SDK</div>
              </div>

              <div style={{ padding: "12px 14px", backgroundColor: "#f7f4ee", borderRadius: "8px", border: "1px solid #e8dfd5" }}>
                <div style={{ fontSize: "11px", color: "#8c7d70", textTransform: "uppercase" }}>Shiprocket Logistics</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#2c2621", marginTop: "2px" }}>
                  {integrationsStatus?.shiprocket?.status || "Active"}
                </div>
                <div style={{ fontSize: "11px", color: "#205a3c", marginTop: "2px" }}>✓ AWB & Tracking Sync</div>
              </div>

              <div style={{ padding: "12px 14px", backgroundColor: "#f7f4ee", borderRadius: "8px", border: "1px solid #e8dfd5" }}>
                <div style={{ fontSize: "11px", color: "#8c7d70", textTransform: "uppercase" }}>Cloudflare R2 Media</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#2c2621", marginTop: "2px" }}>
                  Bucket: {integrationsStatus?.cloudflareR2?.bucket || "rasa-products"}
                </div>
                <div style={{ fontSize: "11px", color: "#205a3c", marginTop: "2px" }}>✓ Presigned S3 Uplink</div>
              </div>

              <div style={{ padding: "12px 14px", backgroundColor: "#f7f4ee", borderRadius: "8px", border: "1px solid #e8dfd5" }}>
                <div style={{ fontSize: "11px", color: "#8c7d70", textTransform: "uppercase" }}>Transactional Email</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#2c2621", marginTop: "2px" }}>
                  {integrationsStatus?.emailNotifications?.provider || "Active"}
                </div>
                <div style={{ fontSize: "11px", color: "#205a3c", marginTop: "2px" }}>✓ Order Receipts & Alerts</div>
              </div>
            </div>
          </div>

          {/* Store Identification & Contact */}
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px 24px",
              borderRadius: "12px",
              border: "1px solid #e8dfd5",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <h3 className="font-serif" style={{ fontSize: "17px", color: "#2c2621", margin: 0 }}>
                Store Identity & Concierge Contact
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Store Name</label>
                <input
                  type="text"
                  required
                  value={settingsForm.storeName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Brand Tagline</label>
                <input
                  type="text"
                  value={settingsForm.brandTagline}
                  onChange={(e) => setSettingsForm({ ...settingsForm, brandTagline: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Support Email</label>
                <input
                  type="email"
                  required
                  value={settingsForm.supportEmail}
                  onChange={(e) => setSettingsForm({ ...settingsForm, supportEmail: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Support Phone</label>
                <input
                  type="text"
                  required
                  value={settingsForm.supportPhone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, supportPhone: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Concierge WhatsApp</label>
                <input
                  type="text"
                  value={settingsForm.conciergeWhatsApp}
                  onChange={(e) => setSettingsForm({ ...settingsForm, conciergeWhatsApp: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Atelier / Warehouse Address</label>
              <input
                type="text"
                required
                value={settingsForm.warehouseAddress}
                onChange={(e) => setSettingsForm({ ...settingsForm, warehouseAddress: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
              />
            </div>
          </div>

          {/* Shipping, Currency & Taxes */}
          <div
            style={{
              backgroundColor: "#fff",
              padding: "20px 24px",
              borderRadius: "12px",
              border: "1px solid #e8dfd5",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <h3 className="font-serif" style={{ fontSize: "17px", color: "#2c2621", margin: 0 }}>
                Shipping, Tax & Policy Parameters
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Free Shipping Minimum (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settingsForm.freeShippingThresholdRupees}
                  onChange={(e) => setSettingsForm({ ...settingsForm, freeShippingThresholdRupees: Number(e.target.value) })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Standard Shipping Fee (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settingsForm.standardShippingFeeRupees}
                  onChange={(e) => setSettingsForm({ ...settingsForm, standardShippingFeeRupees: Number(e.target.value) })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Return Window (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={settingsForm.returnWindowDays}
                  onChange={(e) => setSettingsForm({ ...settingsForm, returnWindowDays: Number(e.target.value) })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  GST Rate on Silk Sarees (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settingsForm.taxRatePercentage}
                  onChange={(e) => setSettingsForm({ ...settingsForm, taxRatePercentage: Number(e.target.value) })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  GSTIN Registration Number
                </label>
                <input
                  type="text"
                  value={settingsForm.gstinNumber}
                  onChange={(e) => setSettingsForm({ ...settingsForm, gstinNumber: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Timezone
                </label>
                <input
                  type="text"
                  disabled
                  value={settingsForm.timezone}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8dfd5", borderRadius: "6px", fontSize: "13px", backgroundColor: "#f7f4ee" }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 24px",
                backgroundColor: "var(--btn-dark, #2e3830)",
                color: "#f7f4ee",
                borderRadius: "8px",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Save Store Settings
            </button>
          </div>
        </form>
      )}

      {/* Revision History Modal */}
      {showRevisionModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(44,38,33,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: "12px",
              padding: "24px",
              border: "1px solid #e8dfd5",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e8dfd5", paddingBottom: "12px", marginBottom: "16px" }}>
              <h3 className="font-serif" style={{ fontSize: "18px", color: "#2c2621", margin: 0 }}>
                Content Revision History
              </h3>
              <button
                type="button"
                onClick={() => setShowRevisionModal(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#8c7d70" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(showRevisionModal === "homepage" ? homepageRevisions : pageRevisions).map((rev) => (
                <div
                  key={rev.version}
                  style={{
                    padding: "12px 14px",
                    backgroundColor: "#f7f4ee",
                    borderRadius: "8px",
                    border: "1px solid #e8dfd5",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "#2c2621" }}>
                      Version {rev.version}
                    </div>
                    <div style={{ fontSize: "11px", color: "#8c7d70", marginTop: "2px" }}>
                      {new Date(rev.timestamp).toLocaleString()} • {rev.changeSummary || "Revision saved"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRollback(selectedPageSlug, rev.version)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "#fff",
                      border: "1px solid #e8dfd5",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#842029",
                      cursor: "pointer",
                    }}
                  >
                    Rollback
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
