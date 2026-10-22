import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import { env } from "@/lib/validation/env";

export const SESSION_COOKIE_NAME = "rasa_session";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  [key: string]: unknown;
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

/**
 * Sign a secure JWT session token
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const secret = getJwtSecret();
  const expiryTime = `${env.AUTH_SESSION_EXPIRY_DAYS}d`;

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiryTime)
    .sign(secret);
}

/**
 * Verify and decode a JWT session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Helper to set secure HTTP-only auth cookie
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  const maxAge = env.AUTH_SESSION_EXPIRY_DAYS * 24 * 60 * 60;

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/**
 * Helper to delete the session cookie upon logout
 */
export async function removeSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Retrieve current session from cookies
 */
export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}
