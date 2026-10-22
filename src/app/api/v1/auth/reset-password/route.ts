import { NextRequest } from "next/server";
import { validateBody } from "@/lib/validation/api-validator";
import { resetPasswordSchema } from "@/modules/auth/auth.schema";
import { authService } from "@/modules/auth/auth.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/rate-limit/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client-ip";
    enforceRateLimit(`reset-password:${ip}`, { maxRequests: 5, windowMs: 60 * 1000 });

    const input = await validateBody(req, resetPasswordSchema);
    const result = await authService.resetPassword(input);

    return apiSuccess(result, result.message);
  } catch (error) {
    return handleApiError(error);
  }
}
