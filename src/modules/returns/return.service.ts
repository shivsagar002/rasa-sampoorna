import { prisma } from "@/lib/db/prisma";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/api/errors";
import { RequestReturnInput, ReviewReturnInput } from "./return.schema";
import { OrderStatus, PaymentStatus, ReturnStatus, InventoryMovementType } from "@prisma/client";
import { razorpayClient } from "@/lib/integrations/razorpay";
import { shiprocketClient } from "@/lib/integrations/shiprocket";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { validateReturnStatusTransition } from "@/modules/orders/order-state";
import { logger } from "@/lib/observability/logger";
import { sendEmail } from "@/lib/email/email-service";
import { notificationService } from "@/modules/notifications/notification.service";

const RETURN_WINDOW_DAYS = 7;

export class ReturnService {
  /**
   * Check if an order item is eligible for customer return
   */
  async checkReturnEligibility(orderId: string, orderItemId: string, userId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        shipments: { orderBy: { deliveredAt: "desc" }, take: 1 },
      },
    });

    if (!order) throw new NotFoundError("Order");

    if (userId && order.userId && order.userId !== userId) {
      throw new ForbiddenError("Not authorized to view return eligibility for this order.");
    }

    const item = order.items.find((i) => i.id === orderItemId);
    if (!item) throw new NotFoundError("Order Item");

    // 1. Must be DELIVERED
    if (order.status !== OrderStatus.DELIVERED) {
      return {
        isEligible: false,
        reason: "Orders can only be returned once delivered.",
      };
    }

    // 2. Return window check (7 days from delivery or updatedAt)
    const deliveryDate = order.shipments[0]?.deliveredAt || order.updatedAt;
    const now = new Date();
    const daysSinceDelivery = Math.floor(
      (now.getTime() - deliveryDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      return {
        isEligible: false,
        reason: `Return window expired. Returns must be requested within ${RETURN_WINDOW_DAYS} days of delivery.`,
      };
    }

    // 3. Existing return check
    const existingReturn = await prisma.return.findFirst({
      where: { orderItemId },
    });

    if (existingReturn) {
      return {
        isEligible: false,
        reason: `A return request has already been submitted for this item (Status: ${existingReturn.status}).`,
      };
    }

    return {
      isEligible: true,
      maxRefundMinorUnits: item.subtotalMinorUnits,
      maxRefundRupees: item.subtotalMinorUnits / 100,
    };
  }

  /**
   * Submit return request
   */
  async requestReturn(input: RequestReturnInput, userId?: string) {
    const eligibility = await this.checkReturnEligibility(input.orderId, input.orderItemId, userId);
    if (!eligibility.isEligible) {
      throw new ValidationError(eligibility.reason || "This item is not eligible for return.");
    }

    const item = await prisma.orderItem.findUnique({
      where: { id: input.orderItemId },
      include: { order: true },
    });

    if (!item) throw new NotFoundError("Order Item");

    const returnRecord = await prisma.$transaction(async (tx) => {
      const rec = await tx.return.create({
        data: {
          orderId: input.orderId,
          orderItemId: input.orderItemId,
          reason: input.reason,
          refundAmountMinorUnits: item.subtotalMinorUnits,
          status: ReturnStatus.REQUESTED,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: userId || null,
          action: "RETURN_REQUESTED",
          entity: "Return",
          entityId: rec.id,
          details: JSON.stringify({
            orderNumber: item.order.orderNumber,
            productName: item.productName,
            reason: input.reason,
          }),
        },
      });

      return rec;
    });

    return returnRecord;
  }

  /**
   * Admin Review (Approve or Reject return)
   */
  async reviewReturn(input: ReviewReturnInput, adminUserId?: string) {
    const ret = await prisma.return.findUnique({
      where: { id: input.returnId },
      include: {
        order: { include: { shippingAddress: true, payments: true, user: true } },
        orderItem: true,
      },
    });

    if (!ret) throw new NotFoundError("Return Request");

    const targetStatus = input.action === "APPROVE" ? ReturnStatus.APPROVED : ReturnStatus.REJECTED;
    validateReturnStatusTransition(ret.status, targetStatus);

    if (input.action === "REJECT") {
      const updated = await prisma.$transaction(async (tx) => {
        const r = await tx.return.update({
          where: { id: ret.id },
          data: {
            status: ReturnStatus.REJECTED,
            processedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: adminUserId || null,
            action: "RETURN_REJECTED",
            entity: "Return",
            entityId: ret.id,
            details: JSON.stringify({ reason: input.adminNotes }),
          },
        });

        return r;
      });

      const customerEmail = ret.order.user?.email || ret.order.guestEmail;
      if (customerEmail) {
        notificationService
          .notifyReturnStatus({
            recipient: customerEmail,
            customerName: ret.order.shippingAddress?.name || "Patron",
            orderNumber: ret.order.orderNumber,
            returnStatus: "REJECTED",
            instructions: `Your return request could not be approved. Reason: ${input.adminNotes || "Item not eligible under store return policy."}`,
            userId: ret.order.userId || undefined,
          })
          .catch((e) => logger.warn("[ReturnRejectedNotificationFailed]", { error: e }));
      }

      return { ...updated, reverseAwb: undefined };
    }

    // Approve path: create reverse pickup and mark APPROVED
    const address = ret.order.shippingAddress;
    let reverseAwb = "";

    if (address) {
      try {
        const reverseRes = await shiprocketClient.createReversePickup({
          shiprocketOrderId: ret.order.orderNumber,
          orderNumber: ret.order.orderNumber,
          customerName: address.name,
          customerPhone: address.phone,
          pickupAddress: {
            street: address.street,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
          },
          reason: ret.reason,
        });
        reverseAwb = reverseRes.reverseAwb;
      } catch (err) {
        logger.warn("[ReversePickupInitWarning]", { err });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.return.update({
        where: { id: ret.id },
        data: {
          status: ReturnStatus.APPROVED,
          processedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId || null,
          action: "RETURN_APPROVED",
          entity: "Return",
          entityId: ret.id,
          details: JSON.stringify({
            reverseAwb,
            notes: input.adminNotes,
          }),
        },
      });

      return r;
    });

    const customerEmail = ret.order.user?.email || ret.order.guestEmail;
    if (customerEmail) {
      notificationService
        .notifyReturnStatus({
          recipient: customerEmail,
          customerName: ret.order.shippingAddress?.name || "Patron",
          orderNumber: ret.order.orderNumber,
          returnStatus: "APPROVED",
          reverseAwb: reverseAwb || undefined,
          instructions: "A courier representative will arrive to collect the package. Please ensure items are neatly packed with original tags intact.",
          userId: ret.order.userId || undefined,
        })
        .catch((e) => logger.warn("[ReturnApprovedNotificationFailed]", { error: e }));
    }

    return { ...updated, reverseAwb };
  }

  /**
   * Process refund once return is physically received at warehouse
   */
  async processReturnRefund(returnId: string, restock = true, adminUserId?: string) {
    const ret = await prisma.return.findUnique({
      where: { id: returnId },
      include: {
        order: { include: { payments: true, user: true, shippingAddress: true } },
        orderItem: true,
      },
    });

    if (!ret) throw new NotFoundError("Return Request");
    if (ret.status !== ReturnStatus.APPROVED && ret.status !== ReturnStatus.ITEM_RECEIVED) {
      throw new ValidationError(`Cannot refund return with status "${ret.status}". Must be APPROVED or ITEM_RECEIVED.`);
    }

    const refundAmountMinorUnits = ret.refundAmountMinorUnits || ret.orderItem.subtotalMinorUnits;
    const payment = ret.order.payments.find((p) => p.status === PaymentStatus.CAPTURED);

    let refundGatewayId = `rfnd_mock_${Date.now()}`;

    // Initiate Gateway Refund with Razorpay
    if (payment && payment.paymentProvider === "RAZORPAY") {
      const rzpRefund = await razorpayClient.initiateRefund({
        paymentId: payment.transactionId,
        amountMinorUnits: refundAmountMinorUnits,
        reason: `Return refund for order ${ret.order.orderNumber}: ${ret.orderItem.productName}`,
      });
      refundGatewayId = rzpRefund.id;
    }

    // Complete transaction
    const finalized = await prisma.$transaction(async (tx) => {
      // 1. Record Refund
      await tx.refund.create({
        data: {
          orderId: ret.orderId,
          paymentId: payment?.id || null,
          refundId: refundGatewayId,
          amountMinorUnits: refundAmountMinorUnits,
          currency: ret.order.currency,
          reason: ret.reason,
          status: "PROCESSED",
        },
      });

      // 2. Update Return
      const updatedReturn = await tx.return.update({
        where: { id: returnId },
        data: {
          status: ReturnStatus.REFUNDED,
          processedAt: new Date(),
        },
      });

      // 3. Update Order and Payment status
      await tx.order.update({
        where: { id: ret.orderId },
        data: {
          status: OrderStatus.REFUNDED,
          paymentStatus: PaymentStatus.REFUNDED,
        },
      });

      if (payment) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.REFUNDED },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminUserId || null,
          action: "RETURN_REFUND_PROCESSED",
          entity: "Return",
          entityId: returnId,
          details: JSON.stringify({
            refundGatewayId,
            refundAmountMinorUnits,
            restocked: restock,
          }),
        },
      });

      return updatedReturn;
    });

    // 5. Restock inventory if requested
    if (restock && ret.orderItem.variantId) {
      await inventoryService.adjustStock({
        variantId: ret.orderItem.variantId,
        quantityDelta: ret.orderItem.quantity,
        type: InventoryMovementType.RESTOCK,
        reason: `Restocked from customer return (Order #${ret.order.orderNumber})`,
        reference: ret.order.orderNumber,
      });
    }

    // Customer email alert via notificationService
    const customerEmail = ret.order.user?.email || ret.order.guestEmail;
    if (customerEmail) {
      notificationService
        .notifyRefundProcessed({
          recipient: customerEmail,
          customerName: ret.order.shippingAddress?.name || "Patron",
          orderNumber: ret.order.orderNumber,
          refundId: refundGatewayId,
          amountRupees: refundAmountMinorUnits / 100,
          userId: ret.order.userId || undefined,
        })
        .catch((e) => logger.warn("[RefundNotificationFailed]", { error: e }));
    }

    return finalized;
  }
}

export const returnService = new ReturnService();
