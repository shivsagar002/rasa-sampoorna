import { z } from "zod";

/**
 * Validates that URLs are safe internal paths (starting with /)
 * or secure external URLs (starting with https://).
 * Rejects javascript:, data:, or insecure protocols.
 */
export const safeLinkSchema = z
  .string()
  .trim()
  .refine(
    (url) => {
      if (!url || url === "#") return true;
      if (url.startsWith("/")) return true;
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Link must be a relative path (starting with /) or a secure URL (starting with https://)" }
  );

export const safeImageSchema = z
  .string()
  .trim()
  .refine(
    (url) => {
      if (!url) return true;
      if (url.startsWith("/")) return true;
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Image must be a local asset path (starting with /) or secure CDN URL (https://)" }
  );

// -------------------------------------------------------------
// HOMEPAGE CMS SCHEMA
// -------------------------------------------------------------

export const promoStripSchema = z.object({
  isEnabled: z.boolean().default(true),
  message: z.string().min(3, "Announcement text must be at least 3 characters").max(200),
  linkText: z.string().max(50).optional(),
  linkUrl: safeLinkSchema.optional(),
  imageUrl: safeImageSchema.optional(),
  showPopup: z.boolean().default(true),
  popupTitle: z.string().max(100).optional(),
  popupDescription: z.string().max(300).optional(),
});

export const heroContentSchema = z.object({
  eyebrow: z.string().max(100).default("By Hrdyasara — Handcrafted Heritage"),
  title: z.string().min(3).max(150).default("Living Silk, Woven with Soul"),
  subtitle: z.string().max(350).default("Pure handloom silk sarees crafted by master artisan communities across India."),
  primaryCtaLabel: z.string().max(40).default("Explore Creations"),
  primaryCtaUrl: safeLinkSchema.default("/shop"),
  secondaryCtaLabel: z.string().max(40).default("Our Artisan Story"),
  secondaryCtaUrl: safeLinkSchema.default("/#makers"),
  bannerImageUrl: safeImageSchema.default("/products/saree-lotus-main.jpg"),
});

export const homepageSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  isVisible: z.boolean().default(true),
  title: z.string().max(100).optional(),
  description: z.string().max(300).optional(),
});

export const homepageCmsSchema = z.object({
  promoStrip: promoStripSchema,
  hero: heroContentSchema,
  sections: z.array(homepageSectionSchema).default([
    { id: "discovery", name: "Heritage Discovery Cards", isVisible: true },
    { id: "collections", name: "Curated Collections", isVisible: true },
    { id: "craftMakers", name: "Artisan Collective & Makers", isVisible: true },
    { id: "corporateGifting", name: "Corporate Gifting", isVisible: true },
    { id: "featuredProducts", name: "Featured Sarees", isVisible: true },
    { id: "makingProcess", name: "The Handloom Process", isVisible: true },
    { id: "brandPhilosophy", name: "Philosophy & FAQs", isVisible: true },
    { id: "finalCta", name: "Final Call to Action", isVisible: true },
  ]),
  featuredCategories: z.object({
    title: z.string().default("Curated Weaves & Fabrics"),
    subtitle: z.string().default("Authentic mastercraft from historic Indian weaving clusters"),
    categorySlugs: z.array(z.string()).default(["kanjivaram", "banarasi", "chanderi", "tussar"]),
  }),
  featuredProducts: z.object({
    title: z.string().default("Signature Masterpieces"),
    subtitle: z.string().default("Hand-selected sarees exemplifying generational artistry"),
    maxItems: z.number().int().min(1).max(24).default(8),
  }),
});

export type HomepageCms = z.infer<typeof homepageCmsSchema>;

// -------------------------------------------------------------
// INFORMATIONAL & POLICY PAGES CMS SCHEMA
// -------------------------------------------------------------

export const contentSectionSchema = z.object({
  id: z.string(),
  heading: z.string().min(2, "Section heading required"),
  body: z.string().min(10, "Section body required"),
  highlightBox: z
    .object({
      title: z.string(),
      text: z.string(),
    })
    .optional(),
});

export const faqItemSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(5, "Question required"),
  answer: z.string().min(10, "Answer required"),
  category: z.string().default("General"),
});

export const contentPageCmsSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(2),
  eyebrow: z.string().optional(),
  summary: z.string().optional(),
  lastUpdated: z.string().optional(),
  sections: z.array(contentSectionSchema).default([]),
  faqs: z.array(faqItemSchema).optional(),
});

export type ContentPageCms = z.infer<typeof contentPageCmsSchema>;

// -------------------------------------------------------------
// STORE SETTINGS SCHEMA
// -------------------------------------------------------------

export const storeSettingsSchema = z.object({
  storeName: z.string().min(2).default("RASA Sampoorna"),
  brandTagline: z.string().default("By Hrdyasara — Handcrafted Heritage Sarees"),
  supportEmail: z.string().email().default("orders@rasasampoorna.com"),
  supportPhone: z.string().default("+91 98450 12345"),
  conciergeWhatsApp: z.string().default("+91 98450 12345"),
  warehouseAddress: z
    .string()
    .default("RASA Sampoorna Atelier, Indiranagar 100ft Road, Bengaluru, Karnataka 560038, India"),
  operatingHours: z.string().default("Monday to Saturday, 10:00 AM - 7:00 PM IST"),
  currencyCode: z.string().default("INR"),
  currencySymbol: z.string().default("₹"),
  timezone: z.string().default("Asia/Kolkata"),
  freeShippingThresholdRupees: z.number().int().min(0).default(1999),
  standardShippingFeeRupees: z.number().int().min(0).default(150),
  expressShippingFeeRupees: z.number().int().min(0).default(350),
  taxRatePercentage: z.number().min(0).max(100).default(5.0),
  gstinNumber: z.string().default("29AABCH1234F1Z5"),
  returnWindowDays: z.number().int().min(1).max(30).default(7),
  cancellationAllowedUntilShipped: z.boolean().default(true),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;

// -------------------------------------------------------------
// CMS REVISION SCHEMA
// -------------------------------------------------------------

export const cmsRevisionSchema = z.object({
  version: z.number().int(),
  timestamp: z.string(),
  author: z.string(),
  changeSummary: z.string().optional(),
  payload: z.any(),
});

export type CmsRevision = z.infer<typeof cmsRevisionSchema>;

// -------------------------------------------------------------
// INQUIRIES & CONTACT SCHEMAS (PRESERVED)
// -------------------------------------------------------------

export const corporateInquirySchema = z.object({
  name: z.string().min(2, "Name is required").trim(),
  organization: z.string().min(2, "Company or organization name is required").trim(),
  email: z.string().email("Valid email is required").toLowerCase().trim(),
  phone: z.string().min(10, "Valid phone number is required").trim(),
  quantityRange: z.string().min(1, "Please select an estimated quantity range"),
  budget: z.string().min(1, "Please select a budget range"),
  message: z.string().min(10, "Please provide more details about your inquiry").trim(),
});

export const contactMessageSchema = z.object({
  name: z.string().min(2, "Name is required").trim(),
  email: z.string().email("Valid email is required").toLowerCase().trim(),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters").trim(),
});

export type CorporateInquiryInput = z.infer<typeof corporateInquirySchema>;
export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
