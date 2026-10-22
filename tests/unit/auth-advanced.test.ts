import { describe, it, expect } from "vitest";
import {
  registerSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from "@/modules/auth/auth.schema";
import { addressSchema } from "@/modules/addresses/address.schema";
import { AddressType } from "@prisma/client";

describe("Customer Authentication & Account Validation Tests", () => {
  describe("Registration Input Validation", () => {
    it("should accept valid Indian phone numbers with or without +91", () => {
      const validCases = ["9876543210", "+91 9876543210", "+91-9876543210", "8123456789", "7000112233"];
      for (const phone of validCases) {
        const parsed = registerSchema.safeParse({
          email: "test@rasa.com",
          password: "password123!",
          name: "Test User",
          phone,
        });
        expect(parsed.success).toBe(true);
      }
    });

    it("should reject invalid phone numbers", () => {
      const invalidCases = ["12345", "abcdefghij", "0000000000", "5555555555"];
      for (const phone of invalidCases) {
        const parsed = registerSchema.safeParse({
          email: "test@rasa.com",
          password: "password123!",
          name: "Test User",
          phone,
        });
        expect(parsed.success).toBe(false);
      }
    });

    it("should require password to contain both letters and numbers", () => {
      // Letters only
      expect(registerSchema.safeParse({
        email: "test@rasa.com",
        password: "onlylettershere",
        name: "Test User",
      }).success).toBe(false);

      // Numbers only
      expect(registerSchema.safeParse({
        email: "test@rasa.com",
        password: "123456789012",
        name: "Test User",
      }).success).toBe(false);

      // Valid alphanumeric
      expect(registerSchema.safeParse({
        email: "test@rasa.com",
        password: "validPassword123",
        name: "Test User",
      }).success).toBe(true);
    });
  });

  describe("Password Reset Schemas", () => {
    it("should validate forgot-password email", () => {
      expect(forgotPasswordSchema.safeParse({ email: "patron@rasasampoorna.com" }).success).toBe(true);
      expect(forgotPasswordSchema.safeParse({ email: "invalid-email" }).success).toBe(false);
    });

    it("should validate reset-password token and minimum length", () => {
      expect(resetPasswordSchema.safeParse({
        token: "token-less-than-10",
        newPassword: "short",
      }).success).toBe(false);

      expect(resetPasswordSchema.safeParse({
        token: "a1b2c3d4e5f678901234567890",
        newPassword: "StrongPassword2026",
      }).success).toBe(true);
    });

    it("should validate change-password payload", () => {
      expect(changePasswordSchema.safeParse({
        currentPassword: "OldPassword123",
        newPassword: "NewStrongPassword456",
      }).success).toBe(true);
    });
  });

  describe("Address Management Schemas", () => {
    it("should validate complete Indian address with optional delivery instructions", () => {
      const addr = {
        name: "Priya Sharma",
        phone: "9876543210",
        street: "Flat 402, Lotus Residency, Indiranagar 12th Main",
        landmark: "Opposite BDA Complex",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560038",
        country: "India",
        type: AddressType.SHIPPING,
        isDefault: true,
        deliveryInstructions: "Please call on arrival and leave with reception",
      };

      const parsed = addressSchema.parse(addr);
      expect(parsed.postalCode).toBe("560038");
      expect(parsed.isDefault).toBe(true);
      expect(parsed.deliveryInstructions).toBe("Please call on arrival and leave with reception");
    });

    it("should reject invalid postal codes", () => {
      expect(addressSchema.safeParse({
        name: "Priya",
        phone: "9876543210",
        street: "123 Street",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "56003", // 5 digits
      }).success).toBe(false);

      expect(addressSchema.safeParse({
        name: "Priya",
        phone: "9876543210",
        street: "123 Street",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "5600388", // 7 digits
      }).success).toBe(false);
    });
  });

  describe("Account Deletion Safety Check", () => {
    it('should strictly require "DELETE MY ACCOUNT" confirmation string', () => {
      expect(deleteAccountSchema.safeParse({
        password: "mypassword123",
        confirmationText: "delete my account", // lowercase
      }).success).toBe(false);

      expect(deleteAccountSchema.safeParse({
        password: "mypassword123",
        confirmationText: "DELETE MY ACCOUNT",
      }).success).toBe(true);
    });
  });
});
