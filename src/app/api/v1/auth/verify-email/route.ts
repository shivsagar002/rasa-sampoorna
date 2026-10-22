import { NextRequest } from "next/server";
import { validateBody } from "@/lib/validation/api-validator";
import { verifyEmailSchema } from "@/modules/auth/auth.schema";
import { authService } from "@/modules/auth/auth.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/rate-limit/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client-ip";
    enforceRateLimit(`verify-email:${ip}`, { maxRequests: 10, windowMs: 60 * 1000 });

    const input = await validateBody(req, verifyEmailSchema);
    const result = await authService.verifyEmail(input.token);

    return apiSuccess(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
