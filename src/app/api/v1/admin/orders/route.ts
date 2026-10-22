import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/security/guards";
import { adminOrderService } from "@/modules/admin/admin-order.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const searchParams = req.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const statusParam = searchParams.get("status") as OrderStatus | null;
    const paymentStatusParam = searchParams.get("paymentStatus") as PaymentStatus | null;
    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const status = statusParam && Object.values(OrderStatus).includes(statusParam)
      ? statusParam
      : undefined;

    const paymentStatus = paymentStatusParam && Object.values(PaymentStatus).includes(paymentStatusParam)
      ? paymentStatusParam
      : undefined;

    const result = await adminOrderService.listOrders({
      page,
      limit,
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
