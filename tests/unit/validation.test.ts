import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/modules/auth/auth.schema";
import { createOrderSchema, shippingAddressSchema } from "@/modules/checkout/checkout.schema";
import { productFilterQuerySchema } from "@/modules/catalog/catalog.schema";

describe("Validation Schemas (Zod)", () => {
  describe("Auth Schemas", () => {
    it("should accept valid registration data", () => {
      const data = {
        email: "PATRON@RASA.COM",
        password: "securePassword123!",
        name: "Priya Sharma",
        phone: "+91 9876543210",
      };
      const parsed = registerSchema.parse(data);
      expect(parsed.email).toBe("patron@rasa.com"); // trimmed & lowercased
      expect(parsed.name).toBe("Priya Sharma");
    });

    it("should reject weak password (< 8 chars)", () => {
      const data = {
        email: "test@rasa.com",
        password: "short",
        name: "Test User",
      };
      expect(() => registerSchema.parse(data)).toThrow();
    });

    it("should reject invalid email", () => {
      const data = {
        email: "not-an-email",
        password: "securePassword123!",
      };
      expect(() => loginSchema.parse(data)).toThrow();
    });
  });

  describe("Shipping & Checkout Schemas", () => {
    it("should validate a valid 6-digit Indian PIN code", () => {
      const address = {
        name: "Ananya Roy",
        phone: "9876543210",
        street: "123 Heritage Lane, Indiranagar",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560038",
        country: "India",
      };
      const parsed = shippingAddressSchema.parse(address);
      expect(parsed.postalCode).toBe("560038");
    });

    it("should reject invalid 5-digit PIN code", () => {
      const address = {
        name: "Ananya Roy",
        phone: "9876543210",
        street: "123 Heritage Lane",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "56003", // 5 digits
      };
      expect(() => shippingAddressSchema.parse(address)).toThrow();
    });
  });

  describe("Catalog Filter Schemas", () => {
    it("should parse and coerce query strings", () => {
      const query = {
        page: "2",
        limit: "15",
        category: "silk",
        minPrice: "2000",
        maxPrice: "10000",
        sortBy: "price-low",
      };
      const parsed = productFilterQuerySchema.parse(query);
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(15);
      expect(parsed.minPrice).toBe(2000);
      expect(parsed.sortBy).toBe("price-low");
    });
  });
});
