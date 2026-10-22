import { NextRequest } from "next/server";
import { cmsService } from "@/modules/cms/cms.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const { settings, integrations } = await cmsService.getStoreSettings();

    // Public settings: only return public configuration (never secrets)
    return apiSuccess({
      storeName: settings.storeName,
      brandTagline: settings.brandTagline,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      conciergeWhatsApp: settings.conciergeWhatsApp,
      operatingHours: settings.operatingHours,
      currencyCode: settings.currencyCode,
      currencySymbol: settings.currencySymbol,
      timezone: settings.timezone,
      freeShippingThresholdRupees: settings.freeShippingThresholdRupees,
      standardShippingFeeRupees: settings.standardShippingFeeRupees,
      returnWindowDays: settings.returnWindowDays,
      taxRatePercentage: settings.taxRatePercentage,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
