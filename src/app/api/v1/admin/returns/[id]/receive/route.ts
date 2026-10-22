import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { markReturnReceivedSchema } from "@/modules/returns/return.schema";
import { returnService } from "@/modules/returns/return.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, ValidationError } from "@/lib/api/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    const body = await validateBody(req, markReturnReceivedSchema);

    if (body.returnId !== id) {
      throw new ValidationError("Return ID in body does not match route parameter.");
    }

    const result = await returnService.processReturnRefund(id, body.restock, admin.userId);
    return apiSuccess(result, "Return confirmed received at warehouse. Refund processed and inventory restocked.");
  } catch (error) {
    return handleApiError(error);
  }
}
