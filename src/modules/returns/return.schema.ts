import { z } from "zod";

export const requestReturnSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  orderItemId: z.string().min(1, "Order Item ID is required"),
  reason: z.string().min(5, "Reason must be at least 5 characters").max(500),
  evidenceUrl: z.string().url("Evidence URL must be a valid link").optional(),
});

export const reviewReturnSchema = z.object({
  returnId: z.string().min(1, "Return ID is required"),
  action: z.enum(["APPROVE", "REJECT"]),
  adminNotes: z.string().optional(),
});

export const markReturnReceivedSchema = z.object({
  returnId: z.string().min(1, "Return ID is required"),
  restock: z.boolean().default(true),
  notes: z.string().optional(),
});

export type RequestReturnInput = z.output<typeof requestReturnSchema>;
export type ReviewReturnInput = z.output<typeof reviewReturnSchema>;
export type MarkReturnReceivedInput = z.output<typeof markReturnReceivedSchema>;
