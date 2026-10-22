import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/security/guards";
import { cmsService } from "@/modules/cms/cms.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const isPreviewRequested = req.nextUrl.searchParams.get("preview") === "true";
    let isPreview = false;

    if (isPreviewRequested) {
      const user = await getCurrentUser(req);
      if (user && (user.role === UserRole.STAFF || user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN)) {
        isPreview = true;
      }
    }

    const homepage = await cmsService.getHomepageCms({ preview: isPreview });
    return apiSuccess(homepage);
  } catch (error) {
    return handleApiError(error);
  }
}
