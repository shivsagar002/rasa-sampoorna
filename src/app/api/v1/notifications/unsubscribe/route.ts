import { NextRequest, NextResponse } from "next/server";
import { validateBody, validateQuery } from "@/lib/validation/api-validator";
import { unsubscribeInputSchema } from "@/modules/notifications/notification.schema";
import { notificationService } from "@/modules/notifications/notification.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, ValidationError } from "@/lib/api/errors";
import { z } from "zod";

const unsubscribeQuerySchema = z.object({
  email: z.string().email("Valid email required"),
  category: z.enum(["ALL_MARKETING", "BACK_IN_STOCK", "ABANDONED_CART", "SPECIAL_OFFERS"]).optional().default("ALL_MARKETING"),
  token: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const query = validateQuery(req, unsubscribeQuerySchema);
    const result = await notificationService.unsubscribe({
      email: query.email,
      category: query.category,
      token: query.token,
    });

    const acceptsHtml = req.headers.get("accept")?.includes("text/html");

    if (acceptsHtml) {
      // Branded confirmation page matching RASA Sampoorna aesthetic
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Unsubscribe Confirmation — RASA Sampoorna</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 48px 16px; background-color: #f7f4ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #2c2621; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
    .card { max-width: 520px; width: 100%; background: #ffffff; border: 1px solid #e8dfd5; border-radius: 12px; padding: 40px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); text-align: center; }
    .brand { font-family: Georgia, serif; font-size: 24px; color: #2c2621; letter-spacing: 0.08em; font-weight: 600; margin-bottom: 24px; display: inline-block; }
    h1 { font-family: Georgia, serif; font-size: 24px; margin: 0 0 12px 0; color: #2c2621; font-weight: 600; }
    p { font-size: 14px; line-height: 1.6; color: #5a4e42; margin: 0 0 24px 0; }
    .btn { display: inline-block; padding: 12px 28px; background-color: #2e3830; color: #f7f4ee; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; }
    .notice { font-size: 12px; color: #8c7d70; line-height: 1.5; border-top: 1px solid #f2ebe3; padding-top: 16px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">RASA SAMPOORNA</div>
    <h1>Subscription Updated</h1>
    <p>
      Your email (<strong>${query.email}</strong>) has been unsubscribed from promotional announcements and marketing notifications.
    </p>
    <a href="/" class="btn">Return to Storefront</a>
    <div class="notice">
      Please note: Essential transactional messages concerning orders, payments, shipments, and account security will continue to be sent.
    </div>
  </div>
</body>
</html>`;
      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return apiSuccess(result, "Unsubscribed successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = await validateBody(req, unsubscribeInputSchema);
    const result = await notificationService.unsubscribe(input);
    return apiSuccess(result, "Unsubscribed successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
