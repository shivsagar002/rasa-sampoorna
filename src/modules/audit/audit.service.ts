import { prisma } from "@/lib/db/prisma";

export interface AuditActor {
  userId?: string;
  email?: string;
  role?: string;
}

export interface RecordAuditParams {
  actor?: AuditActor;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditLogFilter {
  page?: number;
  limit?: number;
  entity?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

const REDACTED_PLACEHOLDER = "[REDACTED]";

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /hash/i,
  /token/i,
  /secret/i,
  /auth/i,
  /cookie/i,
  /key/i,
  /signature/i,
  /cvv/i,
  /card.*number/i,
  /private/i,
];

/**
 * Deep sanitization utility to ensure sensitive credentials, tokens, and secrets
 * are NEVER persisted to administrative audit logs.
 */
export function sanitizeAuditData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Check if string looks like a JWT
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(obj)) {
      return REDACTED_PLACEHOLDER as unknown as T;
    }
    // Check if string looks like an authorization header / secret
    if (obj.toLowerCase().startsWith("bearer ") || obj.toLowerCase().startsWith("rzp_test_") || obj.toLowerCase().startsWith("rzp_live_")) {
      return REDACTED_PLACEHOLDER as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeAuditData(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitiveKey) {
        sanitized[key] = REDACTED_PLACEHOLDER;
      } else {
        sanitized[key] = sanitizeAuditData(value);
      }
    }
    return sanitized as T;
  }

  return obj;
}

export class AuditService {
  /**
   * Records a comprehensive, privacy-sanitized administrative audit log.
   */
  async record(params: RecordAuditParams) {
    try {
      const { actor, action, entity, entityId, before, after, details, ipAddress } = params;

      const sanitizedBefore = before !== undefined ? sanitizeAuditData(before) : undefined;
      const sanitizedAfter = after !== undefined ? sanitizeAuditData(after) : undefined;
      const sanitizedDetails = details !== undefined ? sanitizeAuditData(details) : undefined;

      const auditPayload = {
        actorEmail: actor?.email,
        actorRole: actor?.role,
        before: sanitizedBefore,
        after: sanitizedAfter,
        metadata: sanitizedDetails,
      };

      return await prisma.auditLog.create({
        data: {
          action,
          entity,
          entityId,
          userId: actor?.userId,
          details: JSON.stringify(auditPayload),
          ipAddress,
        },
      });
    } catch (err) {
      console.warn("Failed to record audit log:", err);
    }
  }

  /**
   * Backward-compatible shorthand logging method.
   */
  async log(
    action: string,
    entity: string,
    entityId: string,
    userId?: string,
    details?: Record<string, unknown>,
    ipAddress?: string
  ) {
    return this.record({
      actor: { userId },
      action,
      entity,
      entityId,
      details,
      ipAddress,
    });
  }

  /**
   * Paginated, filterable query for administrative audit history.
   */
  async list(filters: AuditLogFilter = {}) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.entity && filters.entity !== "ALL") {
      where.entity = filters.entity;
    }

    if (filters.action && filters.action !== "ALL") {
      where.action = filters.action;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              email: true,
              name: true,
              role: true,
            },
          },
        },
      }),
    ]);

    // Parse details safely
    const formattedLogs = logs.map((log) => {
      let parsedDetails: any = null;
      if (log.details) {
        try {
          parsedDetails = JSON.parse(log.details);
        } catch {
          parsedDetails = { raw: log.details };
        }
      }
      return {
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        userId: log.userId,
        userName: log.user?.name || parsedDetails?.actorEmail || "System",
        userEmail: log.user?.email || parsedDetails?.actorEmail || "system@rasasampoorna.com",
        userRole: log.user?.role || parsedDetails?.actorRole || "SYSTEM",
        details: parsedDetails,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      };
    });

    return {
      logs: formattedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const auditService = new AuditService();
