import { prisma } from "@/lib/db/prisma";
import { BadRequestError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { OrderStatus, PaymentStatus, Prisma, ShipmentStatus } from "@prisma/client";
import { shiprocketClient } from "@/lib/integrations/shiprocket";
import { razorpayClient } from "@/lib/integrations/razorpay";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { validateOrderStatusTransition } from "@/modules/orders/order-state";
import { logger } from "@/lib/observability/logger";

export interface AdminOrderFilterParams {
  status?: OrderStatus | "SHIPPED_DELIVERED";
  paymentStatus?: PaymentStatus | "AWAITING_PAYMENT";
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class AdminOrderService {
  async getOrderSummary() {
    const [statusGroups, paymentGroups] = await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.order.groupBy({
        by: ["paymentStatus"],
        _count: { id: true },
      }),
    ]);

    const statusCounts = new Map(statusGroups.map((group) => [group.status, group._count.id]));
    const paymentCounts = new Map(paymentGroups.map((group) => [group.paymentStatus, group._count.id]));
    const total = statusGroups.reduce((sum, group) => sum + group._count.id, 0);

    return {
      total,
      pendingPayments:
        (paymentCounts.get(PaymentStatus.PENDING) || 0) +
        (paymentCounts.get(PaymentStatus.AUTHORIZED) || 0),
      processing: statusCounts.get(OrderStatus.PROCESSING) || 0,
      shippedDelivered:
        (statusCounts.get(OrderStatus.SHIPPED) || 0) +
        (statusCounts.get(OrderStatus.OUT_FOR_DELIVERY) || 0) +
        (statusCounts.get(OrderStatus.DELIVERED) || 0),
    };
  }

  async bulkUpdateStatus(orderIds: string[], targetStatus: OrderStatus, adminUserId: string) {
    if (targetStatus !== OrderStatus.CONFIRMED && targetStatus !== OrderStatus.PROCESSING) {
      throw new BadRequestError("Bulk updates are limited to confirming or processing paid orders.");
    }

    return prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, status: true, paymentStatus: true },
      });

      if (orders.length !== orderIds.length) {
        throw new NotFoundError("One or more selected orders");
      }

      for (const order of orders) {
        if (order.paymentStatus !== PaymentStatus.CAPTURED) {
          throw new ValidationError("Only orders with captured payment can be bulk updated.");
        }
        validateOrderStatusTransition(order.status, targetStatus);
      }

      for (const order of orders) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: targetStatus },
        });
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: "ORDER_STATUS_UPDATED",
            entity: "Order",
            entityId: order.id,
            details: JSON.stringify({
              previousStatus: order.status,
              targetStatus,
              source: "bulk_admin_action",
            }),
          },
        });
      }

      return { updatedCount: orders.length };
    });
  }

  private buildOrderWhere(params: AdminOrderFilterParams): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};
    if (params.status) {
      where.status =
        params.status === "SHIPPED_DELIVERED"
          ? {
              in: [OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
            }
          : params.status;
    }

    if (params.paymentStatus) {
      where.paymentStatus =
        params.paymentStatus === "AWAITING_PAYMENT"
          ? { in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED] }
          : params.paymentStatus;
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { guestEmail: { contains: q, mode: "insensitive" } },
        { guestPhone: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { shippingAddress: { name: { contains: q, mode: "insensitive" } } },
        { shippingAddress: { phone: { contains: q, mode: "insensitive" } } },
        { razorpayPaymentId: { contains: q, mode: "insensitive" } },
        {
          shipments: {
            some: {
              OR: [
                { trackingNumber: { contains: q, mode: "insensitive" } },
                { awbCode: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    return where;
  }

  /**
   * Search and filter all orders with pagination
   */
  async listOrders(params: AdminOrderFilterParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 15));
    const skip = (page - 1) * limit;

    const where = this.buildOrderWhere(params);

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          shippingAddress: true,
          items: true,
          shipments: { take: 1, orderBy: { createdAt: "desc" } },
          payments: { take: 1, orderBy: { createdAt: "desc" } },
          returns: true,
        },
      }),
    ]);

    const now = new Date();
    return {
      items: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        totalAmount: o.totalAmountMinorUnits / 100,
        subtotal: o.subtotalMinorUnits / 100,
        shippingFee: o.shippingFeeMinorUnits / 100,
        itemCount: o.items.reduce((acc, i) => acc + i.quantity, 0),
        customer: {
          name: o.shippingAddress?.name || o.user?.name || "Guest",
          email: o.user?.email || o.guestEmail || "",
          phone: o.shippingAddress?.phone || o.guestPhone || o.user?.phone || "",
        },
        shipment: o.shipments[0]
          ? {
              status: o.shipments[0].status,
              courier: o.shipments[0].carrier,
              trackingNumber: o.shipments[0].trackingNumber || o.shipments[0].awbCode,
              trackingUrl: o.shipments[0].trackingUrl,
              estimatedDeliveryAt: o.shipments[0].estimatedDeliveryAt,
              isDelayed: Boolean(
                o.shipments[0].estimatedDeliveryAt &&
                o.shipments[0].estimatedDeliveryAt < now &&
                o.shipments[0].status !== ShipmentStatus.DELIVERED &&
                o.shipments[0].status !== ShipmentStatus.RTO_DELIVERED
              ),
            }
          : null,
        hasReturns: o.returns.length > 0,
        returnCount: o.returns.length,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async exportOrdersCsv(params: AdminOrderFilterParams) {
    const orders = await prisma.order.findMany({
      where: this.buildOrderWhere(params),
      orderBy: { createdAt: "desc" },
      take: 5001,
      select: {
        orderNumber: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        subtotalMinorUnits: true,
        discountAmountMinorUnits: true,
        taxAmountMinorUnits: true,
        shippingFeeMinorUnits: true,
        totalAmountMinorUnits: true,
        _count: { select: { items: true } },
        shipments: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            carrier: true,
            trackingNumber: true,
            awbCode: true,
            estimatedDeliveryAt: true,
          },
        },
      },
    });

    if (orders.length > 5000) {
      throw new BadRequestError("The filtered export exceeds 5,000 orders. Narrow the search or date range and try again.");
    }

    const csvCell = (value: string | number) => {
      const text = String(value);
      const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };
    const header = [
      "Order Number",
      "Created At",
      "Status",
      "Payment Status",
      "Payment Method",
      "Line Item Count",
      "Subtotal (INR)",
      "Discount (INR)",
      "GST (INR)",
      "Shipping (INR)",
      "Total (INR)",
      "Courier",
      "Tracking ID",
      "Estimated Delivery",
    ];
    const rows = orders.map((order) => {
      const shipment = order.shipments[0];
      return [
        order.orderNumber,
        order.createdAt.toISOString(),
        order.status,
        order.paymentStatus,
        order.paymentMethod,
        order._count.items,
        (order.subtotalMinorUnits / 100).toFixed(2),
        (order.discountAmountMinorUnits / 100).toFixed(2),
        (order.taxAmountMinorUnits / 100).toFixed(2),
        (order.shippingFeeMinorUnits / 100).toFixed(2),
        (order.totalAmountMinorUnits / 100).toFixed(2),
        shipment?.carrier || "",
        shipment?.trackingNumber || shipment?.awbCode || "",
        shipment?.estimatedDeliveryAt?.toISOString() || "",
      ];
    });

    return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  }

  /**
   * Detailed order inspection with audit logs and complete item snapshots
   */
  async getOrderDetails(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        shippingAddress: true,
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        payments: { orderBy: { createdAt: "desc" } },
        refunds: { orderBy: { createdAt: "desc" } },
        shipments: {
          include: {
            trackingEvents: { orderBy: { timestamp: "desc" } },
          },
          orderBy: { createdAt: "desc" },
        },
        returns: {
          include: { orderItem: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) throw new NotFoundError("Order");

    const auditLogs = await prisma.auditLog.findMany({
      where: { entity: "Order", entityId: order.id },
      orderBy: { createdAt: "desc" },
    });

    return {
      ...order,
      auditLogs,
      totalAmount: order.totalAmountMinorUnits / 100,
      subtotal: order.subtotalMinorUnits / 100,
      shippingFee: order.shippingFeeMinorUnits / 100,
      discountAmount: order.discountAmountMinorUnits / 100,
      taxAmount: order.taxAmountMinorUnits / 100,
      items: order.items.map((i) => ({
        ...i,
        unitPrice: i.unitPriceMinorUnits / 100,
        subtotal: i.subtotalMinorUnits / 100,
        currentStock: i.variant?.stockQuantity ?? 0,
      })),
    };
  }

  /**
   * Update order status with transition validation and audit logging
   */
  async updateStatus(orderId: string, targetStatus: OrderStatus, adminUserId?: string, notes?: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order");

    validateOrderStatusTransition(order.status, targetStatus);

    const updated = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: orderId },
        data: {
          status: targetStatus,
          notes: notes ? `${order.notes ? order.notes + "\n" : ""}[Admin] ${notes}` : order.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId || null,
          action: "ORDER_STATUS_UPDATED",
          entity: "Order",
          entityId: orderId,
          details: JSON.stringify({
            previousStatus: order.status,
            targetStatus,
            notes,
          }),
        },
      });

      return ord;
    });

    return updated;
  }

  /**
   * Create shipment on Shiprocket and mark order as SHIPPED
   */
  async createShipment(orderId: string, adminUserId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shippingAddress: true,
        items: true,
        user: true,
        shipments: true,
      },
    });

    if (!order) throw new NotFoundError("Order");
    if (!order.shippingAddress) {
      throw new ValidationError("Cannot fulfill order without a valid shipping address.");
    }

    if (
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.PROCESSING
    ) {
      throw new ValidationError(
        `Cannot ship order with status "${order.status}". Order must be CONFIRMED or PROCESSING.`
      );
    }

    // Call Shiprocket integration OUTSIDE database transaction
    const shipResult = await shiprocketClient.createShipment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      customerName: order.shippingAddress.name,
      customerEmail: order.user?.email || order.guestEmail || "patron@rasasampoorna.com",
      customerPhone: order.shippingAddress.phone,
      shippingAddress: {
        street: order.shippingAddress.street,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country || "India",
      },
      items: order.items.map((i) => ({
        name: i.productName,
        sku: i.sku || "RASA-SAREE-STD",
        units: i.quantity,
        selling_price: i.unitPriceMinorUnits / 100,
      })),
      subtotal: order.subtotalMinorUnits / 100,
    });

    // Record shipment and update order inside database transaction
    const saved = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          orderId: order.id,
          carrier: shipResult.courierName || "SHIPROCKET",
          awbCode: shipResult.awbCode,
          trackingNumber: shipResult.awbCode,
          trackingUrl: shipResult.trackingUrl,
          status: ShipmentStatus.LABEL_CREATED,
        },
      });

      // Initial tracking event
      await tx.trackingEvent.create({
        data: {
          shipmentId: shipment.id,
          status: ShipmentStatus.LABEL_CREATED,
          activity: `Shipment booked with ${shipResult.courierName}. AWB: ${shipResult.awbCode}`,
          location: "Bengaluru Central Artisan Warehouse",
          timestamp: new Date(),
        },
      });

      // Update order to SHIPPED
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.SHIPPED,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId || null,
          action: "SHIPMENT_CREATED",
          entity: "Shipment",
          entityId: shipment.id,
          details: JSON.stringify({
            orderNumber: order.orderNumber,
            awbCode: shipResult.awbCode,
            courier: shipResult.courierName,
            isMock: shipResult.isMock,
          }),
        },
      });

      return { shipment, order: updatedOrder };
    });

    return saved;
  }

  /**
   * Cancel order by admin with optional automated refund
   */
  async cancelOrder(orderId: string, reason: string, adminUserId?: string, issueRefund = true) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true, items: true },
    });

    if (!order) throw new NotFoundError("Order");
    validateOrderStatusTransition(order.status, OrderStatus.CANCELLED);

    const capturedPayment = order.payments.find((p) => p.status === PaymentStatus.CAPTURED);
    let refundGatewayId = null;

    if (capturedPayment && issueRefund && capturedPayment.paymentProvider === "RAZORPAY") {
      try {
        const rzpRefund = await razorpayClient.initiateRefund({
          paymentId: capturedPayment.transactionId,
          amountMinorUnits: order.totalAmountMinorUnits,
          reason: `Admin cancellation: ${reason}`,
        });
        refundGatewayId = rzpRefund.id;
      } catch (err) {
        logger.error("[AdminCancelRefundFailed]", { err });
      }
    }

    // Release reserved inventory
    await inventoryService.releaseReservation(order.orderNumber);

    const cancelledOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: capturedPayment && issueRefund ? PaymentStatus.REFUNDED : order.paymentStatus,
          notes: `${order.notes ? order.notes + "\n" : ""}[Admin Cancelled]: ${reason}`,
        },
      });

      if (capturedPayment && refundGatewayId) {
        await tx.refund.create({
          data: {
            orderId,
            paymentId: capturedPayment.id,
            refundId: refundGatewayId,
            amountMinorUnits: order.totalAmountMinorUnits,
            currency: order.currency,
            reason: `Admin cancellation: ${reason}`,
            status: "PROCESSED",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId || null,
          action: "ORDER_CANCELLED_BY_ADMIN",
          entity: "Order",
          entityId: orderId,
          details: JSON.stringify({ reason, refundGatewayId }),
        },
      });

      return ord;
    });

    return cancelledOrder;
  }

  /**
   * Append internal note to order
   */
  async addNote(orderId: string, note: string, adminUserId?: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order");

    const newNotes = `${order.notes ? order.notes + "\n" : ""}[${new Date().toISOString()}] ${note}`;

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { notes: newNotes },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId || null,
        action: "ORDER_NOTE_ADDED",
        entity: "Order",
        entityId: orderId,
        details: JSON.stringify({ note }),
      },
    });

    return updated;
  }
}

export const adminOrderService = new AdminOrderService();
