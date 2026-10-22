import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { updateProfileSchema } from "@/modules/auth/auth.schema";
import { authService } from "@/modules/auth/auth.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const input = await validateBody(req, updateProfileSchema);
    const updated = await authService.updateProfile(session.userId, input);

    return apiSuccess(updated, "Profile updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
