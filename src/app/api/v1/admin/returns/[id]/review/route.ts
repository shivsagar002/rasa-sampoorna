import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { reviewReturnSchema } from "@/modules/returns/return.schema";
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
    const body = await validateBody(req, reviewReturnSchema);

    if (body.returnId !== id) {
      throw new ValidationError("Return ID in body does not match route parameter.");
    }

    const reviewed = await returnService.reviewReturn(body, admin.userId);
    return apiSuccess(reviewed, `Return request ${body.action.toLowerCase()}d successfully.`);
  } catch (error) {
    return handleApiError(error);
  }
}
