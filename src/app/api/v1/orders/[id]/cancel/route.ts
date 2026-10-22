import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { orderService } from "@/modules/orders/order.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { z } from "zod";

const cancelOrderSchema = z.object({
  reason: z.string().min(3, "Cancellation reason must be at least 3 characters").max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    const body = await validateBody(req, cancelOrderSchema);

    const cancelled = await orderService.requestCancellation(id, body.reason, user?.userId);

    return apiSuccess(cancelled, "Order cancelled successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
