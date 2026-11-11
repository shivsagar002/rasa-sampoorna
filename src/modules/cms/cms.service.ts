import { prisma } from "@/lib/db/prisma";
import {
  CorporateInquiryInput,
  ContactMessageInput,
  HomepageCms,
  homepageCmsSchema,
  ContentPageCms,
  contentPageCmsSchema,
  StoreSettings,
  storeSettingsSchema,
  CmsRevision,
} from "./cms.schema";
import { sendEmail } from "@/lib/email/email-service";
import { env } from "@/lib/validation/env";
import { logger } from "@/lib/observability/logger";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

// -------------------------------------------------------------
// IN-MEMORY MICRO-CACHE (Edge/Instance performance boost)
// -------------------------------------------------------------
const CMS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cmsMemoryCache = new Map<string, { data: any; expiresAt: number }>();

function getCmsCache<T>(key: string): T | null {
  const item = cmsMemoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cmsMemoryCache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCmsCache<T>(key: string, data: T, ttlMs = CMS_CACHE_TTL_MS): void {
  cmsMemoryCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCmsCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cmsMemoryCache.clear();
  } else {
    for (const key of Array.from(cmsMemoryCache.keys())) {
      if (key.startsWith(keyPrefix)) {
        cmsMemoryCache.delete(key);
      }
    }
  }
}

// -------------------------------------------------------------
// DEFAULT FALLBACK CONTENT (Zero broken UI when DB is empty)
// -------------------------------------------------------------

export const DEFAULT_HOMEPAGE_CMS: HomepageCms = {
  promoStrip: {
    isEnabled: true,
    message: "Complimentary domestic express delivery across India on all artisan saree orders above ₹1,999",
    linkText: "Shop Handlooms",
    linkUrl: "/shop",
    imageUrl: "/products/saree-lotus-main.jpg",
    showPopup: true,
    popupTitle: "Festive Silk Masterpieces",
    popupDescription: "Enjoy complimentary domestic delivery and bespoke gift packaging with every handcrafted pure silk saree order above ₹1,999.",
  },
  hero: {
    eyebrow: "By Hrdyasara — Handcrafted Heritage",
    title: "Living Silk, Woven with Soul",
    subtitle: "Pure handloom silk sarees crafted by master artisan communities across India.",
    primaryCtaLabel: "Explore Creations",
    primaryCtaUrl: "/shop",
    secondaryCtaLabel: "Our Artisan Story",
    secondaryCtaUrl: "/#makers",
    bannerImageUrl: "/products/saree-lotus-main.jpg",
  },
  sections: [
    { id: "discovery", name: "Heritage Discovery Cards", isVisible: true },
    { id: "collections", name: "Curated Collections", isVisible: true },
    { id: "craftMakers", name: "Artisan Collective & Makers", isVisible: true },
    { id: "corporateGifting", name: "Corporate Gifting", isVisible: true },
    { id: "featuredProducts", name: "Featured Sarees", isVisible: true },
    { id: "makingProcess", name: "The Handloom Process", isVisible: true },
    { id: "brandPhilosophy", name: "Philosophy & FAQs", isVisible: true },
    { id: "finalCta", name: "Final Call to Action", isVisible: true },
  ],
  featuredCategories: {
    title: "Curated Weaves & Fabrics",
    subtitle: "Authentic mastercraft from historic Indian weaving clusters",
    categorySlugs: ["kanjivaram", "banarasi", "chanderi", "tussar"],
  },
  featuredProducts: {
    title: "Signature Masterpieces",
    subtitle: "Hand-selected sarees exemplifying generational artistry",
    maxItems: 8,
  },
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: "RASA Sampoorna",
  brandTagline: "By Hrdyasara — Handcrafted Heritage Sarees",
  supportEmail: "orders@rasasampoorna.com",
  supportPhone: "+91 98450 12345",
  conciergeWhatsApp: "+91 98450 12345",
  warehouseAddress: "RASA Sampoorna Atelier, Indiranagar 100ft Road, Bengaluru, Karnataka 560038, India",
  operatingHours: "Monday to Saturday, 10:00 AM - 7:00 PM IST",
  currencyCode: "INR",
  currencySymbol: "₹",
  timezone: "Asia/Kolkata",
  freeShippingThresholdRupees: 1999,
  standardShippingFeeRupees: 150,
  expressShippingFeeRupees: 350,
  taxRatePercentage: 5.0,
  gstinNumber: "29AABCH1234F1Z5",
  returnWindowDays: 7,
  cancellationAllowedUntilShipped: true,
};

