import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/security/guards";
import { privacyService } from "@/modules/privacy/privacy.service";
import { z } from "zod";

const preferencesSchema = z.object({
  userIdOrEmail: z.string().min(1, "Customer identifier is required."),
  preferences: z.object({
    emailMarketing: z.boolean().optional(),
    orderAlerts: z.boolean().optional(),
    whatsappUpdates: z.boolean().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "privacy:export");

    const body = await req.json();
    const validated = preferencesSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: { message: "Invalid request payload", issues: validated.error.issues } },
        { status: 400 }
      );
    }

    const { userIdOrEmail, preferences } = validated.data;

    const result = await privacyService.updatePreferences(
      userIdOrEmail,
      preferences,
      {
        userId: session.userId,
        email: session.email,
        role: session.role,
      }
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: { message: err.message || "Failed to update customer communication preferences." } },
      { status }
    );
  }
}
