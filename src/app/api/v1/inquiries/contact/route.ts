import { NextRequest } from "next/server";
import { validateBody } from "@/lib/validation/api-validator";
import { contactMessageSchema } from "@/modules/cms/cms.schema";
import { cmsService } from "@/modules/cms/cms.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/rate-limit/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client-ip";
    enforceRateLimit(`contact:${ip}`, { maxRequests: 5, windowMs: 60 * 1000 });

    const input = await validateBody(req, contactMessageSchema);
    const message = await cmsService.submitContactMessage(input);

    return apiSuccess(
      { id: message.id },
      "Your message has been received. Thank you for reaching out to RASA Sampoorna.",
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
