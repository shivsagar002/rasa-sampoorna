import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);
    return apiSuccess(await inventoryService.getInventorySummary());
  } catch (error) {
    return handleApiError(error);
  }
}
