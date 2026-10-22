import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { updateProductSchema } from "@/modules/catalog/catalog.schema";
import { catalogService } from "@/modules/catalog/catalog.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff(req);
    const { id } = await segmentData.params;
    const product = await catalogService.getProductById(id);
    return apiSuccess(product);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff(req);
    const { id } = await segmentData.params;
    const input = await validateBody(req, updateProductSchema);
    const updated = await catalogService.updateProduct(id, input);
    return apiSuccess(updated, "Product updated successfully");
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
    const result = await catalogService.deleteProduct(id);
    return apiSuccess(result, "Product deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
