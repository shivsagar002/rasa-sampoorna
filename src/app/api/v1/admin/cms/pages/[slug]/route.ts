import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { cmsService } from "@/modules/cms/cms.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, BadRequestError } from "@/lib/api/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await requireStaff(req);
    const { slug } = await params;

    const page = await cmsService.getPageContent(slug, { preview: true });
    const revisions = await cmsService.getRevisions(slug);

    return apiSuccess({
      ...page,
      revisions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await requireStaff(req);
    const { slug } = await params;
    const body = await req.json();

    if (!body || !body.action) {
      throw new BadRequestError("Action ('SAVE_DRAFT', 'PUBLISH', or 'ROLLBACK') is required.");
    }

    if (body.action === "SAVE_DRAFT") {
      if (!body.data) throw new BadRequestError("Draft data is required.");
      const result = await cmsService.savePageDraft(
        { ...body.data, slug },
        user.userId,
        body.changeSummary
      );
      return apiSuccess(result, `Draft for '${slug}' saved successfully.`);
    }

    if (body.action === "PUBLISH") {
      const result = await cmsService.publishContent(slug, user.userId);
      return apiSuccess(result, `Page '${slug}' published live successfully.`);
    }

    if (body.action === "ROLLBACK") {
      if (!body.targetVersion) {
        throw new BadRequestError("targetVersion is required for rollback.");
      }
      const result = await cmsService.rollbackRevision(slug, Number(body.targetVersion), user.userId);
      return apiSuccess(result, `Page '${slug}' rolled back to version ${body.targetVersion}.`);
    }

    throw new BadRequestError(`Unsupported action '${body.action}'`);
  } catch (error) {
    return handleApiError(error);
  }
}
