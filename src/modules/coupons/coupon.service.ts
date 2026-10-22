import { prisma } from "@/lib/db/prisma";
import { ValidationError, NotFoundError } from "@/lib/api/errors";
import { CouponDiscountType, OrderStatus, PaymentStatus } from "@prisma/client";

export interface LineItemForCoupon {
  productId: string;
  categoryId?: string | null;
  unitPriceMinorUnits: number;
  quantity: number;
}

export interface CouponValidationResult {
  isValid: true;
  couponId: string;
  code: string;
  discountType: CouponDiscountType;
  discountValueMinorUnits: number;
  discountAmountMinorUnits: number;
  discountAmountRupees: number;
  freeShipping: boolean;
  message: string;
}

export interface CouponMetadataRules {
  perUserLimit?: number;
  isFirstOrderOnly?: boolean;
  restrictedCategoryIds?: string[];
  restrictedProductIds?: string[];
  excludedProductIds?: string[];
}

export class CouponService {
  /**
   * Parse additional rules from coupon description if JSON encoded, or use defaults
   */
  private extractRules(coupon: { description?: string | null }): CouponMetadataRules {
    if (!coupon.description) return {};
    try {
      if (coupon.description.startsWith("{") && coupon.description.endsWith("}")) {
        return JSON.parse(coupon.description);
      }
    } catch {
      // Fallback if description is plain text
    }
    return {};
  }

  /**
   * Validate coupon eligibility and calculate authoritative discount
   */
  async validateCoupon(
    code: string,
    subtotalMinorUnits: number,
    userId?: string,
    items: LineItemForCoupon[] = [],
    shippingFeeMinorUnits: number = 0
  ): Promise<CouponValidationResult> {
    const cleanCode = code.trim().toUpperCase();

    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon || !coupon.isActive) {
      throw new ValidationError(`Coupon "${cleanCode}" is invalid or inactive.`);
    }

    const now = new Date();

    // 1. Date window validation
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new ValidationError(`Coupon "${cleanCode}" is not active yet.`);
    }

    if (coupon.expiresAt && now > coupon.expiresAt) {
      throw new ValidationError(
        `Coupon "${cleanCode}" expired on ${coupon.expiresAt.toLocaleDateString("en-IN")}.`
      );
    }

    // 2. Global usage limit
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new ValidationError(`Coupon "${cleanCode}" has reached its maximum total redemption limit.`);
    }

    // 3. Minimum order amount validation
    if (coupon.minOrderAmountMinorUnits && subtotalMinorUnits < coupon.minOrderAmountMinorUnits) {
      const minRupees = coupon.minOrderAmountMinorUnits / 100;
      throw new ValidationError(
        `Coupon "${cleanCode}" requires a minimum cart value of ₹${minRupees.toLocaleString("en-IN")}.`
      );
    }

    // Extract advanced metadata rules (per-user, first order, restrictions)
    const rules = this.extractRules(coupon);

    // 4. Per-user redemption limit check
    if (userId) {
      const perUserLimit = rules.perUserLimit ?? 1;
      const userRedemptionsCount = await prisma.couponRedemption.count({
        where: {
          couponId: coupon.id,
          userId,
        },
      });

      if (userRedemptionsCount >= perUserLimit) {
        throw new ValidationError(
          `You have already redeemed coupon "${cleanCode}" the maximum allowed number of times (${perUserLimit}).`
        );
      }

      // 5. First-order only restriction
      if (rules.isFirstOrderOnly) {
        const completedOrdersCount = await prisma.order.count({
          where: {
            userId,
            paymentStatus: PaymentStatus.CAPTURED,
          },
        });

        if (completedOrdersCount > 0) {
          throw new ValidationError(
            `Coupon "${cleanCode}" is exclusively available on your first order with RASA Sampoorna.`
          );
        }
      }
    }

    // 6. Product / Category / Excluded items calculation
    let eligibleSubtotalMinorUnits = subtotalMinorUnits;

    if (items.length > 0) {
      const restrictedProducts = rules.restrictedProductIds || [];
      const restrictedCategories = rules.restrictedCategoryIds || [];
      const excludedProducts = rules.excludedProductIds || [];

      let itemCalculatedSubtotal = 0;
      let hasEligibleItems = false;

      for (const item of items) {
        if (excludedProducts.includes(item.productId)) {
          continue;
        }

        const passesProductRestriction =
          restrictedProducts.length === 0 || restrictedProducts.includes(item.productId);
        const passesCategoryRestriction =
          restrictedCategories.length === 0 ||
          (item.categoryId && restrictedCategories.includes(item.categoryId));

        if (passesProductRestriction && passesCategoryRestriction) {
          itemCalculatedSubtotal += item.unitPriceMinorUnits * item.quantity;
          hasEligibleItems = true;
        }
      }

      if ((restrictedProducts.length > 0 || restrictedCategories.length > 0) && !hasEligibleItems) {
        throw new ValidationError(`None of the items in your cart are eligible for coupon "${cleanCode}".`);
      }

      if (restrictedProducts.length > 0 || restrictedCategories.length > 0 || excludedProducts.length > 0) {
        eligibleSubtotalMinorUnits = itemCalculatedSubtotal;
      }
    }

    // 7. Calculate discount amount in minor units
    let discountAmountMinorUnits = 0;
    let freeShipping = false;

    if (coupon.discountType === CouponDiscountType.PERCENTAGE) {
      discountAmountMinorUnits = Math.round(
        (eligibleSubtotalMinorUnits * coupon.discountValueMinorUnits) / 100
      );
      if (coupon.maxDiscountMinorUnits) {
        discountAmountMinorUnits = Math.min(discountAmountMinorUnits, coupon.maxDiscountMinorUnits);
      }
    } else if (coupon.discountType === CouponDiscountType.FIXED_AMOUNT) {
      discountAmountMinorUnits = Math.min(eligibleSubtotalMinorUnits, coupon.discountValueMinorUnits);
    } else if (coupon.discountType === CouponDiscountType.FREE_SHIPPING) {
      discountAmountMinorUnits = shippingFeeMinorUnits;
      freeShipping = true;
    }

    // Cannot exceed total subtotal
    discountAmountMinorUnits = Math.min(discountAmountMinorUnits, subtotalMinorUnits);

    return {
      isValid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValueMinorUnits: coupon.discountValueMinorUnits,
      discountAmountMinorUnits,
      discountAmountRupees: discountAmountMinorUnits / 100,
      freeShipping,
      message: `Coupon "${coupon.code}" applied successfully.`,
    };
  }

  /**
   * Finalize coupon redemption atomically upon successful payment capture
   */
  async redeemCoupon(
    tx: any,
    couponId: string,
    orderId: string,
    discountAmountMinorUnits: number,
    userId?: string
  ) {
    // 1. Concurrency-safe increment with limit check
    const coupon = await tx.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon || !coupon.isActive) {
      throw new ValidationError("Coupon is no longer available.");
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new ValidationError(`Coupon "${coupon.code}" has reached its maximum total usage limit.`);
    }

    await tx.coupon.update({
      where: { id: couponId },
      data: {
        usageCount: { increment: 1 },
      },
    });

    // 2. Create CouponRedemption record
    return await tx.couponRedemption.create({
      data: {
        couponId,
        orderId,
        userId: userId || null,
        discountAmountMinorUnits,
      },
    });
  }
}

export const couponService = new CouponService();