export const DEFAULT_POLICY_PAGES: Record<string, ContentPageCms> = {
  "shipping-policy": {
    slug: "shipping-policy",
    title: "Shipping & Delivery Policy",
    eyebrow: "RASA Sampoorna (By Hrdyasara)",
    summary: "Details on domestic and international shipping timelines, packaging standards, tracking procedures, and rates for RASA Sampoorna handcrafted creations.",
    lastUpdated: "January 2026",
    sections: [
      {
        id: "dispatch",
        heading: "1. Artisanal Handling & Dispatch Timelines",
        body: "Because our creations are crafted by hand and inspected individually for quality and finishing, ready-to-ship pieces are dispatched within 2 to 4 business days. Custom or made-to-order sarees require 10 to 18 business days for weaving and finishing.",
        highlightBox: {
          title: "Complimentary Domestic Shipping",
          text: "Free standard shipping applies automatically to all domestic orders valued at ₹1,999 or higher across India.",
        },
      },
      {
        id: "domestic-delivery",
        heading: "2. Domestic Transit Standards",
        body: "All domestic packages are entrusted to express air couriers via Shiprocket. Metro deliveries take 2 to 4 business days following dispatch, while regional locations require 4 to 7 business days. Full real-time AWB tracking is provided via SMS and email.",
      },
      {
        id: "packaging",
        heading: "3. Archival Protective Packaging",
        body: "Each drape is wrapped in acid-free tissue, nestled in an organic cotton muslin bag, and packaged in a reinforced keepsake box designed to safeguard pure zari and delicate natural silks against moisture and creasing.",
      },
    ],
  },
  "refund-policy": {
    slug: "refund-policy",
    title: "Cancellation, Returns & Refunds Policy",
    eyebrow: "RASA Sampoorna (By Hrdyasara)",
    summary: "Transparent return guidelines, transit damage replacements, and refund mechanisms for RASA Sampoorna handcrafted creations.",
    lastUpdated: "January 2026",
    sections: [
      {
        id: "returns",
        heading: "1. 7-Day Return Window",
        body: "We stand behind the authenticity and quality of every handloom drape. If you are not completely delighted with your purchase, you may initiate a return within 7 calendar days of physical delivery.",
        highlightBox: {
          title: "Eligibility Criteria",
          text: "Sarees must remain unworn, unwashed, unaltered (with unstitched blouse fabric intact), with original tags and security ribbons attached.",
        },
      },
      {
        id: "reverse-pickup",
        heading: "2. Complimentary Reverse Logistics",
        body: "Upon admin approval of an eligible return, our courier partner will arrange reverse pickup directly from your doorstep at zero additional fee for all serviceable pin codes across India.",
      },
      {
        id: "refund-timeline",
        heading: "3. Direct Gateway Refunds",
        body: "Following physical receipt and inspection at our atelier, refunds are credited back to the original payment source (UPI, Card, Netbanking) within 5 to 7 business days via Razorpay.",
      },
    ],
  },
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy & Data Protection Policy",
    eyebrow: "RASA Sampoorna (By Hrdyasara)",
    summary: "Learn how RASA Sampoorna (By Hrdyasara) collects, uses, and safeguards your personal data with utmost transparency and care.",
    lastUpdated: "January 2026",
    sections: [
      {
        id: "data-collection",
        heading: "1. Information We Collect",
        body: "We collect only essential details required to process, fulfill, and deliver your orders: name, shipping address, contact phone, and email address. We never store credit/debit card numbers, CVVs, or bank credentials.",
      },
      {
        id: "data-security",
        heading: "2. Payment & Cryptographic Security",
        body: "All payment transactions are encrypted and processed through RBI-licensed payment aggregators (Razorpay). Guest access to order tracking is safeguarded using HMAC-SHA256 digital signatures to prevent unauthorized order inspection.",
      },
    ],
  },
  "terms-and-conditions": {
    slug: "terms-and-conditions",
    title: "Terms & Conditions of Patronage",
    eyebrow: "RASA Sampoorna (By Hrdyasara)",
    summary: "Review the Terms and Conditions governing purchases, website usage, intellectual property, and community guidelines for RASA Sampoorna (By Hrdyasara).",
    lastUpdated: "January 2026",
    sections: [
      {
        id: "craft-variation",
        heading: "1. Handloom Characteristics & Authentic Irregularities",
        body: "Because our sarees are woven by human hands on traditional pit looms and shuttle looms, subtle variations in weave density, slub texture, and natural dye tones are hallmarks of genuine artisan craftsmanship rather than defects.",
      },
      {
        id: "pricing-taxes",
        heading: "2. Pricing & Indian Taxes",
        body: "All prices are listed in Indian Rupees (₹) inclusive of 5% Goods and Services Tax (GST) applicable to handloom silk textiles under Indian law.",
      },
    ],
  },
  faq: {
    slug: "faq",
    title: "Frequently Asked Questions",
    eyebrow: "Patron Assistance & Saree Care",
    lastUpdated: "January 2026",
    sections: [],
    faqs: [
      {
        question: "How do I care for my pure handloom silk saree?",
        answer: "We strictly recommend dry cleaning for all pure silk and zari sarees. Store your drape wrapped in breathable muslin fabric, avoid direct exposure to perfumes, and refold periodically along alternate crease lines.",
        category: "Care & Maintenance",
      },
      {
        question: "Does the saree come with an attached blouse piece?",
        answer: "Yes, all our handloom silk sarees include an attached unstitched running blouse fabric measuring 80cm to 1 meter in coordinating silk.",
        category: "Product Details",
      },
      {
        question: "What is your standard shipping timeline?",
        answer: "Ready-to-ship creations are dispatched within 2 to 4 business days via express courier, with tracking details sent immediately upon dispatch.",
        category: "Shipping & Delivery",
      },
      {
        question: "How does the 7-day return process work?",
        answer: "You can request a return directly from your Order Tracking page within 7 days of delivery. Once reviewed, our courier coordinates doorstep pickup and your refund is processed upon inspection.",
        category: "Returns & Exchanges",
      },
    ],
  },
};

