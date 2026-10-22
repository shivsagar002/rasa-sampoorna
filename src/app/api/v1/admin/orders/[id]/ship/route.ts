import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/security/guards";
import { adminOrderService } from "@/modules/admin/admin-order.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    const result = await adminOrderService.createShipment(id, admin.userId);
    return apiSuccess(result, "Shipment booked with Shiprocket successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
