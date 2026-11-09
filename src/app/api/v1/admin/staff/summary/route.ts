import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/security/guards";
import { prisma } from "@/lib/db/prisma";
import { rbacService } from "@/modules/rbac/rbac.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "staff:read");
    const [staff, activeUsers] = await Promise.all([
      rbacService.listStaffMembers(),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    return apiSuccess({
      totalStaff: staff.length,
      activeUsers,
      pendingInvitations: null,
      mfaEnabled: staff.filter((member) => member.mfaEnabled).length,
      mfaTrackedStaff: staff.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
