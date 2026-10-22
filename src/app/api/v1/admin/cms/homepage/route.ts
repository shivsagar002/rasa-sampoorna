import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { cmsService } from "@/modules/cms/cms.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, BadRequestError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);
    const homepage = await cmsService.getHomepageCms({ preview: true });
    const revisions = await cmsService.getRevisions("homepage");

    return apiSuccess({
      ...homepage,
      revisions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireStaff(req);
    const body = await req.json();

    if (!body || !body.action) {
      throw new BadRequestError("Action ('SAVE_DRAFT' or 'PUBLISH') is required.");
    }

    if (body.action === "SAVE_DRAFT") {
      if (!body.data) throw new BadRequestError("Draft data is required.");
      const result = await cmsService.saveHomepageDraft(body.data, user.userId, body.changeSummary);
      return apiSuccess(result, "Homepage CMS draft saved successfully.");
    }

    if (body.action === "PUBLISH") {
      const result = await cmsService.publishContent("homepage", user.userId);
      return apiSuccess(result, "Homepage published live successfully.");
    }

    throw new BadRequestError(`Unsupported action '${body.action}'`);
  } catch (error) {
    return handleApiError(error);
  }
}
