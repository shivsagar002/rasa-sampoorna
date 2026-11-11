import { describe, it, expect, vi, beforeEach } from "vitest";
import { CmsService, DEFAULT_HOMEPAGE_CMS, DEFAULT_POLICY_PAGES, DEFAULT_STORE_SETTINGS, invalidateCmsCache } from "@/modules/cms/cms.service";
import { safeLinkSchema, safeImageSchema, storeSettingsSchema } from "@/modules/cms/cms.schema";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    cmsContent: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("CMS & Store Settings Module Unit Tests", () => {
  let cmsService: CmsService;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCmsCache();
    cmsService = new CmsService();
  });

  describe("Security: Link & Image Validation", () => {
    it("accepts safe relative paths and https links", () => {
      expect(safeLinkSchema.safeParse("/shop").success).toBe(true);
      expect(safeLinkSchema.safeParse("/shop/kanjivaram-silk").success).toBe(true);
      expect(safeLinkSchema.safeParse("https://instagram.com/rasasampoorna").success).toBe(true);
      expect(safeLinkSchema.safeParse("").success).toBe(true);
    });

    it("strictly rejects javascript: and malicious link schemes", () => {
      expect(safeLinkSchema.safeParse("javascript:alert(1)").success).toBe(false);
      expect(safeLinkSchema.safeParse("javascript:void(0)").success).toBe(false);
      expect(safeLinkSchema.safeParse("data:text/html;base64,PHNjcmlwdD4=").success).toBe(false);
      expect(safeLinkSchema.safeParse("http://insecure-site.com").success).toBe(false);
    });

    it("validates image URLs and rejects unsafe protocols", () => {
      expect(safeImageSchema.safeParse("/products/saree-lotus.jpg").success).toBe(true);
      expect(safeImageSchema.safeParse("https://cdn.rasasampoorna.com/banner.webp").success).toBe(true);
      expect(safeImageSchema.safeParse("javascript:alert(2)").success).toBe(false);
    });
  });

  describe("Homepage CMS: Draft Visibility vs. Preview Access", () => {
    it("returns default fallback homepage when database has no record", async () => {
      vi.mocked(prisma.cmsContent.findUnique).mockResolvedValue(null);

      const res = await cmsService.getHomepageCms({ preview: false });

      expect(res.content.hero.title).toBe(DEFAULT_HOMEPAGE_CMS.hero.title);
      expect(res.content.promoStrip.isEnabled).toBe(DEFAULT_HOMEPAGE_CMS.promoStrip.isEnabled);
      expect(res.content.featuredCategories.categorySlugs.length).toBeGreaterThan(0);
      expect(res.status).toBe("PUBLISHED");
      expect(res.isPreview).toBe(false);
    });

    it("public requests (preview: false) see published version, ignoring draft changes", async () => {
      const mockDbRecord = {
        id: "cms-1",
        slug: "homepage",
        title: "Homepage CMS",
        section: "homepage",
        payload: JSON.stringify({
          status: "DRAFT",
          version: 2,
          published: {
            ...DEFAULT_HOMEPAGE_CMS,
            hero: { ...DEFAULT_HOMEPAGE_CMS.hero, title: "Official Published Collection" },
          },
          draft: {
            ...DEFAULT_HOMEPAGE_CMS,
            hero: { ...DEFAULT_HOMEPAGE_CMS.hero, title: "Unpublished Work-in-Progress Title" },
          },
          revisions: [],
          updatedAt: new Date().toISOString(),
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.cmsContent.findUnique).mockResolvedValue(mockDbRecord as any);

      // Public viewer gets published content
      const publicRes = await cmsService.getHomepageCms({ preview: false });
      expect(publicRes.content.hero.title).toBe("Official Published Collection");
      expect(publicRes.isPreview).toBe(false);

      // Staff previewer gets draft content
      const previewRes = await cmsService.getHomepageCms({ preview: true });
      expect(previewRes.content.hero.title).toBe("Unpublished Work-in-Progress Title");
      expect(previewRes.isPreview).toBe(true);
    });
  });

  describe("Publishing Lifecycle & Revision History", () => {
    it("saves a draft without publishing immediately", async () => {
      vi.mocked(prisma.cmsContent.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.cmsContent.upsert).mockResolvedValue({ id: "cms-1" } as any);

      const draftPayload = {
        ...DEFAULT_HOMEPAGE_CMS,
        hero: { ...DEFAULT_HOMEPAGE_CMS.hero, title: "Updated Draft Title" },
      };

      const result = await cmsService.saveHomepageDraft(draftPayload, "staff-user-1");

      expect(result.status).toBe("DRAFT");
      expect(result.version).toBe(1);
      expect(prisma.cmsContent.upsert).toHaveBeenCalledTimes(1);
    });

    it("publishing promotes draft to published and creates a revision snapshot", async () => {
      const initialRecord = {
        id: "cms-1",
        slug: "homepage",
        title: "Homepage CMS",
        section: "homepage",
        payload: JSON.stringify({
          status: "DRAFT",
          version: 1,
          published: DEFAULT_HOMEPAGE_CMS,
          draft: {
            ...DEFAULT_HOMEPAGE_CMS,
            hero: { ...DEFAULT_HOMEPAGE_CMS.hero, title: "Published New Season" },
          },
          revisions: [],
          updatedAt: new Date().toISOString(),
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.cmsContent.findUnique).mockResolvedValue(initialRecord as any);
      vi.mocked(prisma.cmsContent.update).mockResolvedValue({ id: "cms-1" } as any);

      const published = await cmsService.publishContent("homepage", "staff-user-1");

      expect(published.status).toBe("PUBLISHED");
      expect(published.version).toBe(2);
      expect(prisma.cmsContent.update).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it("rolls back to a previous revision safely", async () => {
      const v1Snapshot = {
        ...DEFAULT_HOMEPAGE_CMS,
        hero: { ...DEFAULT_HOMEPAGE_CMS.hero, title: "Original Autumn Collection" },
      };

      const existingRecord = {
        id: "cms-1",
        slug: "homepage",
        title: "Homepage CMS",
        section: "homepage",
        payload: JSON.stringify({
          status: "PUBLISHED",
          version: 2,
          published: {
            ...DEFAULT_HOMEPAGE_CMS,
            hero: { ...DEFAULT_HOMEPAGE_CMS.hero, title: "Flawed Winter Launch" },
          },
          draft: {
            ...DEFAULT_HOMEPAGE_CMS,
            hero: { ...DEFAULT_HOMEPAGE_CMS.hero, title: "Flawed Winter Launch" },
          },
          revisions: [
            {
              version: 1,
              timestamp: new Date().toISOString(),
              author: "staff-user-1",
              changeSummary: "First release",
              payload: v1Snapshot,
            },
          ],
          updatedAt: new Date().toISOString(),
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.cmsContent.findUnique).mockResolvedValue(existingRecord as any);
      vi.mocked(prisma.cmsContent.update).mockResolvedValue({ id: "cms-1" } as any);

      const rollbackResult = await cmsService.rollbackRevision("homepage", 1, "admin-user");

      expect(rollbackResult.version).toBe(3);
      expect(rollbackResult.restoredFrom).toBe(1);
      expect(prisma.cmsContent.update).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe("Content Pages (Policies & Info): Missing Fallbacks & Previews", () => {
    it("returns default shipping policy when database is unseeded", async () => {
      vi.mocked(prisma.cmsContent.findUnique).mockResolvedValue(null);

      const page = await cmsService.getPageContent("shipping-policy");

      expect(page.content.title).toBe("Shipping & Delivery Policy");
      expect(page.content.sections.length).toBeGreaterThan(0);
      expect(page.content.sections[0].heading).toContain("Artisanal Handling");
    });

    it("returns default refund policy with 7-day guarantee details", async () => {
      vi.mocked(prisma.cmsContent.findUnique).mockResolvedValue(null);

      const page = await cmsService.getPageContent("refund-policy");

      expect(page.content.title).toBe("Cancellation, Returns & Refunds Policy");
      expect(page.content.sections.some((s) => s.body.includes("7 calendar days") || s.body.includes("7 days"))).toBe(true);
    });

    it("previews draft content for policies when requested by staff", async () => {
      const mockRecord = {
        id: "cms-page-1",
        slug: "shipping-policy",
        title: "Shipping Policy",
        section: "policies",
        payload: JSON.stringify({
          status: "DRAFT",
          version: 1,
          published: DEFAULT_POLICY_PAGES["shipping-policy"],
          draft: {
            ...DEFAULT_POLICY_PAGES["shipping-policy"],
            title: "Updated Festive Shipping Policy",
          },
          revisions: [],
          updatedAt: new Date().toISOString(),
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.cmsContent.findUnique).mockResolvedValue(mockRecord as any);

      const publicView = await cmsService.getPageContent("shipping-policy", { preview: false });
      expect(publicView.content.title).toBe("Shipping & Delivery Policy");

      const previewView = await cmsService.getPageContent("shipping-policy", { preview: true });
      expect(previewView.content.title).toBe("Updated Festive Shipping Policy");
    });
  });

  describe("Store Settings & Sensitive Credential Protection", () => {
    it("provides store settings with proper currency, timezone, and tax rules", async () => {
      vi.mocked(prisma.cmsContent.findUnique).mockResolvedValue(null);

      const { settings } = await cmsService.getStoreSettings();

      expect(settings.currencyCode).toBe("INR");
      expect(settings.currencySymbol).toBe("₹");
      expect(settings.timezone).toBe("Asia/Kolkata");
      expect(settings.taxRatePercentage).toBe(5.0);
      expect(settings.freeShippingThresholdRupees).toBe(1999);
      expect(settings.returnWindowDays).toBe(7);
    });

    it("returns safe integration health flags without exposing secret keys", async () => {
      vi.mocked(prisma.cmsContent.findUnique).mockResolvedValue(null);

      const { integrations } = await cmsService.getStoreSettings();

      expect(integrations).toBeDefined();
      expect(typeof integrations.razorpay.configured).toBe("boolean");
      expect(typeof integrations.shiprocket.configured).toBe("boolean");
      expect(typeof integrations.cloudflareR2.configured).toBe("boolean");
      expect(typeof integrations.emailNotifications.configured).toBe("boolean");

      // Verify no secrets exist in the returned structure
      const serialized = JSON.stringify(integrations);
      expect(serialized).not.toContain("RAZORPAY_KEY_SECRET");
      expect(serialized).not.toContain("SHIPROCKET_PASSWORD");
      expect(serialized).not.toContain("R2_SECRET_ACCESS_KEY");
      expect(serialized).not.toContain("RESEND_API_KEY");
      expect(serialized).not.toContain("database_password");
    });

    it("validates store settings schema against malformed inputs", () => {
      const valid = storeSettingsSchema.safeParse(DEFAULT_STORE_SETTINGS);
      expect(valid.success).toBe(true);

      const invalidEmail = storeSettingsSchema.safeParse({
        ...DEFAULT_STORE_SETTINGS,
        supportEmail: "not-an-email",
      });
      expect(invalidEmail.success).toBe(false);
    });
  });
});
