import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/security/guards";
import { auditService } from "@/modules/audit/audit.service";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "audit:read");

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const entity = searchParams.get("entity") || undefined;
    const action = searchParams.get("action") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const result = await auditService.list({
      page,
      limit,
      entity,
      action,
      userId,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: { message: err.message || "Failed to retrieve audit logs." } },
      { status }
    );
  }
}
