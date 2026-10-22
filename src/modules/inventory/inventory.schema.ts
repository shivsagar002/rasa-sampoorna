import { z } from "zod";
import { InventoryMovementType } from "@prisma/client";

export const stockAdjustmentSchema = z
  .object({
    productId: z.string().uuid().optional().nullable(),
    variantId: z.string().uuid().optional().nullable(),
    quantityDelta: z.number().int().refine((val) => val !== 0, {
      message: "Adjustment quantity must be non-zero (positive for additions, negative for deductions)",
    }),
    type: z.nativeEnum(InventoryMovementType).default(InventoryMovementType.MANUAL_ADJUSTMENT),
    reason: z.string().min(2, "Reason must be at least 2 characters").trim(),
    reference: z.string().optional().nullable(),
  })
  .refine((data) => data.productId || data.variantId, {
    message: "Either productId or variantId must be specified for stock adjustment.",
  });

export const reserveStockSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().uuid().optional(),
        productId: z.string().uuid().optional(),
        quantity: z.number().int().positive("Reservation quantity must be positive"),
      })
    )
    .min(1, "At least one item must be reserved"),
  reference: z.string().min(1, "Reservation reference (e.g. Cart ID or Checkout Token) is required"),
  ttlMinutes: z.number().int().min(1).max(60).default(15),
});

export const inventoryQuerySchema = z.object({
  lowStockOnly: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type StockAdjustmentInput = z.input<typeof stockAdjustmentSchema>;
export type ReserveStockInput = z.input<typeof reserveStockSchema>;
export type InventoryQuery = z.input<typeof inventoryQuerySchema>;
