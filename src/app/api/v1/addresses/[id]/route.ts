import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { updateAddressSchema } from "@/modules/addresses/address.schema";
import { addressService } from "@/modules/addresses/address.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function PATCH(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await segmentData.params;
    const input = await validateBody(req, updateAddressSchema);

    const updated = await addressService.updateAddress(id, session.userId, input);
    return apiSuccess(updated, "Address updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await segmentData.params;

    const result = await addressService.deleteAddress(id, session.userId);
    return apiSuccess(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
