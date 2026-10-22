import { z } from "zod";
import { CouponDiscountType } from "@prisma/client";

export const applyCouponSchema = z.object({
  code: z.string().min(2, "Coupon code must be at least 2 characters").trim().toUpperCase(),
  cartSubtotalMinorUnits: z.number().int().nonnegative().optional(),
});

export const createCouponSchema = z.object({
  code: z.string().min(2).max(30).trim().toUpperCase(),
  description: z.string().optional(),
  discountType: z.nativeEnum(CouponDiscountType).default(CouponDiscountType.PERCENTAGE),
  discountValueMinorUnits: z.number().int().positive("Discount value must be positive"),
  minOrderAmountMinorUnits: z.number().int().nonnegative().optional(),
  maxDiscountMinorUnits: z.number().int().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().default(1),
  isFirstOrderOnly: z.boolean().default(false),
  restrictedCategoryIds: z.array(z.string()).default([]),
  restrictedProductIds: z.array(z.string()).default([]),
  excludedProductIds: z.array(z.string()).default([]),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

export type ApplyCouponInput = z.output<typeof applyCouponSchema>;
export type CreateCouponInput = z.output<typeof createCouponSchema>;
