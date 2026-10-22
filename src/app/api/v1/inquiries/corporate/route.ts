import { NextRequest } from "next/server";
import { validateBody } from "@/lib/validation/api-validator";
import { corporateInquirySchema } from "@/modules/cms/cms.schema";
import { cmsService } from "@/modules/cms/cms.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/rate-limit/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client-ip";
    enforceRateLimit(`corporate:${ip}`, { maxRequests: 5, windowMs: 60 * 1000 });

    const input = await validateBody(req, corporateInquirySchema);
    const inquiry = await cmsService.submitCorporateInquiry(input);

    return apiSuccess(
      { id: inquiry.id },
      "Your corporate inquiry has been submitted. Our curator will contact you within 24 hours.",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
