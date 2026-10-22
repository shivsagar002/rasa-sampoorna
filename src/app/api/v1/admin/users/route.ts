import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/security/guards";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/security/password";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, BadRequestError, ConflictError } from "@/lib/api/errors";
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
