import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "@/lib/security/password";
import { signSessionToken, verifySessionToken, SessionPayload } from "@/lib/security/session";
import { UserRole } from "@prisma/client";

describe("Security Infrastructure", () => {
  describe("Password Hashing (bcrypt)", () => {
    it(
      "should hash a password and verify it correctly",
      async () => {
        const password = "mySecretPassword123!";
        const hash = await hashPassword(password);

        expect(hash).not.toBe(password);
        expect(hash.startsWith("$2")).toBe(true);

        const isValid = await comparePassword(password, hash);
        expect(isValid).toBe(true);

        const isInvalid = await comparePassword("wrongPassword", hash);
        expect(isInvalid).toBe(false);
      },
      15000
    );

    it("should reject hashing password shorter than 8 characters", async () => {
      await expect(hashPassword("short")).rejects.toThrow();
    });
  });

  describe("Session Token Signing & Verification (jose)", () => {
    it("should sign and verify session token preserving payload", async () => {
      const payload: SessionPayload = {
        userId: "user-12345",
        email: "test@rasasampoorna.com",
        name: "Devi Artisan",
        role: UserRole.CUSTOMER,
      };

      const token = await signSessionToken(payload);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT format

      const decoded = await verifySessionToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(UserRole.CUSTOMER);
    });

    it("should return null for tampered token", async () => {
      const payload: SessionPayload = {
        userId: "user-12345",
        email: "test@rasasampoorna.com",
        name: "Devi Artisan",
        role: UserRole.CUSTOMER,
      };

      const token = await signSessionToken(payload);
      const tampered = token.slice(0, -5) + "abcde";

      const decoded = await verifySessionToken(tampered);
      expect(decoded).toBeNull();
    });
  });
});
