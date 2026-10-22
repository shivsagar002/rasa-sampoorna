import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { cmsService, DEFAULT_POLICY_PAGES } from "@/modules/cms/cms.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);

    const editableSlugs = [
      { slug: "shipping-policy", title: "Shipping & Delivery Policy", section: "legal" },
      { slug: "refund-policy", title: "Cancellation, Returns & Refunds Policy", section: "legal" },
      { slug: "privacy-policy", title: "Privacy & Data Protection Policy", section: "legal" },
      { slug: "terms-and-conditions", title: "Terms & Conditions of Patronage", section: "legal" },
      { slug: "faq", title: "Frequently Asked Questions", section: "faq" },
    ];

    const pagesWithStatus = await Promise.all(
      editableSlugs.map(async (item) => {
        const page = await cmsService.getPageContent(item.slug, { preview: true });
        return {
          ...item,
          status: page.status,
          version: page.version,
          sectionsCount: page.content.sections?.length || 0,
          faqsCount: page.content.faqs?.length || 0,
        };
      })
    );

    return apiSuccess(pagesWithStatus);
  } catch (error) {
    return handleApiError(error);
  }
}
