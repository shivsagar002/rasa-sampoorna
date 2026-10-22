import { z } from "zod";
import { AddressType } from "@prisma/client";

export const addressSchema = z.object({
  name: z.string().min(2, "Full name is required").trim(),
  phone: z
    .string()
    .regex(/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/, "Please enter a valid 10-digit Indian phone number")
    .trim(),
  street: z.string().min(5, "Street address must be at least 5 characters").trim(),
  landmark: z.string().trim().optional().or(z.literal("")),
  city: z.string().min(2, "City is required").trim(),
  state: z.string().min(2, "State is required").trim(),
  postalCode: z.string().regex(/^\d{6}$/, "Please enter a valid 6-digit Indian PIN code").trim(),
  country: z.string().default("India"),
  type: z.nativeEnum(AddressType).default(AddressType.SHIPPING),
  isDefault: z.boolean().default(false),
  deliveryInstructions: z.string().max(300, "Delivery instructions must be under 300 characters").optional().or(z.literal("")),
});

export const updateAddressSchema = addressSchema.partial();

export type AddressInput = z.output<typeof addressSchema>;
export type UpdateAddressInput = z.output<typeof updateAddressSchema>;
