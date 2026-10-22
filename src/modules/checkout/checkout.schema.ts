import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const shippingAddressSchema = z.object({
  name: z.string().min(2, "Full name is required").trim(),
  phone: z
    .string()
    .min(10, "Valid phone number is required")
    .regex(/^(?:\+91|0)?[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number")
    .trim(),
  street: z.string().min(5, "Street address is required").trim(),
  landmark: z.string().optional(),
  city: z.string().min(2, "City is required").trim(),
  state: z.string().min(2, "State is required").trim(),
  postalCode: z.string().regex(/^\d{6}$/, "Must be a valid 6-digit Indian PIN code"),
  country: z.string().default("India"),
});

export const createOrderSchema = z.object({
  cartId: z.string().optional(),
  guestEmail: z.string().email("Valid email address is required").optional(),
  guestPhone: z.string().optional(),
  shippingAddress: shippingAddressSchema,
  deliveryOption: z.enum(["standard", "express"]).default("standard"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.RAZORPAY),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().optional(),
  couponCode: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  razorpayOrderId: z.string().min(1, "Razorpay Order ID is required"),
  razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
  razorpaySignature: z.string().min(1, "Razorpay Signature is required"),
});

export const releaseOrderReservationSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().optional(),
});

export type ShippingAddressInput = z.output<typeof shippingAddressSchema>;
export type CreateOrderInput = z.output<typeof createOrderSchema>;
export type VerifyPaymentInput = z.output<typeof verifyPaymentSchema>;
