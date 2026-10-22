import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { changePasswordSchema } from "@/modules/auth/auth.schema";
import { authService } from "@/modules/auth/auth.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/rate-limit/rate-limiter";
import { SESSION_COOKIE_NAME } from "@/lib/security/session";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    enforceRateLimit(`change-password:${session.userId}`, { maxRequests: 5, windowMs: 60 * 1000 });

    const input = await validateBody(req, changePasswordSchema);
    const currentToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    const result = await authService.changePassword(session.userId, input, currentToken);
    return apiSuccess(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
