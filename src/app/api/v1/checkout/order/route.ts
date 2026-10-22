import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/security/guards";
import {
  getGuestTokenFromRequest,
  generateGuestToken,
  attachGuestTokenCookie,
} from "@/lib/security/guest-token";
import { validateBody } from "@/lib/validation/api-validator";
import { createOrderSchema } from "@/modules/checkout/checkout.schema";
import { checkoutService } from "@/modules/checkout/checkout.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/rate-limit/rate-limiter";
import { env } from "@/lib/validation/env";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client-ip";
    enforceRateLimit(`order:${ip}`, { maxRequests: 10, windowMs: 60 * 1000 });

    const user = await getCurrentUser(req);
    let guestToken = getGuestTokenFromRequest(req);
    let isNewGuest = false;

    if (!user && !guestToken) {
      guestToken = generateGuestToken();
      isNewGuest = true;
    }

    const input = await validateBody(req, createOrderSchema);
    const order = await checkoutService.createOrder(input, user?.userId, guestToken);

    const response = apiSuccess(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmountMinorUnits / 100,
        subtotal: order.subtotalMinorUnits / 100,
        shippingFee: order.shippingFeeMinorUnits / 100,
        discountAmount: order.discountAmountMinorUnits / 100,
        currency: order.currency,
        status: order.status,
        razorpayOrderId: order.razorpayOrderId,
        razorpayKeyId: env.RAZORPAY_KEY_ID,
      },
      "Order created successfully",
      201
    );

    if (isNewGuest && guestToken) {
      attachGuestTokenCookie(response, guestToken);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
