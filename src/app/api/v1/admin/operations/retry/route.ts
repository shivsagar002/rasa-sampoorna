import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/security/guards";
import { operationsService } from "@/modules/operations/operations.service";
import { z } from "zod";

const retryRequestSchema = z.object({
  action: z.enum([
    "retry_webhook",
    "reconcile_payment",
    "cleanup_reservations",
    "retry_notification",
  ]),
  targetId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = retryRequestSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: { message: "Invalid retry request", issues: validated.error.issues } },
        { status: 400 }
      );
    }

    const { action, targetId } = validated.data;

    let session;
    let result: any;

    if (action === "retry_webhook") {
      session = await requirePermission(req, "operations:retry_webhooks");
      if (!targetId) {
        return NextResponse.json({ error: { message: "targetId (webhookEventId) is required." } }, { status: 400 });
      }
      result = await operationsService.retryWebhook(targetId, {
        userId: session.userId,
        email: session.email,
        role: session.role,
      });
    } else if (action === "reconcile_payment") {
      session = await requirePermission(req, "operations:reconcile_payments");
      if (!targetId) {
        return NextResponse.json({ error: { message: "targetId (orderId) is required." } }, { status: 400 });
      }
      result = await operationsService.reconcilePayment(targetId, {
        userId: session.userId,
        email: session.email,
        role: session.role,
      });
    } else if (action === "cleanup_reservations") {
      session = await requirePermission(req, "inventory:cleanup_reservations");
      result = await operationsService.cleanupExpiredStockReservations({
        userId: session.userId,
        email: session.email,
        role: session.role,
      });
    } else if (action === "retry_notification") {
      session = await requirePermission(req, "operations:retry_notifications");
      if (!targetId) {
        return NextResponse.json({ error: { message: "targetId (notificationId) is required." } }, { status: 400 });
      }
      result = await operationsService.retryNotification(targetId, {
        userId: session.userId,
        email: session.email,
        role: session.role,
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      { error: { message: err.message || "Operational recovery action failed." } },
      { status }
    );
  }
}
