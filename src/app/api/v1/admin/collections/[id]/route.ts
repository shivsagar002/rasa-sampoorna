import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { updateCollectionSchema } from "@/modules/collections/collection.schema";
import { collectionService } from "@/modules/collections/collection.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function PATCH(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff(req);
    const { id } = await segmentData.params;
    const input = await validateBody(req, updateCollectionSchema);
    const updated = await collectionService.updateCollection(id, input);
    return apiSuccess(updated, "Collection updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff(req);
    const { id } = await segmentData.params;
    const result = await collectionService.deleteCollection(id);
    return apiSuccess(result, "Collection deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
