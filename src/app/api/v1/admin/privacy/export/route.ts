import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/security/guards";
import { privacyService } from "@/modules/privacy/privacy.service";
import { z } from "zod";

const exportSchema = z.object({
  userIdOrEmail: z.string().min(1, "Customer identifier is required."),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "privacy:export");

    const body = await req.json();
    const validated = exportSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: { message: "Invalid request payload", issues: validated.error.issues } },
        { status: 400 }
      );
    }

    const data = await privacyService.exportCustomerData(validated.data.userIdOrEmail, {
      userId: session.userId,
      email: session.email,
      role: session.role,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: { message: err.message || "Failed to export customer data." } },
      { status }
    );
  }
}
