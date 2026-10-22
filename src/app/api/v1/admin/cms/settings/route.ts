import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/security/guards";
import { cmsService } from "@/modules/cms/cms.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, BadRequestError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const settingsData = await cmsService.getStoreSettings();
    return apiSuccess(settingsData);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();

    if (!body) {
      throw new BadRequestError("Settings data is required.");
    }

    const result = await cmsService.saveStoreSettings(body, user.userId);
    return apiSuccess(result, "Store settings and operational configurations saved successfully.");
  } catch (error) {
    return handleApiError(error);
  }
}
