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
    const statusParam = searchParams.get("status");
    const paymentStatusParam = searchParams.get("paymentStatus");
    const search = searchParams.get("search") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const status = statusParam === "SHIPPED_DELIVERED"
      ? statusParam
      : statusParam && (Object.values(OrderStatus) as string[]).includes(statusParam)
      ? statusParam as OrderStatus
      : undefined;

    const paymentStatus = paymentStatusParam === "AWAITING_PAYMENT"
      ? paymentStatusParam
      : paymentStatusParam && (Object.values(PaymentStatus) as string[]).includes(paymentStatusParam)
      ? paymentStatusParam as PaymentStatus
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
