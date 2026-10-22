import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/security/guards";
import { operationsService } from "@/modules/operations/operations.service";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "operations:read");

    const health = await operationsService.getOperationalHealth();

    return NextResponse.json({
      success: true,
      data: health,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: { message: err.message || "Failed to retrieve operational health." } },
      { status }
    );
  }
}
