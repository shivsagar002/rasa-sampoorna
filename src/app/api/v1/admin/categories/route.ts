import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { categorySchema } from "@/modules/categories/category.schema";
import { categoryService } from "@/modules/categories/category.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);
    const categories = await categoryService.listCategories(true);
    return apiSuccess(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff(req);
    const input = await validateBody(req, categorySchema);
    const category = await categoryService.createCategory(input);
    return apiSuccess(category, "Category created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
