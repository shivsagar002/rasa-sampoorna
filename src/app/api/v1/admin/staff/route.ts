import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/security/guards";
import { rbacService } from "@/modules/rbac/rbac.service";
import { AdminRole, Permission, ALL_PERMISSIONS } from "@/modules/rbac/permissions";
import { z } from "zod";

const assignRoleSchema = z.object({
  targetUserId: z.string().uuid("Invalid target user ID."),
  newRole: z.enum([
    "OWNER",
    "ADMINISTRATOR",
    "CATALOG_MANAGER",
    "ORDER_FULFILLMENT_MANAGER",
    "CUSTOMER_SUPPORT",
  ] as [AdminRole, ...AdminRole[]]),
  customPermissions: z
    .array(z.string())
    .optional()
    .refine(
      (perms) => !perms || perms.every((p) => ALL_PERMISSIONS.includes(p as Permission)),
      "Contains invalid permission identifier."
    ),
  mfaEnabled: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "staff:read");
    const staffList = await rbacService.listStaffMembers();
    return NextResponse.json({ success: true, staff: staffList });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: { message: err.message || "Failed to retrieve staff members." } },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission(req, "staff:manage_roles");

    const body = await req.json();
    const validated = assignRoleSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: { message: "Validation error", issues: validated.error.issues } },
        { status: 400 }
      );
    }

    const { targetUserId, newRole, customPermissions, mfaEnabled } = validated.data;
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;

    const result = await rbacService.assignStaffRole({
      actor: {
        id: session.userId,
        email: session.email,
        role: session.role,
      },
      targetUserId,
      newRole,
      customPermissions: customPermissions as Permission[] | undefined,
      mfaEnabled,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: `Staff member role updated to '${newRole}' successfully.`,
      staff: result,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: { message: err.message || "Failed to assign staff role." } },
      { status }
    );
  }
}
