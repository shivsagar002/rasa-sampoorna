import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireMfaVerification } from "@/lib/security/guards";
import { privacyService } from "@/modules/privacy/privacy.service";
import { z } from "zod";

const deleteSchema = z.object({
  userIdOrEmail: z.string().min(1, "Customer identifier is required."),
  reason: z.string().min(5, "A formal compliance reason must be provided."),
  mfaCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "privacy:delete");

    const body = await req.json();
    const validated = deleteSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: { message: "Invalid request payload", issues: validated.error.issues } },
        { status: 400 }
      );
    }

    const { userIdOrEmail, reason, mfaCode } = validated.data;

    // Sensitive action step-up MFA verification
    await requireMfaVerification(req, "privacy:delete", mfaCode);

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;

    const result = await privacyService.deleteCustomerData({
      userIdOrEmail,
      reason,
      actor: {
        userId: session.userId,
        email: session.email,
        role: session.role,
      },
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: { message: err.message || "Failed to process customer deletion request." } },
      { status }
    );
  }
}
