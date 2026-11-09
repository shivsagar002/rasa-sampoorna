import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { adminOrderService } from "@/modules/admin/admin-order.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

const bulkOrderSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(100).refine(
    (orderIds) => new Set(orderIds).size === orderIds.length,
    "Selected orders must be unique."
  ),
  status: z.enum(["CONFIRMED", "PROCESSING"]),
});

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const input = await validateBody(req, bulkOrderSchema);
    const result = await adminOrderService.bulkUpdateStatus(
      input.orderIds,
      input.status,
      admin.userId
    );
    return apiSuccess(result, `${result.updatedCount} orders updated successfully.`);
  } catch (error) {
    return handleApiError(error);
  }
}
