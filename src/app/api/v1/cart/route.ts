import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/security/guards";
import {
  getGuestTokenFromRequest,
  generateGuestToken,
  attachGuestTokenCookie,
} from "@/lib/security/guest-token";
import { validateBody } from "@/lib/validation/api-validator";
import { addToCartSchema, updateCartItemSchema } from "@/modules/cart/cart.schema";
import { cartService } from "@/modules/cart/cart.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const guestToken = getGuestTokenFromRequest(req);

    if (!user && !guestToken) {
      return apiSuccess(cartService.getEmptyCart());
    }

    const cart = await cartService.getCart(user?.userId, guestToken);
    if (!cart) {
      return apiSuccess(cartService.getEmptyCart());
    }

    return apiSuccess(cart);
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

    const input = await validateBody(req, addToCartSchema);
    const cart = await cartService.addItem(input, user?.userId, guestToken);
    const response = apiSuccess(cart, "Item added to cart");

    if (isNewGuest && guestToken) {
      attachGuestTokenCookie(response, guestToken);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const guestToken = getGuestTokenFromRequest(req);

    const schema = z.object({
      itemId: z.string().min(1),
      quantity: z.number().int().min(0),
    });
    const body = await validateBody(req, schema);

    const cart = await cartService.updateItemQuantity(
      body.itemId,
      { quantity: body.quantity },
      user?.userId,
      guestToken
    );
    return apiSuccess(cart, "Cart item updated");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const guestToken = getGuestTokenFromRequest(req);
    const url = new URL(req.url);
    const itemId = url.searchParams.get("itemId");

    let cart;
    if (itemId) {
      cart = await cartService.removeItem(itemId, user?.userId, guestToken);
    } else {
      cart = await cartService.clearCart(user?.userId, guestToken);
    }

    return apiSuccess(cart, itemId ? "Item removed from cart" : "Cart cleared");
  } catch (error) {
    return handleApiError(error);
  }
}
