import { NextRequest } from "next/server";
import { getGuestTokenFromRequest } from "@/lib/security/guest-token";
import { validateBody } from "@/lib/validation/api-validator";
import { verifyPaymentSchema } from "@/modules/checkout/checkout.schema";
import { checkoutService } from "@/modules/checkout/checkout.service";
import { orderService } from "@/modules/orders/order.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function POST(req: NextRequest) {
  try {
    const guestToken = getGuestTokenFromRequest(req);
    const input = await validateBody(req, verifyPaymentSchema);
    const confirmedOrder = await checkoutService.verifyPayment(input, guestToken);

    const guestAccessToken = confirmedOrder.guestEmail
      ? orderService.generateGuestOrderAccessToken(confirmedOrder.id, confirmedOrder.guestEmail)
      : undefined;

    return apiSuccess(
      {
        orderId: confirmedOrder.id,
        orderNumber: confirmedOrder.orderNumber,
        status: confirmedOrder.status,
        paymentStatus: confirmedOrder.paymentStatus,
        totalAmount: confirmedOrder.totalAmountMinorUnits / 100,
        accessToken: guestAccessToken,
      },
      "Payment verified and order confirmed successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
