import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { deleteAccountSchema } from "@/modules/auth/auth.schema";
import { authService } from "@/modules/auth/auth.service";
import { removeSessionCookie } from "@/lib/security/session";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/rate-limit/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    enforceRateLimit(`delete-account:${session.userId}`, { maxRequests: 3, windowMs: 60 * 1000 });

    const input = await validateBody(req, deleteAccountSchema);
    const result = await authService.deleteAccount(session.userId, input);

    await removeSessionCookie();

    return apiSuccess(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
