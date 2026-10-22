import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProductSchema } from "@/modules/catalog/catalog.schema";
import { categorySchema } from "@/modules/categories/category.schema";
import { createPresignedUploadUrl, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "@/lib/storage/r2";
import { CatalogService } from "@/modules/catalog/catalog.service";
import { CategoryService } from "@/modules/categories/category.service";
import { prisma } from "@/lib/db/prisma";
import { ConflictError, BadRequestError, ForbiddenError } from "@/lib/api/errors";
import { requireStaff, requireAdmin } from "@/lib/security/guards";
import { UserRole } from "@prisma/client";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    productCollection: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    inventoryMovement: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));

describe("Product Catalog & Category Validation Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Catalog Schema & Saree Attributes Validation", () => {
    it("should accept valid handcrafted saree product input", () => {
      const validSaree = {
        name: "Royal Peacock Blue Kanjivaram Saree",
        slug: "royal-peacock-blue-kanjivaram-saree",
        sku: "RASA-KANJ-001",
        description: "Handcrafted pure silk saree with pure zari korvai border woven by master artisans.",
        material: "Pure Kanjivaram Silk",
        fabric: "Pure Silk",
        weave: "Zari brocade",
        color: "Peacock Blue",
        occasion: "Bridal",
        style: "Royal Heritage",
        origin: "Kanchipuram, Tamil Nadu",
        basePriceInMinorUnits: 850000, // ₹8,500.00
        salePriceInMinorUnits: 750000, // ₹7,500.00
        stockQuantity: 5,
        lowStockThreshold: 2,
        images: [
          {
            r2Key: "products/peacock-blue-main.jpg",
            url: "https://assets.rasasampoorna.com/products/peacock-blue-main.jpg",
            altText: "Artisan drape front view",
            isPrimary: true,
            sortOrder: 0,
          },
        ],
      };

      const parsed = createProductSchema.parse(validSaree);
      expect(parsed.sku).toBe("RASA-KANJ-001");
      expect(parsed.fabric).toBe("Pure Silk");
      expect(parsed.basePriceInMinorUnits).toBe(850000);
      expect(parsed.stockQuantity).toBe(5);
    });

    it("should reject invalid prices (zero or negative)", () => {
      expect(
        createProductSchema.safeParse({
          name: "Invalid Saree",
          slug: "invalid-saree",
          sku: "SKU-001",
          description: "Description longer than 10 characters",
          material: "Silk",
          basePriceInMinorUnits: -500, // Negative
        }).success
      ).toBe(false);

      expect(
        createProductSchema.safeParse({
          name: "Invalid Saree",
          slug: "invalid-saree",
          sku: "SKU-001",
          description: "Description longer than 10 characters",
          material: "Silk",
          basePriceInMinorUnits: 0, // Zero
        }).success
      ).toBe(false);
    });

    it("should enforce slug kebab-case format", () => {
      expect(
        createProductSchema.safeParse({
          name: "Invalid Slug Saree",
          slug: "Invalid Slug With Spaces",
          sku: "SKU-002",
          description: "Description longer than 10 characters",
          material: "Silk",
          basePriceInMinorUnits: 500000,
        }).success
      ).toBe(false);
    });
  });

  describe("Duplicate SKU & Slug Uniqueness", () => {
    const catalogService = new CatalogService();

    it("should reject duplicate slug with ConflictError", async () => {
      vi.mocked(prisma.product.findUnique).mockResolvedValueOnce({ id: "prod-1", slug: "existing-slug" } as any);

      await expect(
        catalogService.createProduct({
          name: "Duplicate Saree",
          slug: "existing-slug",
          sku: "UNIQUE-SKU",
          description: "Description of the artisan saree piece.",
          material: "Pure Silk",
          basePriceInMinorUnits: 500000,
          stockQuantity: 10,
          lowStockThreshold: 2,
          currency: "INR",
          taxRatePercentage: 5,
          size: "Free size",
          availability: "In Stock",
          detailsList: [],
          status: "ACTIVE" as any,
          isFeatured: false,
          images: [],
        })
      ).rejects.toThrow(ConflictError);
    });

    it("should reject duplicate SKU with ConflictError", async () => {
      vi.mocked(prisma.product.findUnique)
        .mockResolvedValueOnce(null) // slug check passes
        .mockResolvedValueOnce({ id: "prod-2", sku: "DUPLICATE-SKU" } as any); // sku check fails

      await expect(
        catalogService.createProduct({
          name: "Duplicate SKU Saree",
          slug: "unique-slug",
          sku: "DUPLICATE-SKU",
          description: "Description of the artisan saree piece.",
          material: "Pure Silk",
          basePriceInMinorUnits: 500000,
          stockQuantity: 10,
          lowStockThreshold: 2,
          currency: "INR",
          taxRatePercentage: 5,
          size: "Free size",
          availability: "In Stock",
          detailsList: [],
          status: "ACTIVE" as any,
          isFeatured: false,
          images: [],
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Category Parent-Child Hierarchy", () => {
    const categoryService = new CategoryService();

    it("should reject a category being set as its own parent", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({ id: "cat-1", slug: "sarees" } as any);

      await expect(
        categoryService.updateCategory("cat-1", {
          parentId: "cat-1",
        })
      ).rejects.toThrow(BadRequestError);
    });

    it("should reject deleting a category that has active subcategories", async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({
        id: "cat-parent",
        name: "Sarees",
        children: [{ id: "cat-child", name: "Silk Sarees" }],
      } as any);

      await expect(categoryService.deleteCategory("cat-parent")).rejects.toThrow(BadRequestError);
    });
  });

  describe("Cloudflare R2 Media Upload Validation", () => {
    it("should accept permitted image MIME types and return valid R2 presigned info", async () => {
      for (const [mime, ext] of Object.entries(ALLOWED_IMAGE_TYPES)) {
        const result = await createPresignedUploadUrl(`test-saree.${ext}`, mime, 2 * 1024 * 1024, "products");
        expect(result.uploadUrl).toBeDefined();
        expect(result.key).toContain("products/");
        expect(result.key.endsWith(`.${ext}`)).toBe(true);
        expect(result.expiresInSeconds).toBe(900);
      }
    });

    it("should reject forbidden file types (e.g. scripts, executables, PDFs)", async () => {
      const invalidTypes = ["application/javascript", "text/html", "application/pdf", "image/gif"];
      for (const mime of invalidTypes) {
        await expect(
          createPresignedUploadUrl("exploit.file", mime, 1024, "products")
        ).rejects.toThrow(BadRequestError);
      }
    });

    it("should reject images exceeding the 10MB size limit", async () => {
      const oversizedBytes = MAX_IMAGE_SIZE_BYTES + 1024;
      await expect(
        createPresignedUploadUrl("huge-raw-photo.jpg", "image/jpeg", oversizedBytes, "products")
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("Access Control for Administrative Catalog Operations", () => {
    it("should reject customer access with ForbiddenError (403)", async () => {
      const { signSessionToken } = await import("@/lib/security/session");
      const customerToken = await signSessionToken({
        userId: "cust-01",
        email: "customer@example.com",
        name: "Patron",
        role: UserRole.CUSTOMER,
      });

      const customerReq = {
        cookies: {
          get: () => ({ value: customerToken }),
        },
      } as any;

      await expect(requireStaff(customerReq)).rejects.toThrow(ForbiddenError);
    });
  });
});
