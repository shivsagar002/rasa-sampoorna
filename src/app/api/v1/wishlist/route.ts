import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/security/guards";
import {
  getGuestTokenFromRequest,
  generateGuestToken,
  attachGuestTokenCookie,
} from "@/lib/security/guest-token";
import { validateBody } from "@/lib/validation/api-validator";
import { wishlistService } from "@/modules/wishlist/wishlist.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { z } from "zod";

const toggleWishlistSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    let guestToken = getGuestTokenFromRequest(req);
    let isNewGuest = false;

    if (!user && !guestToken) {
      guestToken = generateGuestToken();
      isNewGuest = true;
    }

    const wishlist = await wishlistService.getOrCreateWishlist(user?.userId, guestToken);
    const response = apiSuccess(wishlist);

    if (isNewGuest && guestToken) {
      attachGuestTokenCookie(response, guestToken);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    let guestToken = getGuestTokenFromRequest(req);
    let isNewGuest = false;

    if (!user && !guestToken) {
      guestToken = generateGuestToken();
      isNewGuest = true;
    }

    const input = await validateBody(req, toggleWishlistSchema);
    const result = await wishlistService.toggleItem(input.productId, user?.userId, guestToken);
    const response = apiSuccess(
      result,
      result.inWishlist ? "Added to wishlist" : "Removed from wishlist"
    );

    if (isNewGuest && guestToken) {
      attachGuestTokenCookie(response, guestToken);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const guestToken = getGuestTokenFromRequest(req);
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");

    if (!productId) {
      return apiSuccess({ message: "Product ID required" });
    }

    const wishlist = await wishlistService.removeItem(productId, user?.userId, guestToken);
    return apiSuccess(wishlist, "Removed from wishlist");
  } catch (error) {
    return handleApiError(error);
  }
}
