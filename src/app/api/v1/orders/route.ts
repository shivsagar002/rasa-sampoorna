import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/security/guards";
import { orderService } from "@/modules/orders/order.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { OrderStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const statusParam = searchParams.get("status") as OrderStatus | null;

    const status = statusParam && Object.values(OrderStatus).includes(statusParam)
      ? statusParam
      : undefined;

    const result = await orderService.getUserOrders(user.userId, page, limit, status);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
