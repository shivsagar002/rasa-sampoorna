import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { analyticsQuerySchema } from "@/modules/analytics/analytics.schema";
import { analyticsService } from "@/modules/analytics/analytics.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);

    const { searchParams } = req.nextUrl;
    const query = analyticsQuerySchema.parse({
      preset: searchParams.get("preset") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      compare: searchParams.get("compare") || undefined,
    });

    const analytics = await analyticsService.getDashboardAnalytics(query);
    return apiSuccess(analytics);
  } catch (error) {
    return handleApiError(error);
  }
}
