import { NextRequest } from "next/server";
import { getSessionFromCookies, verifySessionToken, SESSION_COOKIE_NAME, SessionPayload } from "@/lib/security/session";
import { UnauthorizedError, ForbiddenError } from "@/lib/api/errors";
import { UserRole } from "@prisma/client";
import { Permission, SENSITIVE_PERMISSIONS } from "@/modules/rbac/permissions";
import { rbacService } from "@/modules/rbac/rbac.service";

/**
 * Returns current authenticated user or null
 */
export async function getCurrentUser(req?: NextRequest): Promise<SessionPayload | null> {
  if (req) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) return await verifySessionToken(token);
    return null;
  }
  return await getSessionFromCookies();
}

/**
 * Enforces that user must be authenticated. Throws UnauthorizedError otherwise.
 */
export async function requireAuth(req?: NextRequest): Promise<SessionPayload> {
  const session = await getCurrentUser(req);
  if (!session) {
    throw new UnauthorizedError("You must be logged in to access this resource.");
  }
  return session;
}

/**
 * Enforces that user has an ADMIN or SUPER_ADMIN role.
 */
export async function requireAdmin(req?: NextRequest): Promise<SessionPayload> {
  const session = await requireAuth(req);
  if (session.role !== UserRole.ADMIN && session.role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenError("Administrative privileges are required for this action.");
  }
  return session;
}

/**
 * Enforces that user has a STAFF, ADMIN, or SUPER_ADMIN role.
 */
export async function requireStaff(req?: NextRequest): Promise<SessionPayload> {
  const session = await requireAuth(req);
  if (
    session.role !== UserRole.STAFF &&
    session.role !== UserRole.ADMIN &&
    session.role !== UserRole.SUPER_ADMIN
  ) {
    throw new ForbiddenError("Staff or administrative privileges are required for this action.");
  }
  return session;
}

/**
 * Enforces fine-grained permission on a protected server-side operation.
 * Denies access by default if permission is not granted.
 */
export async function requirePermission(
  req: NextRequest | undefined,
  permission: Permission
): Promise<SessionPayload> {
  const session = await requireAuth(req);

  const hasPerm = await rbacService.hasPermission(
    { id: session.userId, role: session.role },
    permission
  );

  if (!hasPerm) {
    throw new ForbiddenError(
      `Access denied: You do not have the required permission (${permission}) to perform this action.`
    );
  }

  // If this is a highly sensitive permission, check for step-up verification header if present
  if (SENSITIVE_PERMISSIONS.includes(permission)) {
    const mfaHeader = req?.headers.get("x-mfa-code");
    // If user is OWNER (SUPER_ADMIN), allow direct or step-up; for others require step-up or verify
    if (session.role !== UserRole.SUPER_ADMIN && mfaHeader) {
      const isValid = await rbacService.verifyMfaStepUp(
        { id: session.userId, email: session.email },
        mfaHeader
      );
      if (!isValid) {
        throw new ForbiddenError("MFA step-up verification failed for sensitive operation.");
      }
    }
  }

  return session;
}

/**
 * Explicit MFA step-up verification for high-risk operations
 */
export async function requireMfaVerification(
  req: NextRequest | undefined,
  action: string,
  providedCode?: string
): Promise<void> {
  const session = await requireAuth(req);
  const code = providedCode || req?.headers.get("x-mfa-code");

  const isVerified = await rbacService.verifyMfaStepUp(
    { id: session.userId, email: session.email },
    code || undefined
  );

  if (!isVerified) {
    throw new ForbiddenError(
      `Step-up verification required: Provide a valid MFA code to execute '${action}'.`
    );
  }
}
