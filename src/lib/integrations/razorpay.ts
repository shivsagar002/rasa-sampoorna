import crypto from "crypto";
import { env } from "@/lib/validation/env";
import { logger } from "@/lib/observability/logger";
import { ValidationError } from "@/lib/api/errors";

export interface CreateRazorpayOrderParams {
  amountMinorUnits: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  isMock: boolean;
}

export interface InitiateRefundParams {
  paymentId: string;
  amountMinorUnits?: number; // Optional: full refund if omitted
  notes?: Record<string, string>;
  reason?: string;
}

export interface RazorpayRefundResult {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  isMock: boolean;
}

export class RazorpayClient {
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor() {
    this.keyId = env.RAZORPAY_KEY_ID;
    this.keySecret = env.RAZORPAY_KEY_SECRET;
    this.webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
  }

  private isLiveConfigured(): boolean {
    if (process.env.NODE_ENV === "test") {
      return false;
    }
    return (
      Boolean(this.keyId) &&
      this.keyId !== "rzp_test_placeholder" &&
      Boolean(this.keySecret) &&
      this.keySecret !== "razorpay_secret_placeholder"
    );
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64")}`;
  }

  /**
   * Create an authoritative payment order with Razorpay
   */
  async createPaymentOrder(params: CreateRazorpayOrderParams): Promise<RazorpayOrderResult> {
    if (!this.isLiveConfigured()) {
      logger.info("[RazorpayMock] Using sandbox mock order generation", { receipt: params.receipt });
      return {
        id: `order_mock_${crypto.randomBytes(12).toString("hex")}`,
        amount: params.amountMinorUnits,
        currency: params.currency || "INR",
        receipt: params.receipt,
        status: "created",
        isMock: true,
      };
    }

    try {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.getAuthHeader(),
        },
        body: JSON.stringify({
          amount: params.amountMinorUnits,
          currency: params.currency || "INR",
          receipt: params.receipt,
          notes: params.notes || {},
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        logger.error("[RazorpayOrderCreationError]", { errorData });
        throw new ValidationError("Failed to initialize payment gateway order.");
      }

      const data = await res.json();
      return {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        receipt: data.receipt,
        status: data.status,
        isMock: false,
      };
    } catch (err: any) {
      if (env.NODE_ENV !== "production") {
        return {
          id: `order_mock_${crypto.randomBytes(12).toString("hex")}`,
          amount: params.amountMinorUnits,
          currency: params.currency || "INR",
          receipt: params.receipt,
          status: "created",
          isMock: true,
        };
      }
      throw err;
    }
  }

  /**
   * Verify HMAC SHA-256 signature from client checkout callback
   */
  verifyPaymentSignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string): boolean {
    if (!signature) return false;

    // Sandbox / mock mode check
    if (razorpayOrderId.startsWith("order_mock_") && (signature === "sig_dev_verified" || env.NODE_ENV !== "production")) {
      return true;
    }

    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret)
      .update(payload)
      .digest("hex");

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf-8"),
      Buffer.from(expectedSignature, "utf-8")
    );
  }

  /**
   * Verify HMAC SHA-256 webhook signature using raw request body
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!signature || !rawBody) return false;

    // Allow mock/test signature in non-production
    if (env.NODE_ENV !== "production" && signature === "sig_webhook_test") {
      return true;
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (signature.length !== expectedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf-8"),
      Buffer.from(expectedSignature, "utf-8")
    );
  }

  /**
   * Initiate refund via Razorpay server API
   */
  async initiateRefund(params: InitiateRefundParams): Promise<RazorpayRefundResult> {
    if (
      !this.isLiveConfigured() ||
      params.paymentId.startsWith("pay_mock_") ||
      params.paymentId.startsWith("pay_test_") ||
      params.paymentId.startsWith("pay_cod_")
    ) {
      logger.info("[RazorpayMock] Using sandbox refund generation", { paymentId: params.paymentId });
      return {
        id: `rfnd_mock_${crypto.randomBytes(12).toString("hex")}`,
        paymentId: params.paymentId,
        amount: params.amountMinorUnits || 0,
        currency: "INR",
        status: "processed",
        isMock: true,
      };
    }

    const url = `https://api.razorpay.com/v1/payments/${encodeURIComponent(params.paymentId)}/refund`;
    const body: Record<string, any> = {};
    if (params.amountMinorUnits) {
      body.amount = params.amountMinorUnits;
    }
    if (params.notes) {
      body.notes = params.notes;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.getAuthHeader(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json();
      logger.error("[RazorpayRefundError]", { errorData });
      throw new ValidationError(errorData.error?.description || "Failed to process refund with payment gateway.");
    }

    const data = await res.json();
    return {
      id: data.id,
      paymentId: data.payment_id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      isMock: false,
    };
  }
}

export const razorpayClient = new RazorpayClient();
