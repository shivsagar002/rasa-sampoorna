import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { catalogService } from "@/modules/catalog/catalog.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);
    return apiSuccess(await catalogService.getAdminSummary());
  } catch (error) {
    return handleApiError(error);
  }
}
