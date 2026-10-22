import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/security/guards";
import { getGuestTokenFromRequest } from "@/lib/security/guest-token";
import { validateBody } from "@/lib/validation/api-validator";
import { applyCouponSchema } from "@/modules/coupons/coupon.schema";
import { couponService } from "@/modules/coupons/coupon.service";
import { cartService } from "@/modules/cart/cart.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const guestToken = getGuestTokenFromRequest(req);
    const input = await validateBody(req, applyCouponSchema);

    // Fetch authoritative cart items and subtotal
    const cart = await cartService.getOrCreateCart(user?.userId, guestToken);

    const items = cart.items.map((i) => ({
      productId: i.productId,
      unitPriceMinorUnits: Math.round(i.unitPrice * 100),
      quantity: i.quantity,
    }));

    const result = await couponService.validateCoupon(
      input.code,
      cart.subtotalMinorUnits,
      user?.userId,
      items,
      cart.shippingFeeMinorUnits
    );

    return apiSuccess(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
