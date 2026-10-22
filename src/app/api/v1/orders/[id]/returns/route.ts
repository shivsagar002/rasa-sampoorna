import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { requestReturnSchema } from "@/modules/returns/return.schema";
import { returnService } from "@/modules/returns/return.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, ValidationError } from "@/lib/api/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    const orderItemId = req.nextUrl.searchParams.get("orderItemId");

    if (!orderItemId) {
      throw new ValidationError("Query parameter 'orderItemId' is required.");
    }

    const eligibility = await returnService.checkReturnEligibility(id, orderItemId, user?.userId);
    return apiSuccess(eligibility);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    const body = await validateBody(req, requestReturnSchema);

    // Verify orderId matches route param
    if (body.orderId !== id) {
      throw new ValidationError("Order ID in request body does not match the URL parameter.");
    }

    const returnRecord = await returnService.requestReturn(body, user?.userId);
    return apiSuccess(returnRecord, "Return request submitted successfully. Our team will review it shortly.");
  } catch (error) {
    return handleApiError(error);
  }
}
