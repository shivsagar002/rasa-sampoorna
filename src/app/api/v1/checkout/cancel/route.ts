import { NextRequest } from "next/server";
import { validateBody } from "@/lib/validation/api-validator";
import { releaseOrderReservationSchema } from "@/modules/checkout/checkout.schema";
import { checkoutService } from "@/modules/checkout/checkout.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function POST(req: NextRequest) {
  try {
    const input = await validateBody(req, releaseOrderReservationSchema);
    const updated = await checkoutService.handlePaymentFailure(input.orderId, input.reason);

    return apiSuccess(
      {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        status: updated.status,
      },
      "Order payment cancelled and reservation safely released"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
