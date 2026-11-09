import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { validateQuery } from "@/lib/validation/api-validator";
import { inventoryMovementQuerySchema } from "@/modules/inventory/inventory.schema";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { apiPaginated } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);
    const query = validateQuery(req, inventoryMovementQuerySchema);
    const { movements, pagination } = await inventoryService.getMovementHistory(query);

    return apiPaginated(movements, pagination);
  } catch (error) {
    return handleApiError(error);
  }
}
