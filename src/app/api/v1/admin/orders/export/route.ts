import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/security/guards";
import { handleApiError } from "@/lib/api/errors";
import { validateQuery } from "@/lib/validation/api-validator";
import { adminOrderService } from "@/modules/admin/admin-order.service";

const dateQuery = z.string().optional().refine(
  (value) => !value || !Number.isNaN(Date.parse(value)),
  "Date must be a valid ISO date."
);

const orderExportQuerySchema = z.object({
  status: z.union([z.nativeEnum(OrderStatus), z.literal("SHIPPED_DELIVERED")]).optional(),
  paymentStatus: z.union([z.nativeEnum(PaymentStatus), z.literal("AWAITING_PAYMENT")]).optional(),
  search: z.string().trim().max(200).optional(),
  startDate: dateQuery,
  endDate: dateQuery,
}).refine(
  ({ startDate, endDate }) => !startDate || !endDate || new Date(startDate) <= new Date(endDate),
  { message: "Start date must be on or before end date.", path: ["endDate"] }
);

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const filters = validateQuery(req, orderExportQuerySchema);
    const csv = await adminOrderService.exportOrdersCsv(filters);
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="rasa-orders-filtered.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
