import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { apiSuccess, apiError, apiPaginated } from "@/lib/api/response";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { ZodError, z } from "zod";

describe("API Response System", () => {
  it("should create standard success responses", async () => {
    const res = apiSuccess({ id: "123", name: "Lotus Saree" }, "Fetched successfully");
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe("Fetched successfully");
    expect(json.data.name).toBe("Lotus Saree");
  });

  it("should format paginated responses with metadata", async () => {
    const items = [{ id: "1" }, { id: "2" }];
    const res = apiPaginated(items, { page: 1, limit: 10, total: 25 });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.pagination.page).toBe(1);
    expect(json.pagination.totalPages).toBe(3);
    expect(json.pagination.hasNextPage).toBe(true);
    expect(json.pagination.hasPrevPage).toBe(false);
  });

  it("should handle NotFoundError through handleApiError", async () => {
    const err = new NotFoundError("Product");
    const res = handleApiError(err);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toBe("Product not found");
  });

  it("should handle ZodError through handleApiError returning 400", async () => {
    const testSchema = z.object({ email: z.string().email() });
    let zodErr: ZodError | null = null;
    try {
      testSchema.parse({ email: "invalid" });
    } catch (e) {
      zodErr = e as ZodError;
    }

    const res = handleApiError(zodErr);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(json.error.details)).toBe(true);
  });

  it("should return an actionable response for an unavailable database", async () => {
    const err = new Prisma.PrismaClientInitializationError(
      "Can't reach database server at `localhost:5432`.",
      "test",
      "P1001"
    );

    const res = handleApiError(err);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.error.code).toBe("DATABASE_UNAVAILABLE");
    expect(json.error.message).toContain("Start PostgreSQL");
    expect(json.error.message).not.toContain("localhost:5432");
    expect(json.error.message).not.toContain("PrismaClientInitializationError");
  });
});
