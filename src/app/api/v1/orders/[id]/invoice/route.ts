import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/security/guards";
import { orderService } from "@/modules/orders/order.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    const guestAccessToken =
      req.nextUrl.searchParams.get("token") ||
      req.headers.get("x-guest-access-token") ||
      undefined;

    const invoice = await orderService.getInvoiceData(id, user?.userId, guestAccessToken);
    return apiSuccess(invoice);
  } catch (error) {
    return handleApiError(error);
  }
}
