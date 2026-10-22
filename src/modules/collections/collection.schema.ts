import { z } from "zod";

export const collectionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case (e.g. festive-heritage)")
    .trim(),
  description: z.string().optional().nullable(),
  bannerKey: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  productIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateCollectionSchema = collectionSchema.partial();

export type CollectionInput = z.infer<typeof collectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
