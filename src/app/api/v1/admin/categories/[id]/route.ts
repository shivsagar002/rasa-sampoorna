import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { updateCategorySchema } from "@/modules/categories/category.schema";
import { categoryService } from "@/modules/categories/category.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function PATCH(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff(req);
    const { id } = await segmentData.params;
    const input = await validateBody(req, updateCategorySchema);
    const updated = await categoryService.updateCategory(id, input);
    return apiSuccess(updated, "Category updated successfully");
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
    const result = await categoryService.deleteCategory(id);
    return apiSuccess(result, "Category deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
