import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { validateQuery, validateBody } from "@/lib/validation/api-validator";
import { productFilterQuerySchema, createProductSchema } from "@/modules/catalog/catalog.schema";
import { catalogService } from "@/modules/catalog/catalog.service";
import { apiPaginated, apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);
    const filters = validateQuery(req, productFilterQuerySchema);
    const { items, pagination } = await catalogService.getProducts(filters);
    return apiPaginated(items, pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff(req);
    const input = await validateBody(req, createProductSchema);
    const product = await catalogService.createProduct(input);
    return apiSuccess(product, "Product created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
