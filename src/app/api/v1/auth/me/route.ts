import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/security/guards";
import { authService } from "@/modules/auth/auth.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const profile = await authService.getProfile(session.userId);
    return apiSuccess(profile);
  } catch (error) {
    return handleApiError(error);
  }
}
