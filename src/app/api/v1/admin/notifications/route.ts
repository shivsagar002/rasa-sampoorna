import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { validateQuery, validateBody } from "@/lib/validation/api-validator";
import { prisma } from "@/lib/db/prisma";
import { notificationService } from "@/modules/notifications/notification.service";
import { apiPaginated, apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { z } from "zod";
import { NotificationStatus } from "@prisma/client";

const adminNotificationsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.nativeEnum(NotificationStatus).optional(),
  recipient: z.string().optional(),
});

const adminRetrySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);
    const query = validateQuery(req, adminNotificationsQuerySchema);

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.recipient) {
      where.recipient = { contains: query.recipient };
    }

    const total = await prisma.notification.count({ where });
    const records = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Parse outbox body envelopes safely
    const formatted = records.map((record) => {
      let eventType = "UNKNOWN";
      let attempts = 1;
      let error = null;

      try {
        const parsed = JSON.parse(record.body);
        eventType = parsed.eventType || eventType;
        attempts = parsed.attempts || attempts;
        error = parsed.error || null;
      } catch {
        // Raw body fallback
      }

      return {
        id: record.id,
        recipient: record.recipient,
        channel: record.channel,
        subject: record.subject,
        status: record.status,
        sentAt: record.sentAt,
        createdAt: record.createdAt,
        user: record.user,
        eventType,
        attempts,
        error,
      };
    });

    const providerStatus = notificationService.getProviderStatus();

    const totalPages = Math.ceil(total / query.limit);

    return apiSuccess({
      items: formatted,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPrevPage: query.page > 1,
      },
      provider: providerStatus,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff(req);
    const body = await validateBody(req, adminRetrySchema);

    const result = await notificationService.retryFailedNotifications(body.limit);

    return apiSuccess(
      result,
      `Retried failed notifications: ${result.succeeded} sent, ${result.failed} failed`
    );
  } catch (error) {
    return handleApiError(error);
  }
}
