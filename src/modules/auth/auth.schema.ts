import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Please provide a valid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Full name must be at least 2 characters long").trim(),
  phone: z
    .string()
    .regex(/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/, "Please enter a valid 10-digit Indian phone number")
    .optional()
    .or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, "Verification token is required"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Please provide a valid email address").toLowerCase().trim().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please provide a valid email address").toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, "Reset token is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").trim().optional(),
  phone: z
    .string()
    .regex(/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/, "Please enter a valid 10-digit Indian phone number")
    .optional()
    .or(z.literal("")),
  notificationPreferences: z
    .object({
      orderUpdates: z.boolean().default(true),
      promotions: z.boolean().default(false),
      artisanStories: z.boolean().default(true),
    })
    .optional(),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required to confirm account deletion"),
  confirmationText: z.literal("DELETE MY ACCOUNT", {
    errorMap: () => ({ message: 'Please type "DELETE MY ACCOUNT" exactly to confirm' }),
  }),
});

export type RegisterInput = z.output<typeof registerSchema>;
export type LoginInput = z.output<typeof loginSchema>;
export type VerifyEmailInput = z.output<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.output<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.output<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.output<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.output<typeof changePasswordSchema>;
export type UpdateProfileInput = z.output<typeof updateProfileSchema>;
export type DeleteAccountInput = z.output<typeof deleteAccountSchema>;