export interface StoredCmsRecord {
  status: "DRAFT" | "PUBLISHED";
  version: number;
  published: any;
  draft: any;
  revisions: CmsRevision[];
  updatedAt: string;
}

export class CmsService {
  /**
   * Internal helper: safely parses stored JSON payload
   */
  private parseCmsRecord(payloadStr: string | null): StoredCmsRecord | null {
    if (!payloadStr) return null;
    try {
      return JSON.parse(payloadStr);
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------
  // HOMEPAGE CMS
  // -------------------------------------------------------------

  /**
   * Retrieves Homepage CMS content.
   * If preview === true and caller is authorized, serves draft; otherwise serves live published.
   */
  async getHomepageCms(options?: { preview?: boolean }): Promise<{
    content: HomepageCms;
    status: "DRAFT" | "PUBLISHED";
    version: number;
    isPreview: boolean;
  }> {
    const isPreviewRequested = Boolean(options?.preview);
    const cacheKey = "cms:homepage:published";

    if (!isPreviewRequested) {
      const cached = getCmsCache<{
        content: HomepageCms;
        status: "DRAFT" | "PUBLISHED";
        version: number;
        isPreview: boolean;
      }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const record = await prisma.cmsContent.findUnique({
        where: { slug: "homepage" },
      });

      if (!record || !record.isActive) {
        const fallback = {
          content: DEFAULT_HOMEPAGE_CMS,
          status: "PUBLISHED" as const,
          version: 1,
          isPreview: false,
        };
        if (!isPreviewRequested) setCmsCache(cacheKey, fallback);
        return fallback;
      }

      const parsed = this.parseCmsRecord(record.payload);
      if (!parsed) {
        const fallback = {
          content: DEFAULT_HOMEPAGE_CMS,
          status: "PUBLISHED" as const,
          version: 1,
          isPreview: false,
        };
        if (!isPreviewRequested) setCmsCache(cacheKey, fallback);
        return fallback;
      }

      const isPreview = Boolean(options?.preview && parsed.draft);
      const targetPayload = isPreview ? parsed.draft : parsed.published || parsed.draft;
      const validated = homepageCmsSchema.safeParse(targetPayload);

      const result = {
        content: validated.success ? validated.data : DEFAULT_HOMEPAGE_CMS,
        status: parsed.status || "PUBLISHED",
        version: parsed.version || 1,
        isPreview,
      };

      if (!isPreview) {
        setCmsCache(cacheKey, result);
      }

      return result;
    } catch (err) {
      logger.warn("[CmsFetchFallback]", { slug: "homepage", err });
      return {
        content: DEFAULT_HOMEPAGE_CMS,
        status: "PUBLISHED",
        version: 1,
        isPreview: false,
      };
    }
  }

  /**
   * Saves Homepage CMS draft
   */
  async saveHomepageDraft(input: HomepageCms, author: string, changeSummary?: string) {
    const validated = homepageCmsSchema.parse(input);

    const existing = await prisma.cmsContent.findUnique({
      where: { slug: "homepage" },
    });

    const parsedExisting: StoredCmsRecord = existing
      ? this.parseCmsRecord(existing.payload) || {
          status: "DRAFT",
          version: 1,
          published: DEFAULT_HOMEPAGE_CMS,
          draft: validated,
          revisions: [],
          updatedAt: new Date().toISOString(),
        }
      : {
          status: "DRAFT",
          version: 1,
          published: DEFAULT_HOMEPAGE_CMS,
          draft: validated,
          revisions: [],
          updatedAt: new Date().toISOString(),
        };

    const newRecord: StoredCmsRecord = {
      ...parsedExisting,
      draft: validated,
      status: "DRAFT",
      updatedAt: new Date().toISOString(),
    };

    const updated = await prisma.cmsContent.upsert({
      where: { slug: "homepage" },
      create: {
        slug: "homepage",
        title: "Storefront Homepage CMS",
        section: "homepage",
        payload: JSON.stringify(newRecord),
        isActive: true,
      },
      update: {
        payload: JSON.stringify(newRecord),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: author,
        action: "CMS_DRAFT_SAVED",
        entity: "CmsContent",
        entityId: updated.id,
        details: JSON.stringify({ slug: "homepage", changeSummary }),
      },
    });

    return { success: true, version: newRecord.version, status: newRecord.status };
  }

  // -------------------------------------------------------------
  // INFORMATIONAL / POLICY PAGES CMS
  // -------------------------------------------------------------

  /**
   * Retrieves content for an informational page (About, FAQs, Shipping, Refunds, Terms, etc.)
   */
  async getPageContent(
    slug: string,
    options?: { preview?: boolean }
  ): Promise<{
    content: ContentPageCms;
    status: "DRAFT" | "PUBLISHED";
    version: number;
    isPreview: boolean;
  }> {
    const defaultPage = DEFAULT_POLICY_PAGES[slug] || {
      slug,
      title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      sections: [],
    };

    try {
      const record = await prisma.cmsContent.findUnique({
        where: { slug },
      });

      if (!record || !record.isActive) {
        return { content: defaultPage, status: "PUBLISHED", version: 1, isPreview: false };
      }

      const parsed = this.parseCmsRecord(record.payload);
      if (!parsed) {
        return { content: defaultPage, status: "PUBLISHED", version: 1, isPreview: false };
      }

      const isPreview = Boolean(options?.preview && parsed.draft);
      const targetPayload = isPreview ? parsed.draft : parsed.published || parsed.draft;
      const validated = contentPageCmsSchema.safeParse(targetPayload);

      return {
        content: validated.success ? validated.data : defaultPage,
        status: parsed.status || "PUBLISHED",
        version: parsed.version || 1,
        isPreview,
      };
    } catch (err) {
      logger.warn("[CmsPageFallback]", { slug, err });
      return { content: defaultPage, status: "PUBLISHED", version: 1, isPreview: false };
    }
  }

  /**
   * Saves draft for a content page
   */
  async savePageDraft(input: ContentPageCms, author: string, changeSummary?: string) {
    const validated = contentPageCmsSchema.parse(input);

    const existing = await prisma.cmsContent.findUnique({
      where: { slug: validated.slug },
    });

    const parsedExisting: StoredCmsRecord = existing
      ? this.parseCmsRecord(existing.payload) || {
          status: "DRAFT",
          version: 1,
          published: DEFAULT_POLICY_PAGES[validated.slug] || validated,
          draft: validated,
          revisions: [],
          updatedAt: new Date().toISOString(),
        }
      : {
          status: "DRAFT",
          version: 1,
          published: DEFAULT_POLICY_PAGES[validated.slug] || validated,
          draft: validated,
          revisions: [],
          updatedAt: new Date().toISOString(),
        };

    const newRecord: StoredCmsRecord = {
      ...parsedExisting,
      draft: validated,
      status: "DRAFT",
      updatedAt: new Date().toISOString(),
    };

    const updated = await prisma.cmsContent.upsert({
      where: { slug: validated.slug },
      create: {
        slug: validated.slug,
        title: validated.title,
        section: "legal",
        payload: JSON.stringify(newRecord),
        isActive: true,
      },
      update: {
        title: validated.title,
        payload: JSON.stringify(newRecord),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: author,
        action: "CMS_DRAFT_SAVED",
        entity: "CmsContent",
        entityId: updated.id,
        details: JSON.stringify({ slug: validated.slug, changeSummary }),
      },
    });

    return { success: true, version: newRecord.version, status: newRecord.status };
  }

  // -------------------------------------------------------------
  // PUBLISHING, REVISIONS & ROLLBACK
  // -------------------------------------------------------------

  /**
   * Promotes current draft to published, creates snapshot in revision history
   */
  async publishContent(slug: string, author: string) {
    const record = await prisma.cmsContent.findUnique({
      where: { slug },
    });

    if (!record) {
      throw new NotFoundError(`CMS content with slug '${slug}'`);
    }

    const parsed = this.parseCmsRecord(record.payload);
    if (!parsed || !parsed.draft) {
      throw new ValidationError("No draft content available to publish.");
    }

    const nextVersion = (parsed.version || 1) + 1;
    const revision: CmsRevision = {
      version: parsed.version || 1,
      timestamp: new Date().toISOString(),
      author,
      changeSummary: `Published version ${nextVersion}`,
      payload: parsed.draft,
    };

    // Keep up to 20 latest revisions
    const revisions = [revision, ...(parsed.revisions || [])].slice(0, 20);

    const updatedRecord: StoredCmsRecord = {
      status: "PUBLISHED",
      version: nextVersion,
      published: parsed.draft,
      draft: parsed.draft,
      revisions,
      updatedAt: new Date().toISOString(),
    };

    await prisma.cmsContent.update({
      where: { slug },
      data: {
        payload: JSON.stringify(updatedRecord),
      },
    });

    invalidateCmsCache(`cms:${slug}`);
    invalidateCmsCache("cms:content:");

    await prisma.auditLog.create({
      data: {
        userId: author,
        action: "CMS_CONTENT_PUBLISHED",
        entity: "CmsContent",
        entityId: record.id,
        details: JSON.stringify({ slug, version: nextVersion }),
      },
    });

    return { success: true, version: nextVersion, status: "PUBLISHED" };
  }

  /**
   * Retrieves revision history for a CMS page
   */
  async getRevisions(slug: string): Promise<CmsRevision[]> {
    const record = await prisma.cmsContent.findUnique({
      where: { slug },
    });

    if (!record) return [];
    const parsed = this.parseCmsRecord(record.payload);
    return parsed?.revisions || [];
  }

  /**
   * Rolls back a CMS page to a specific historical revision
   */
  async rollbackRevision(slug: string, targetVersion: number, author: string) {
    const record = await prisma.cmsContent.findUnique({
      where: { slug },
    });

    if (!record) throw new NotFoundError(`CMS content with slug '${slug}'`);
    const parsed = this.parseCmsRecord(record.payload);
    if (!parsed) throw new ValidationError("Invalid CMS record.");

    const targetRev = parsed.revisions?.find((r) => r.version === targetVersion);
    if (!targetRev) {
      throw new NotFoundError(`Revision version ${targetVersion}`);
    }

    const nextVersion = (parsed.version || 1) + 1;
    const rollbackRevisionSnapshot: CmsRevision = {
      version: parsed.version,
      timestamp: new Date().toISOString(),
      author,
      changeSummary: `Rollback to version ${targetVersion}`,
      payload: parsed.published || parsed.draft,
    };

    const revisions = [rollbackRevisionSnapshot, ...(parsed.revisions || [])].slice(0, 20);

    const updatedRecord: StoredCmsRecord = {
      status: "PUBLISHED",
      version: nextVersion,
      published: targetRev.payload,
      draft: targetRev.payload,
      revisions,
      updatedAt: new Date().toISOString(),
    };

    await prisma.cmsContent.update({
      where: { slug },
      data: {
        payload: JSON.stringify(updatedRecord),
      },
    });

    invalidateCmsCache(`cms:${slug}`);
    invalidateCmsCache("cms:content:");

    await prisma.auditLog.create({
      data: {
        userId: author,
        action: "CMS_ROLLBACK_EXECUTED",
        entity: "CmsContent",
        entityId: record.id,
        details: JSON.stringify({ slug, targetVersion, restoredToVersion: nextVersion }),
      },
    });

    return { success: true, version: nextVersion, restoredFrom: targetVersion };
  }

  // -------------------------------------------------------------
  // STORE SETTINGS & INTEGRATIONS STATUS
  // -------------------------------------------------------------

  /**
   * Retrieves store settings merged with non-sensitive integration status flags
   */
  async getStoreSettings(): Promise<{
    settings: StoreSettings;
    integrations: {
      razorpay: { configured: boolean; mode: string };
      shiprocket: { configured: boolean; status: string };
      cloudflareR2: { configured: boolean; bucket: string };
      emailNotifications: { configured: boolean; provider: string };
    };
  }> {
    const cachedSettings = getCmsCache<StoreSettings>("cms:store-settings:payload");
    let settings = cachedSettings || DEFAULT_STORE_SETTINGS;

    if (!cachedSettings) {
      try {
        const record = await prisma.cmsContent.findUnique({
          where: { slug: "store-settings" },
        });

        if (record) {
          const parsed = this.parseCmsRecord(record.payload);
          const target = parsed?.published || parsed?.draft || parsed;
          const validated = storeSettingsSchema.safeParse(target);
          if (validated.success) {
            settings = validated.data;
            setCmsCache("cms:store-settings:payload", settings);
          }
        }
      } catch (err) {
        logger.warn("[StoreSettingsFetchFallback]", { err });
      }
    }

    // Secure integration status flags (Never expose secret tokens/keys)
    const isRazorpayConfigured = Boolean(
      env.RAZORPAY_KEY_ID &&
      env.RAZORPAY_KEY_SECRET &&
      !env.RAZORPAY_KEY_ID.includes("placeholder")
    );
    const razorpayMode = env.RAZORPAY_KEY_ID?.startsWith("rzp_live") ? "Production" : "Sandbox / Test";

    const isShiprocketConfigured = Boolean(
      env.SHIPROCKET_EMAIL &&
      env.SHIPROCKET_PASSWORD &&
      !env.SHIPROCKET_EMAIL.includes("placeholder") &&
      !env.SHIPROCKET_PASSWORD.includes("placeholder")
    );

    const isR2Configured = Boolean(
      env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      !env.R2_ACCOUNT_ID.includes("placeholder")
    );

    const isEmailConfigured = Boolean(
      env.RESEND_API_KEY && !env.RESEND_API_KEY.includes("placeholder")
    );

    return {
      settings,
      integrations: {
        razorpay: {
          configured: isRazorpayConfigured,
          mode: isRazorpayConfigured ? razorpayMode : "Mock Sandbox Mode",
        },
        shiprocket: {
          configured: isShiprocketConfigured,
          status: isShiprocketConfigured ? "Connected (REST API)" : "Mock Fallback Active",
        },
        cloudflareR2: {
          configured: isR2Configured,
          bucket: env.R2_BUCKET_NAME || "rasa-products",
        },
        emailNotifications: {
          configured: isEmailConfigured,
          provider: isEmailConfigured ? "Resend" : "Console Logger Mock",
        },
      },
    };
  }

  /**
   * Saves updated store settings
   */
  async saveStoreSettings(input: StoreSettings, author: string) {
    const validated = storeSettingsSchema.parse(input);

    const record: StoredCmsRecord = {
      status: "PUBLISHED",
      version: 1,
      published: validated,
      draft: validated,
      revisions: [],
      updatedAt: new Date().toISOString(),
    };

    const updated = await prisma.cmsContent.upsert({
      where: { slug: "store-settings" },
      create: {
        slug: "store-settings",
        title: "Store Settings Configuration",
        section: "settings",
        payload: JSON.stringify(record),
        isActive: true,
      },
      update: {
        payload: JSON.stringify(record),
      },
    });

    invalidateCmsCache("cms:store-settings");

    await prisma.auditLog.create({
      data: {
        userId: author,
        action: "STORE_SETTINGS_UPDATED",
        entity: "CmsContent",
        entityId: updated.id,
        details: JSON.stringify({ currency: validated.currencyCode, taxRate: validated.taxRatePercentage }),
      },
    });

    return { success: true, settings: validated };
  }

  // -------------------------------------------------------------
  // INQUIRIES & CONTACT FORM SUBMISSIONS (PRESERVED)
  // -------------------------------------------------------------

  /**
   * Submit corporate gifting inquiry
   */
  async submitCorporateInquiry(input: CorporateInquiryInput) {
    const inquiry = await prisma.corporateInquiry.create({
      data: input,
    });

    // Notify business admin
    await sendEmail({
      to: env.NOTIFICATIONS_ADMIN_EMAIL,
      subject: `New Corporate Gifting Inquiry from ${input.organization}`,
      html: `
        <h2>Corporate Gifting Inquiry</h2>
        <p><strong>Contact:</strong> ${input.name} (${input.email}, ${input.phone})</p>
        <p><strong>Organization:</strong> ${input.organization}</p>
        <p><strong>Quantity:</strong> ${input.quantityRange}</p>
        <p><strong>Budget:</strong> ${input.budget}</p>
        <p><strong>Message:</strong></p>
        <blockquote>${input.message}</blockquote>
      `,
    });

    // Send patron receipt
    await sendEmail({
      to: input.email,
      subject: `Thank you for contacting RASA Sampoorna — Corporate Gifting`,
      html: `
        <p>Dear ${input.name},</p>
        <p>Thank you for considering RASA Sampoorna for your organization's gifting requirements. We have received your inquiry for <strong>${input.organization}</strong>.</p>
        <p>Our dedicated corporate gifting curator will review your specifications and contact you within 24 business hours.</p>
      `,
    });

    return inquiry;
  }

  /**
   * Submit contact form message
   */
  async submitContactMessage(input: ContactMessageInput) {
    const message = await prisma.contactMessage.create({
      data: input,
    });

    logger.info("[NewContactMessage]", { id: message.id, email: input.email });

    return message;
  }
}

export const cmsService = new CmsService();
