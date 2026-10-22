import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { apiPaginated } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const productId = searchParams.get("productId") || undefined;

    const { movements, pagination } = await inventoryService.getMovementHistory(
      page,
      limit,
      productId
    );

    return apiPaginated(movements, pagination);
  } catch (error) {
    return handleApiError(error);
  }
}
