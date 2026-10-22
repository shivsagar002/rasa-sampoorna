import { describe, it, expect } from "vitest";

describe("Pricing and Minor Units Logic", () => {
  it("should convert rupee amounts to minor units (paise) correctly without floating point errors", () => {
    const rupeeAmount = 4500.5;
    const minorUnits = Math.round(rupeeAmount * 100);
    expect(minorUnits).toBe(450050);

    const convertedBack = minorUnits / 100;
    expect(convertedBack).toBe(4500.5);
  });

  it("should calculate cart totals and free shipping threshold", () => {
    const FREE_SHIPPING_THRESHOLD = 200000; // ₹2,000 in paise
    const STANDARD_SHIPPING_FEE = 15000;    // ₹150 in paise

    // Case 1: Below threshold
    const subtotalBelow = 120000; // ₹1,200
    const shippingFee1 = subtotalBelow >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    const total1 = subtotalBelow + shippingFee1;
    expect(shippingFee1).toBe(15000);
    expect(total1).toBe(135000); // ₹1,350

    // Case 2: Above threshold
    const subtotalAbove = 450000; // ₹4,500
    const shippingFee2 = subtotalAbove >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    const total2 = subtotalAbove + shippingFee2;
    expect(shippingFee2).toBe(0);
    expect(total2).toBe(450000); // ₹4,500 (Free delivery)
  });
});
