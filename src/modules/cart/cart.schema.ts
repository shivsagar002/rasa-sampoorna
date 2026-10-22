import { z } from "zod";

export const addToCartSchema = z
  .object({
    variantId: z.string().optional(),
    productId: z.string().optional(),
    quantity: z.number().int().positive().default(1),
    selectedSize: z.string().optional().default("Free size"),
    guestToken: z.string().optional(),
  })
  .refine((data) => data.variantId || data.productId, {
    message: "Either variantId or productId must be provided",
  });

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
});

export const syncCartSchema = z.object({
  guestToken: z.string().optional(),
  items: z.array(
    z.object({
      variantId: z.string().optional(),
      productId: z.string().optional(),
      quantity: z.number().int().positive(),
      selectedSize: z.string().optional(),
    })
  ),
});

export type AddToCartInput = z.input<typeof addToCartSchema>;
export type UpdateCartItemInput = z.output<typeof updateCartItemSchema>;
export type SyncCartInput = z.output<typeof syncCartSchema>;
