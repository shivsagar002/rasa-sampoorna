import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const GUEST_TOKEN_COOKIE_NAME = "rasa_guest_token";
export const GUEST_TOKEN_HEADER = "x-guest-token";
export const GUEST_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Generate a cryptographically secure, unpredictable guest cart identifier
 */
export function generateGuestToken(): string {
  return `guest_${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Validate that a guest token follows the expected secure format
 */
export function isValidGuestToken(token?: string | null): boolean {
  if (!token || typeof token !== "string") return false;
  // Format: guest_ followed by 48 hex characters, or a valid UUID v4
  const hexPattern = /^guest_[a-f0-9]{48}$/i;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return hexPattern.test(token) || uuidPattern.test(token);
}

/**
 * Extract guest token from request (cookies first, then fallback to header)
 */
export function getGuestTokenFromRequest(req: NextRequest): string | undefined {
  const cookieToken = req.cookies.get(GUEST_TOKEN_COOKIE_NAME)?.value;
  if (cookieToken && isValidGuestToken(cookieToken)) {
    return cookieToken;
  }

  const headerToken = req.headers.get(GUEST_TOKEN_HEADER);
  if (headerToken && isValidGuestToken(headerToken)) {
    return headerToken;
  }

  return undefined;
}

/**
 * Attach guest token cookie to an outgoing response
 */
export function attachGuestTokenCookie(response: NextResponse, guestToken: string): NextResponse {
  response.cookies.set(GUEST_TOKEN_COOKIE_NAME, guestToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_TOKEN_MAX_AGE_SECONDS,
  });
  return response;
}

/**
 * Clear guest token cookie from an outgoing response
 */
export function clearGuestTokenCookie(response: NextResponse): NextResponse {
  response.cookies.set(GUEST_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
