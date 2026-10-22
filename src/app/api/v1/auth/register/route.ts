import { NextRequest } from "next/server";
import { validateBody } from "@/lib/validation/api-validator";
import { registerSchema } from "@/modules/auth/auth.schema";
import { authService } from "@/modules/auth/auth.service";
import { setSessionCookie } from "@/lib/security/session";
import { getGuestTokenFromRequest, clearGuestTokenCookie } from "@/lib/security/guest-token";
import { cartService } from "@/modules/cart/cart.service";
import { wishlistService } from "@/modules/wishlist/wishlist.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/rate-limit/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim();
    const ip = rawIp || (process.env.NODE_ENV === "development" ? "dev-local" : "client-ip");
    const maxRequests = process.env.NODE_ENV === "production" ? 10 : 60;
    enforceRateLimit(`register:${ip}`, { maxRequests, windowMs: 60 * 1000 });

    const input = await validateBody(req, registerSchema);
    const { user, token } = await authService.register(input);

    await setSessionCookie(token);

    // Safe merge of guest cart and wishlist if guest token exists
    const guestToken = getGuestTokenFromRequest(req);
    if (guestToken) {
      await Promise.allSettled([
        cartService.mergeGuestCart(guestToken, user.id),
        wishlistService.mergeGuestWishlist(guestToken, user.id),
      ]);
    }

    const response = apiSuccess({ user }, "Account created successfully", 201);
    if (guestToken) {
      clearGuestTokenCookie(response);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
