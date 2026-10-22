import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { adminOrderService } from "@/modules/admin/admin-order.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().min(3).max(500),
  issueRefund: z.boolean().default(true),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    const body = await validateBody(req, cancelSchema);

    const cancelled = await adminOrderService.cancelOrder(
      id,
      body.reason,
      admin.userId,
      body.issueRefund
    );

    return apiSuccess(cancelled, "Order cancelled by administrator.");
  } catch (error) {
    return handleApiError(error);
  }
}
