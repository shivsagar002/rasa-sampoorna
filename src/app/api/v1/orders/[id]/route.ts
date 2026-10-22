import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/security/guards";
import { getGuestTokenFromRequest } from "@/lib/security/guest-token";
import { orderService } from "@/modules/orders/order.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { UserRole } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    const guestToken = getGuestTokenFromRequest(req);
    const guestAccessToken =
      req.nextUrl.searchParams.get("token") ||
      req.headers.get("x-guest-access-token") ||
      undefined;

    const isAdmin =
      user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

    const order = await orderService.getOrderDetails(
      id,
      user?.userId,
      guestToken,
      guestAccessToken,
      isAdmin
    );

    return apiSuccess(order);
  } catch (error) {
    return handleApiError(error);
  }
}
