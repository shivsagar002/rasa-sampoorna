import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/security/guards";
import { validateBody, validateQuery } from "@/lib/validation/api-validator";
import { notificationPreferencesSchema } from "@/modules/notifications/notification.schema";
import { notificationService } from "@/modules/notifications/notification.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, ValidationError } from "@/lib/api/errors";
import { z } from "zod";

const preferencesQuerySchema = z.object({
  email: z.string().email().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const query = validateQuery(req, preferencesQuerySchema);

    const email = user?.email || query.email;
    const userId = user?.userId;

    if (!userId && !email) {
      throw new ValidationError("Please log in or supply a registered email address to view preferences");
    }

    const preferences = await notificationService.getPreferences({ userId, email });
    return apiSuccess({ preferences, email: email || null });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const query = validateQuery(req, preferencesQuerySchema);

    const email = user?.email || query.email;
    const userId = user?.userId;

    if (!userId && !email) {
      throw new ValidationError("Please log in or supply a registered email address to modify preferences");
    }

    const updates = await validateBody(req, notificationPreferencesSchema.partial());
    const preferences = await notificationService.updatePreferences({ userId, email }, updates);

    return apiSuccess(
      { preferences, message: "Notification preferences updated successfully" },
      "Preferences saved"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
