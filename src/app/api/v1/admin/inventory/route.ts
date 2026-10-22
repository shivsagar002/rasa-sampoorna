import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { validateBody, validateQuery } from "@/lib/validation/api-validator";
import { inventoryQuerySchema, stockAdjustmentSchema } from "@/modules/inventory/inventory.schema";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { apiSuccess, apiPaginated } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);
    const query = validateQuery(req, inventoryQuerySchema);
    const { items, pagination } = await inventoryService.listInventory(query);
    return apiPaginated(items, pagination);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaff(req);
    const input = await validateBody(req, stockAdjustmentSchema);
    const result = await inventoryService.adjustStock({
      ...input,
      reference: input.reference || `Admin:${session.name || session.email}`,
    });
    return apiSuccess(result, `Stock for "${result.targetName}" updated to ${result.newStock}.`);
  } catch (error) {
    return handleApiError(error);
  }
}
