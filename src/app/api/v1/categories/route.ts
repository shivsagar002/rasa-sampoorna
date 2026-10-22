import { NextRequest } from "next/server";
import { categoryService } from "@/modules/categories/category.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tree = searchParams.get("tree") === "true";

    const categories = tree
      ? await categoryService.getCategoryTree(false)
      : await categoryService.listCategories(false);

    return apiSuccess(categories);
  } catch (error) {
    return handleApiError(error);
  }
}
