import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/security/guards";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/security/password";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, BadRequestError, ConflictError, ForbiddenError } from "@/lib/api/errors";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { rbacService } from "@/modules/rbac/rbac.service";

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["CUSTOMER", "STAFF", "ADMIN", "SUPER_ADMIN"]).default("CUSTOMER"),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["CUSTOMER", "STAFF", "ADMIN", "SUPER_ADMIN"]).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");
    const search = searchParams.get("search");

    const where: any = {};
    if (roleFilter && roleFilter !== "ALL") {
      where.role = roleFilter as UserRole;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return apiSuccess({ users }, "Users retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin(req);
    const body = await req.json();
    const input = createUserSchema.parse(body);

    // HIERARCHY ENFORCEMENT:
    // Only Super Admin (Owner) can create or provision ADMIN or SUPER_ADMIN accounts.
    if (session.role !== UserRole.SUPER_ADMIN && (input.role === "ADMIN" || input.role === "SUPER_ADMIN")) {
      throw new ForbiddenError(
        "Insufficient privileges: Only Super Admins (Owners) can create or provision Administrator or Super Admin accounts."
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError("A user with this email address already exists.");
    }

    const passwordHash = await hashPassword(input.password);

    const newUser = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        phone: input.phone || null,
        role: input.role as UserRole,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // If administrative role, also assign initial role in staff registry
    if (input.role === "STAFF" || input.role === "ADMIN" || input.role === "SUPER_ADMIN") {
      try {
        const assignedRole =
          input.role === "SUPER_ADMIN"
            ? "OWNER"
            : input.role === "ADMIN"
            ? "ADMINISTRATOR"
            : "CUSTOMER_SUPPORT";

        await rbacService.assignStaffRole({
          actor: {
            id: session.userId,
            email: session.email,
            role: session.role,
          },
          targetUserId: newUser.id,
          newRole: assignedRole,
        });
      } catch (err) {
        console.warn("Failed to auto-register staff in RBAC registry:", err);
      }
    }

    return apiSuccess({ user: newUser }, "User created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin(req);
    const body = await req.json();
    const input = updateUserSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    if (!targetUser) {
      throw new BadRequestError("Target user not found.");
    }

    // HIERARCHY ENFORCEMENT:
    // Super Admin (Owner) on top.
    // Administrators cannot modify credentials, status, or permissions of other Administrators or Super Admins.
    rbacService.validateCredentialModification(
      { id: session.userId, role: session.role },
      targetUser
    );

    // If role alteration requested:
    // Administrators cannot promote any account to ADMIN or SUPER_ADMIN
    if (input.role && input.role !== targetUser.role) {
      if (session.role !== UserRole.SUPER_ADMIN && (input.role === UserRole.ADMIN || input.role === UserRole.SUPER_ADMIN)) {
        throw new ForbiddenError(
          "Insufficient privileges: Only Super Admins (Owners) can promote or assign Administrator or Super Admin roles."
        );
      }
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email.toLowerCase();
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.role !== undefined) updateData.role = input.role as UserRole;
    if (input.password) {
      updateData.passwordHash = await hashPassword(input.password);
    }

    const updatedUser = await prisma.user.update({
      where: { id: input.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // If role was updated to/from administrative role, synchronize RBAC staff registry
    if (input.role && input.role !== targetUser.role) {
      if (input.role === UserRole.STAFF || input.role === UserRole.ADMIN || input.role === UserRole.SUPER_ADMIN) {
        try {
          const newAssignedRole =
            input.role === UserRole.SUPER_ADMIN
              ? "OWNER"
              : input.role === UserRole.ADMIN
              ? "ADMINISTRATOR"
              : "CUSTOMER_SUPPORT";

          await rbacService.assignStaffRole({
            actor: {
              id: session.userId,
              email: session.email,
              role: session.role,
            },
            targetUserId: targetUser.id,
            newRole: newAssignedRole,
          });
        } catch (err) {
          console.warn("Failed to update staff registry after user role change:", err);
        }
      }
    }

    return apiSuccess({ user: updatedUser }, "User credentials updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      throw new BadRequestError("User ID is required.");
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!targetUser) {
      throw new BadRequestError("Target user not found.");
    }

    // Administrators cannot delete or deactivate other Administrators or Super Admins
    rbacService.validateCredentialModification(
      { id: session.userId, role: session.role },
      targetUser
    );

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return apiSuccess({ success: true }, "User deactivated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
