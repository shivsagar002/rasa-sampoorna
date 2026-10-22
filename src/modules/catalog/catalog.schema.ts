import { z } from "zod";
import { ProductStatus } from "@prisma/client";

export const productFilterQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().optional(),
  collection: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  material: z.string().optional(),
  fabric: z.string().optional(),
  occasion: z.string().optional(),
  color: z.string().optional(),
  availability: z.string().optional(),
  search: z.string().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  sortBy: z.enum(["price-low", "price-high", "rating", "newest"]).optional().default("newest"),
  isFeatured: z.coerce.boolean().optional(),
});

export const productImageInputSchema = z.object({
  id: z.string().optional(),
  r2Key: z.string().min(1, "R2 key is required"),
  url: z.string().min(1, "Image URL is required"),
  altText: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const productVariantInputSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(2, "Variant SKU required").trim(),
  title: z.string().default("Default"),
  color: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  priceAdjustmentMinorUnits: z.number().int().default(0),
  stockQuantity: z.number().int().min(0).default(10),
  lowStockThreshold: z.number().int().min(0).default(2),
  isActive: z.boolean().default(true),
});

export const createProductSchema = z.object({
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case (e.g. crimson-kanjivaram-saree)")
    .trim(),
  name: z.string().min(2, "Product name must be at least 2 characters").trim(),
  sku: z.string().min(2, "SKU must be at least 2 characters").trim(),
  tag: z.string().optional().nullable(),
  categoryId: z.string().uuid("Invalid category ID").optional().nullable(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  material: z.string().min(2, "Material is required (e.g. Pure Silk, Chanderi Cotton)"),
  fabric: z.string().optional().nullable(),
  weave: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  occasion: z.string().optional().nullable(),
  style: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  customAttributes: z.record(z.any()).optional().nullable(),
  size: z.string().default("Free size"),
  availability: z.string().default("In Stock"),
  detailsList: z.array(z.string()).default([]),
  makerNote: z.string().optional().nullable(),
  shippingNote: z.string().optional().nullable(),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
  isFeatured: z.boolean().default(false),
  basePriceInMinorUnits: z.number().int().positive("Base price must be positive (in paise)"),
  salePriceInMinorUnits: z.number().int().positive().optional().nullable(),
  originalPriceInMinorUnits: z.number().int().positive().optional().nullable(),
  currency: z.string().default("INR"),
  taxRatePercentage: z.number().min(0).max(100).default(5.0),
  stockQuantity: z.number().int().min(0).default(10),
  lowStockThreshold: z.number().int().min(0).default(2),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  images: z.array(productImageInputSchema).default([]),
  variants: z.array(productVariantInputSchema).optional().default([]),
  collectionIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateProductSchema = createProductSchema.partial();

export const bulkStatusUpdateSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, "Select at least one product"),
  status: z.nativeEnum(ProductStatus),
});

export const bulkPriceUpdateSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, "Select at least one product"),
  adjustmentType: z.enum(["percentage", "fixed"]),
  adjustmentValue: z.number(), // +10 for +10% or +50000 for +₹500
});

export type ProductFilterQuery = z.input<typeof productFilterQuerySchema>;
export type CreateProductInput = z.input<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type BulkStatusUpdateInput = z.infer<typeof bulkStatusUpdateSchema>;
export type BulkPriceUpdateInput = z.infer<typeof bulkPriceUpdateSchema>;
