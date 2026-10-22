import { describe, it, expect } from "vitest";
import { checkRateLimit, enforceRateLimit } from "@/lib/rate-limit/rate-limiter";
import { RateLimitError } from "@/lib/api/errors";

describe("Rate Limiting on Authentication Endpoints", () => {
  it("should permit requests within configured threshold", () => {
    const id = "client-ip-auth-permit-test";
    const config = { maxRequests: 5, windowMs: 10000 };

    for (let i = 0; i < 5; i++) {
      const res = checkRateLimit(id, config);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4 - i);
    }
  });

  it("should block requests and throw RateLimitError when exceeding threshold", () => {
    const id = "client-ip-auth-block-test";
    const config = { maxRequests: 3, windowMs: 10000 };

    // First 3 should pass
    enforceRateLimit(id, config);
    enforceRateLimit(id, config);
    enforceRateLimit(id, config);

    // 4th must throw RateLimitError (HTTP 429)
    expect(() => enforceRateLimit(id, config)).toThrow(RateLimitError);

    // Check direct limit status
    const status = checkRateLimit(id, config);
    expect(status.allowed).toBe(false);
    expect(status.remaining).toBe(0);
    expect(status.resetAt).toBeGreaterThan(Date.now());
  });

  it("should track distinct clients and endpoints separately", () => {
    const clientA = "ip-192-168-1-1:login";
    const clientB = "ip-192-168-1-2:login";
    const config = { maxRequests: 2, windowMs: 10000 };

    // Exhaust client A
    enforceRateLimit(clientA, config);
    enforceRateLimit(clientA, config);
    expect(() => enforceRateLimit(clientA, config)).toThrow(RateLimitError);

    // Client B should still have allowance
    const resB = checkRateLimit(clientB, config);
    expect(resB.allowed).toBe(true);
    expect(resB.remaining).toBe(1);
  });
});
