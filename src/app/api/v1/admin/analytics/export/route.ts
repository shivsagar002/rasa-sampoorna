import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { exportQuerySchema } from "@/modules/analytics/analytics.schema";
import { analyticsService } from "@/modules/analytics/analytics.service";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);

    const { searchParams } = req.nextUrl;
    const query = exportQuerySchema.parse({
      type: searchParams.get("type"),
      preset: searchParams.get("preset") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    });

    const report = await analyticsService.exportCsvReport(query);

    return new NextResponse(report.content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${report.filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
