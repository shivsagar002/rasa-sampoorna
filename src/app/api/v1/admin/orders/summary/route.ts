import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/security/guards";
import { adminOrderService } from "@/modules/admin/admin-order.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    return apiSuccess(await adminOrderService.getOrderSummary());
  } catch (error) {
    return handleApiError(error);
  }
}
