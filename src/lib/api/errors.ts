import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/observability/logger";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access forbidden: insufficient permissions") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists or conflicts with current state") {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

/**
 * Standard centralized API error handler for Next.js Route Handlers
 */
export function handleApiError(err: unknown): NextResponse {
  // Re-throw Next.js dynamic prerender bailout errors so Next.js handles route dynamic flagging cleanly
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string" &&
    ((err as { message: string }).message.includes("bail out of prerendering") ||
      (err as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE")
  ) {
    throw err;
  }

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "The submitted data failed validation.",
          details: formattedErrors,
        },
      },
      { status: 400 }
    );
  }

  // 2. Custom App Errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${err.code}] ${err.message}`, { details: err.details, stack: err.stack });
    } else {
      logger.warn(`[${err.code}] ${err.message}`, { details: err.details });
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
      { status: err.statusCode }
    );
  }

  // 3. Unhandled Server Errors
  const unhandled = err instanceof Error ? err : new Error(String(err));
  logger.error("[UnhandledException]", {
    message: unhandled.message,
    stack: unhandled.stack,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message:
          process.env.NODE_ENV === "production"
            ? "An unexpected error occurred. Please try again."
            : unhandled.message,
      },
    },
    { status: 500 }
  );
}
