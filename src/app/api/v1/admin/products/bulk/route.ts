import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { bulkStatusUpdateSchema, bulkPriceUpdateSchema } from "@/modules/catalog/catalog.schema";
import { catalogService } from "@/modules/catalog/catalog.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, BadRequestError } from "@/lib/api/errors";

export async function POST(req: NextRequest) {
  try {
    await requireStaff(req);
    const body = await req.json();

    if (body.action === "status") {
      const parsed = bulkStatusUpdateSchema.parse(body);
      const res = await catalogService.bulkUpdateStatus(parsed);
      return apiSuccess(res, `Updated status to ${parsed.status} for ${res.updatedCount} products.`);
    }

    if (body.action === "price") {
      const parsed = bulkPriceUpdateSchema.parse(body);
      const res = await catalogService.bulkUpdatePrices(parsed);
      return apiSuccess(res, `Updated pricing for ${res.updatedCount} products.`);
    }

    throw new BadRequestError('Invalid bulk action. Must be "status" or "price".');
  } catch (error) {
    return handleApiError(error);
  }
}
