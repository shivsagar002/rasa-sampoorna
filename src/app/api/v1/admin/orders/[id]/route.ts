import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { adminOrderService } from "@/modules/admin/admin-order.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";

const updateOrderSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  note: z.string().max(500).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id } = await params;
    const order = await adminOrderService.getOrderDetails(id);
    return apiSuccess(order);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    const body = await validateBody(req, updateOrderSchema);

    let result = null;

    if (body.status) {
      result = await adminOrderService.updateStatus(id, body.status, admin.userId, body.note);
    } else if (body.note) {
      result = await adminOrderService.addNote(id, body.note, admin.userId);
    }

    return apiSuccess(result, "Order updated successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
