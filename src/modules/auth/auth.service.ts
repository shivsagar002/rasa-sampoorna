import { prisma } from "@/lib/db/prisma";
import { hashPassword, comparePassword } from "@/lib/security/password";
import { signSessionToken, SessionPayload } from "@/lib/security/session";
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError } from "@/lib/api/errors";
import {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ChangePasswordInput,
  UpdateProfileInput,
  DeleteAccountInput,
} from "./auth.schema";
import { UserRole } from "@prisma/client";
import crypto from "crypto";
import { sendEmail } from "@/lib/email/email-service";
import { notificationService } from "@/modules/notifications/notification.service";
import { env } from "@/lib/validation/env";
import { logger } from "@/lib/observability/logger";

export class AuthService {
  /**
   * Helper to generate a cryptographically secure random hex token
   */
  private generateSecureToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString("hex");
  }

  /**
   * Register a new customer account and dispatch verification email
   */
  async register(
    input: RegisterInput,
    clientIp?: string,
    userAgent?: string
  ): Promise<{ user: SessionPayload & { id: string; emailVerified: boolean }; token: string }> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictError("An account with this email address already exists. Please log in.");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        phone: input.phone || null,
        role: UserRole.CUSTOMER,
      },
    });

    // Generate Email Verification Token (24 hours validity)
    const verificationToken = this.generateSecureToken();
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token: verificationToken,
        type: "EMAIL_VERIFY",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Send Branded Verification Email & Welcome Note asynchronously
    const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;
    notificationService
      .notifyVerifyEmail({
        recipient: user.email,
        customerName: user.name,
        verifyUrl,
        userId: user.id,
      })
      .catch((e) => logger.warn("[VerificationNotificationFailed]", { error: e }));

    notificationService
      .notifyWelcome({
        recipient: user.email,
        customerName: user.name,
        userId: user.id,
      })
      .catch((e) => logger.warn("[WelcomeNotificationFailed]", { error: e }));

    // Issue Session Token & Record Session in DB
    const payload: SessionPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await signSessionToken(payload);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + env.AUTH_SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        ipAddress: clientIp,
        userAgent,
      },
    });

    return {
      user: {
        id: user.id,
        emailVerified: false,
        ...payload,
      },
      token,
    };
  }

  /**
   * Authenticate customer with email and password
   */
  async login(
    input: LoginInput,
    clientIp?: string,
    userAgent?: string
  ): Promise<{ user: SessionPayload & { id: string; emailVerified: boolean }; token: string }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const isValid = await comparePassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const payload: SessionPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await signSessionToken(payload);

    // Record session in DB
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + env.AUTH_SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
        ipAddress: clientIp,
        userAgent,
      },
    });

    return {
      user: {
        id: user.id,
        emailVerified: !!user.emailVerified,
        ...payload,
      },
      token,
    };
  }

  /**
   * Revoke active session on logout
   */
  async logout(token?: string) {
    if (token) {
      await prisma.session.deleteMany({
        where: { token },
      });
    }
  }

  /**
   * Verify email address using token
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record || record.type !== "EMAIL_VERIFY" || record.expiresAt < new Date()) {
      throw new ValidationError("Verification link is invalid or has expired. Please request a new one.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email: record.identifier },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({
        where: { id: record.id },
      }),
    ]);

    return { success: true, message: "Your email has been verified successfully." };
  }

  /**
   * Resend email verification link
   */
  async resendVerification(emailOrUserId: string): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUserId }, { id: emailOrUserId }],
      },
    });

    if (!user || !user.isActive) {
      // Security: Do not reveal user existence
      return { success: true, message: "If an unverified account exists, a verification link has been sent." };
    }

    if (user.emailVerified) {
      return { success: true, message: "Your email address is already verified." };
    }

    // Invalidate existing verification tokens
    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email, type: "EMAIL_VERIFY" },
    });

    // Create fresh token
    const token = this.generateSecureToken();
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        type: "EMAIL_VERIFY",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
    notificationService
      .notifyVerifyEmail({
        recipient: user.email,
        customerName: user.name,
        verifyUrl,
        userId: user.id,
      })
      .catch((e) => logger.warn("[VerificationNotificationFailed]", { error: e }));

    return { success: true, message: "A fresh verification link has been sent to your email address." };
  }

  /**
   * Forgot password flow — generates single-use reset token
   * Note: Always returns generic message to avoid leaking registered emails
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && user.isActive) {
      // Invalidate existing password reset tokens for this email
      await prisma.verificationToken.deleteMany({
        where: { identifier: email, type: "PASSWORD_RESET" },
      });

      // Generate single-use reset token (1 hour validity)
      const token = this.generateSecureToken();
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          type: "PASSWORD_RESET",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
      notificationService
        .notifyPasswordReset({
          recipient: email,
          customerName: user.name || "Patron",
          resetUrl,
          userId: user.id,
        })
        .catch((e) => logger.warn("[PasswordResetNotificationFailed]", { error: e }));
    }

    return {
      success: true,
      message: "If your email is registered in our system, you will receive a password reset link shortly.",
    };
  }

  /**
   * Reset password with single-use token and revoke all active sessions
   */
  async resetPassword(input: ResetPasswordInput): Promise<{ success: boolean; message: string }> {
    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { token: input.token },
    });

    if (!tokenRecord || tokenRecord.type !== "PASSWORD_RESET" || tokenRecord.expiresAt < new Date()) {
      throw new ValidationError("Password reset link is invalid or has expired. Please request a new one.");
    }

    const user = await prisma.user.findUnique({
      where: { email: tokenRecord.identifier },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError("Account");
    }

    const passwordHash = await hashPassword(input.newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      // Revoke all existing sessions for this user
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
      // Delete used token (single-use guarantee)
      prisma.verificationToken.delete({
        where: { id: tokenRecord.id },
      }),
    ]);

    logger.info(`[PasswordReset] Password reset successfully for user: ${user.email}`);

    notificationService
      .notifySecurityAlert({
        recipient: user.email,
        customerName: user.name,
        eventDescription: "Account password was reset via email recovery link",
        userId: user.id,
      })
      .catch((e) => logger.warn("[SecurityAlertNotificationFailed]", { error: e }));

    return {
      success: true,
      message: "Your password has been reset successfully. Please log in with your new password.",
    };
  }

  /**
   * Change password for logged-in user and revoke other sessions
   */
  async changePassword(userId: string, input: ChangePasswordInput, currentToken?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    const isValid = await comparePassword(input.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new ValidationError("Current password does not match.");
    }

    const newPasswordHash = await hashPassword(input.newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      }),
      // Revoke all other sessions except current session
      ...(currentToken
        ? [
            prisma.session.deleteMany({
              where: {
                userId,
                token: { not: currentToken },
              },
            }),
          ]
        : []),
    ]);

    notificationService
      .notifySecurityAlert({
        recipient: user.email,
        customerName: user.name,
        eventDescription: "Account password was changed",
        userId: user.id,
      })
      .catch((e) => logger.warn("[SecurityAlertNotificationFailed]", { error: e }));

    return { success: true, message: "Password updated successfully." };
  }

  /**
   * Get full customer profile with verification status, preferences, addresses, and order summary
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        notificationPreferences: true,
        createdAt: true,
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmountMinorUnits: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                productName: true,
                productImage: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User profile");
    }

    let parsedPreferences = { orderUpdates: true, promotions: false, artisanStories: true };
    if (user.notificationPreferences) {
      try {
        parsedPreferences = JSON.parse(user.notificationPreferences);
      } catch {
        // use defaults
      }
    }

    return {
      ...user,
      notificationPreferences: parsedPreferences,
      orders: user.orders.map((o) => ({
        ...o,
        totalAmount: o.totalAmountMinorUnits / 100,
      })),
    };
  }

  /**
   * Update profile information
   */
  async updateProfile(userId: string, input: UpdateProfileInput) {
    const dataToUpdate: Record<string, unknown> = {};

    if (input.name !== undefined) dataToUpdate.name = input.name;
    if (input.phone !== undefined) dataToUpdate.phone = input.phone || null;
    if (input.notificationPreferences !== undefined) {
      dataToUpdate.notificationPreferences = JSON.stringify(input.notificationPreferences);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        emailVerified: true,
        notificationPreferences: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Account deletion request with preservation of required financial/order records
   */
  async deleteAccount(userId: string, input: DeleteAccountInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new ValidationError("Incorrect password. Account deletion cannot be confirmed.");
    }

    // Deactivate user, anonymize profile, and revoke all sessions
    // Financial records (Orders, Payments, Refunds) remain safely linked via historical snapshots
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          name: "Deleted Customer",
          phone: null,
          email: `deleted_${userId.slice(0, 8)}_${Date.now()}@anonymized.rasasampoorna.com`,
          passwordHash: "DELETED_ACCOUNT_INACTIVE",
        },
      }),
      prisma.session.deleteMany({
        where: { userId },
      }),
      prisma.cart.deleteMany({
        where: { userId },
      }),
      prisma.wishlist.deleteMany({
        where: { userId },
      }),
    ]);

    logger.info(`[AccountDeletion] Account ${userId} deactivated and anonymized.`);

    return {
      success: true,
      message: "Your account has been deleted. We have removed your active profile and session data.",
    };
  }
}

export const authService = new AuthService();
