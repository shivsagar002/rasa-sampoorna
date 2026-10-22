import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/security/guards";
import {
  getGuestTokenFromRequest,
  generateGuestToken,
  attachGuestTokenCookie,
} from "@/lib/security/guest-token";
import { orderService } from "@/modules/orders/order.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);
    let guestToken = getGuestTokenFromRequest(req);
    let isNewGuest = false;

    if (!user && !guestToken) {
      guestToken = generateGuestToken();
      isNewGuest = true;
    }

    const result = await orderService.reorder(id, user?.userId, guestToken);

    const message = result.addedItems.length > 0
      ? `Added ${result.addedItems.length} item(s) to your cart with current live prices.`
      : "No items could be reordered because they are currently inactive or out of stock.";

    const response = apiSuccess(result, message);

    if (isNewGuest && guestToken) {
      attachGuestTokenCookie(response, guestToken);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
