import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Return a standardized successful JSON response
 */
export function apiSuccess<T>(data: T, message?: string, status = 200, headers?: HeadersInit): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message ? { message } : {}),
    },
    { status, headers }
  );
}

/**
 * Return a private successful JSON response with strict no-store / anti-caching headers
 * for checkout, cart, payment, orders, and patron accounts.
 */
export function apiPrivateSuccess<T>(data: T, message?: string, status = 200): NextResponse<ApiResponse<T>> {
  return apiSuccess(data, message, status, {
    "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
  });
}

/**
 * Return a public successful JSON response with edge caching and stale-while-revalidate
 * for catalog items, categories, and published CMS content.
 */
export function apiPublicSuccess<T>(
  data: T,
  maxAge = 60,
  sMaxAge = 300,
  message?: string,
  status = 200
): NextResponse<ApiResponse<T>> {
  return apiSuccess(data, message, status, {
    "Cache-Control": `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=600`,
  });
}

/**
 * Return a standardized paginated response
 */
export function apiPaginated<T>(
  data: T[],
  meta: { page: number; limit: number; total: number },
  status = 200,
  headers?: HeadersInit
): NextResponse<PaginatedResponse<T>> {
  const totalPages = Math.ceil(meta.total / meta.limit);
  return NextResponse.json(
    {
      success: true,
      data,
      pagination: {
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
        totalPages,
        hasNextPage: meta.page < totalPages,
        hasPrevPage: meta.page > 1,
      },
    },
    { status, headers }
  );
}

/**
 * Return a public cached paginated response for product catalogs and collections
 */
export function apiPublicPaginated<T>(
  data: T[],
  meta: { page: number; limit: number; total: number },
  maxAge = 60,
  sMaxAge = 120,
  status = 200
): NextResponse<PaginatedResponse<T>> {
  return apiPaginated(data, meta, status, {
    "Cache-Control": `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=600`,
  });
}

/**
 * Return a standardized error response
 */
export function apiError(
  message: string,
  statusCode = 400,
  code = "BAD_REQUEST",
  details?: unknown
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status: statusCode }
  );
}
