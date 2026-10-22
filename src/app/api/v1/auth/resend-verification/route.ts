import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { resendVerificationSchema } from "@/modules/auth/auth.schema";
import { authService } from "@/modules/auth/auth.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, ValidationError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/rate-limit/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client-ip";
    enforceRateLimit(`resend-verify:${ip}`, { maxRequests: 5, windowMs: 60 * 1000 });

    const user = await getCurrentUser(req);
    const body = await validateBody(req, resendVerificationSchema);

    const target = body.email || user?.email;
    if (!target) {
      throw new ValidationError("Please provide an email address.");
    }

    const result = await authService.resendVerification(target);
    return apiSuccess(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
