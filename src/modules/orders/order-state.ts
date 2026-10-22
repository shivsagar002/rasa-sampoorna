import { OrderStatus, PaymentStatus, ShipmentStatus, ReturnStatus } from "@prisma/client";
import { ValidationError } from "@/lib/api/errors";

/**
 * Valid state transitions for the core Order lifecycle
 */
export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.PARTIALLY_REFUNDED]: [OrderStatus.REFUNDED],
};

/**
 * Valid state transitions for the Payment lifecycle
 */
export const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED, PaymentStatus.FAILED],
  [PaymentStatus.AUTHORIZED]: [PaymentStatus.CAPTURED, PaymentStatus.FAILED],
  [PaymentStatus.CAPTURED]: [PaymentStatus.REFUNDED],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.REFUNDED]: [],
};

/**
 * Valid state transitions for the Logistics/Shipment lifecycle
 */
export const ALLOWED_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.LABEL_CREATED]: [ShipmentStatus.PICKED_UP],
  [ShipmentStatus.PICKED_UP]: [ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT]: [
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.DELIVERED,
    ShipmentStatus.RTO_INITIATED,
  ],
  [ShipmentStatus.OUT_FOR_DELIVERY]: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.RTO_INITIATED,
  ],
  [ShipmentStatus.RTO_INITIATED]: [
    ShipmentStatus.RTO_DELIVERED,
  ],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.RTO_DELIVERED]: [],
};

/**
 * Strict hierarchy rank for shipments to prevent stale out-of-order webhook events
 * from reversing newer valid delivery states
 */
export const SHIPMENT_STATUS_RANK: Record<ShipmentStatus, number> = {
  [ShipmentStatus.LABEL_CREATED]: 1,
  [ShipmentStatus.PICKED_UP]: 2,
  [ShipmentStatus.IN_TRANSIT]: 3,
  [ShipmentStatus.OUT_FOR_DELIVERY]: 4,
  [ShipmentStatus.RTO_INITIATED]: 5,
  [ShipmentStatus.RTO_DELIVERED]: 6,
  [ShipmentStatus.DELIVERED]: 7,
};

/**
 * Valid state transitions for Returns
 */
export const ALLOWED_RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  [ReturnStatus.REQUESTED]: [ReturnStatus.APPROVED, ReturnStatus.REJECTED],
  [ReturnStatus.APPROVED]: [ReturnStatus.ITEM_RECEIVED, ReturnStatus.REFUNDED],
  [ReturnStatus.ITEM_RECEIVED]: [ReturnStatus.REFUNDED],
  [ReturnStatus.REJECTED]: [],
  [ReturnStatus.REFUNDED]: [],
};

/**
 * Validate and assert order status transition
 */
export function validateOrderStatusTransition(current: OrderStatus, target: OrderStatus) {
  if (current === target) return;
  const allowed = ALLOWED_ORDER_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) {
    throw new ValidationError(
      `Invalid order status transition from "${current}" to "${target}".`
    );
  }
}

/**
 * Validate and assert payment status transition
 */
export function validatePaymentStatusTransition(current: PaymentStatus, target: PaymentStatus) {
  if (current === target) return;
  const allowed = ALLOWED_PAYMENT_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) {
    throw new ValidationError(
      `Invalid payment status transition from "${current}" to "${target}".`
    );
  }
}

/**
 * Check if incoming shipment status is newer than the current status (prevents out-of-order webhook race conditions)
 */
export function isNewerShipmentStatus(current: ShipmentStatus, incoming: ShipmentStatus): boolean {
  if (current === incoming) return false;
  // Never reverse delivered state
  if (current === ShipmentStatus.DELIVERED) return false;
  const currentRank = SHIPMENT_STATUS_RANK[current] ?? 0;
  const incomingRank = SHIPMENT_STATUS_RANK[incoming] ?? 0;
  return incomingRank >= currentRank;
}

/**
 * Validate return status transition
 */
export function validateReturnStatusTransition(current: ReturnStatus, target: ReturnStatus) {
  if (current === target) return;
  const allowed = ALLOWED_RETURN_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) {
    throw new ValidationError(
      `Invalid return status transition from "${current}" to "${target}".`
    );
  }
}
