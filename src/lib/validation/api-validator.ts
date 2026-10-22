import { NextRequest } from "next/server";
import { z, ZodSchema } from "zod";
import { ValidationError } from "@/lib/api/errors";

export async function validateBody<Output, Input = unknown>(
  req: NextRequest,
  schema: z.ZodType<Output, z.ZodTypeDef, Input>
): Promise<Output> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Malformed JSON payload in request body.");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

export function validateQuery<Output, Input = unknown>(
  req: NextRequest,
  schema: z.ZodType<Output, z.ZodTypeDef, Input>
): Output {
  const url = new URL(req.url);
  const queryObj: Record<string, string | string[]> = {};

  url.searchParams.forEach((value, key) => {
    if (queryObj[key]) {
      if (Array.isArray(queryObj[key])) {
        (queryObj[key] as string[]).push(value);
      } else {
        queryObj[key] = [queryObj[key] as string, value];
      }
    } else {
      queryObj[key] = value;
    }
  });

  const result = schema.safeParse(queryObj);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

export function validateParams<Output, Input = unknown>(
  params: unknown,
  schema: z.ZodType<Output, z.ZodTypeDef, Input>
): Output {
  const result = schema.safeParse(params);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}

// Common pagination and filter schemas
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
