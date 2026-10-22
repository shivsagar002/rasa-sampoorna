import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { shiprocketClient } from "@/lib/integrations/shiprocket";
import { isNewerShipmentStatus } from "@/modules/orders/order-state";
import { logger } from "@/lib/observability/logger";
import { OrderStatus, ShipmentStatus, WebhookEventStatus } from "@prisma/client";

function mapShiprocketStatusToEnum(rawStatus: string): ShipmentStatus {
  const s = rawStatus.toUpperCase();
  if (s.includes("DELIVERED") && !s.includes("RTO")) return ShipmentStatus.DELIVERED;
  if (s.includes("RTO") && (s.includes("DELIVERED") || s.includes("COMPLETED"))) return ShipmentStatus.RTO_DELIVERED;
  if (s.includes("RTO") || s.includes("RETURNED") || s.includes("UNDELIVERED") || s.includes("FAILED")) return ShipmentStatus.RTO_INITIATED;
  if (s.includes("OUT FOR DELIVERY")) return ShipmentStatus.OUT_FOR_DELIVERY;
  if (s.includes("PICKED UP") || s.includes("PICKUP DONE")) return ShipmentStatus.PICKED_UP;
  return ShipmentStatus.IN_TRANSIT;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("x-api-key") || req.headers.get("x-shiprocket-token");
    if (!shiprocketClient.verifyWebhookAuthenticity(authHeader)) {
      logger.warn("[ShiprocketWebhook] Unauthorized webhook request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    const awb = payload.awb || payload.awb_code || payload.tracking_number;
    const currentStatusRaw = payload.current_status || payload.status || "IN_TRANSIT";
    const location = payload.location || payload.scans?.[0]?.location || "Transit Hub";
    const activity = payload.activity || payload.scans?.[0]?.activity || currentStatusRaw;
    const eventId = payload.event_id || `sr_evt_${awb}_${currentStatusRaw}_${Date.now()}`;

    // 1. Idempotency Check
    const existing = await prisma.webhookEvent.findUnique({
      where: { idempotencyKey: eventId },
    });

    if (existing && existing.status === WebhookEventStatus.PROCESSED) {
      return NextResponse.json({ status: "already_processed" });
    }

    await prisma.webhookEvent.upsert({
      where: { idempotencyKey: eventId },
      create: {
        provider: "SHIPROCKET",
        eventType: "tracking_update",
        idempotencyKey: eventId,
        payload: rawBody,
        status: WebhookEventStatus.PENDING,
      },
      update: {},
    });

    if (!awb) {
      return NextResponse.json({ error: "Missing AWB code" }, { status: 400 });
    }

    // 2. Find shipment by tracking number
    const shipment = await prisma.shipment.findFirst({
      where: { trackingNumber: awb },
      include: { order: true },
    });

    if (!shipment) {
      logger.warn("[ShiprocketWebhook] Shipment not found for AWB", { awb });
      return NextResponse.json({ status: "shipment_not_found" });
    }

    const mappedStatus = mapShiprocketStatusToEnum(currentStatusRaw);

    // 3. Stale event check: Prevent out-of-order events from reverting newer status
    const shouldUpdateShipmentStatus = isNewerShipmentStatus(shipment.status, mappedStatus);

    await prisma.$transaction(async (tx) => {
      // Record tracking event
      await tx.trackingEvent.create({
        data: {
          shipmentId: shipment.id,
          status: mappedStatus,
          location,
          activity: activity,
          timestamp: payload.scan_time ? new Date(payload.scan_time) : new Date(),
        },
      });

      if (shouldUpdateShipmentStatus) {
        await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: mappedStatus,
            deliveredAt: mappedStatus === ShipmentStatus.DELIVERED ? new Date() : undefined,
          },
        });

        // If order delivered, update order state to DELIVERED
        if (mappedStatus === ShipmentStatus.DELIVERED && shipment.order.status !== OrderStatus.DELIVERED) {
          await tx.order.update({
            where: { id: shipment.orderId },
            data: { status: OrderStatus.DELIVERED },
          });

          await tx.auditLog.create({
            data: {
              action: "ORDER_DELIVERED_VIA_WEBHOOK",
              entity: "Order",
              entityId: shipment.orderId,
              details: JSON.stringify({ awb, deliveredAt: new Date() }),
            },
          });
        }
      }
    });

    // 4. Mark webhook event as processed
    await prisma.webhookEvent.update({
      where: { idempotencyKey: eventId },
      data: {
        status: WebhookEventStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("[ShiprocketWebhookError]", { error });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
