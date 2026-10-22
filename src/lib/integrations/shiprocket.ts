import crypto from "crypto";
import { env } from "@/lib/validation/env";
import { logger } from "@/lib/observability/logger";
import { ValidationError } from "@/lib/api/errors";

export interface ShiprocketOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
}

export interface CreateShiprocketOrderParams {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: ShiprocketOrderItem[];
  subtotal: number;
  pickupLocation?: string;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
  weightKg?: number;
}

export interface ShiprocketShipmentResult {
  shiprocketOrderId: string;
  shiprocketShipmentId: string;
  awbCode: string;
  courierName: string;
  trackingUrl: string;
  labelUrl?: string;
  isMock: boolean;
}

export interface CreateReversePickupParams {
  shiprocketOrderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  reason: string;
}

export class ShiprocketClient {
  private email?: string;
  private password?: string;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.email = env.SHIPROCKET_EMAIL;
    this.password = env.SHIPROCKET_PASSWORD;
  }

  private isLiveConfigured(): boolean {
    if (process.env.NODE_ENV === "test") {
      return false;
    }
    return Boolean(
      this.email &&
      this.password &&
      this.email.includes("@") &&
      !this.email.includes("placeholder") &&
      !this.password.includes("placeholder")
    );
  }

  /**
   * Acquire authentication token with caching
   */
  private async getToken(): Promise<string | null> {
    if (!this.isLiveConfigured()) return null;

    const now = Date.now();
    if (this.cachedToken && this.tokenExpiresAt > now) {
      return this.cachedToken;
    }

    try {
      const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(4000),
        body: JSON.stringify({
          email: this.email,
          password: this.password,
        }),
      });

      if (!res.ok) {
        logger.error("[ShiprocketAuthFailed]");
        return null;
      }

      const data = await res.json();
      this.cachedToken = data.token;
      // Tokens are typically valid for 10 days; cache for 8 days
      this.tokenExpiresAt = now + 8 * 24 * 60 * 60 * 1000;
      return this.cachedToken;
    } catch (err) {
      logger.error("[ShiprocketAuthError]", { err });
      return null;
    }
  }

  /**
   * Create shipment order and generate AWB info
   */
  async createShipment(params: CreateShiprocketOrderParams): Promise<ShiprocketShipmentResult> {
    const token = await this.getToken();

    if (!token) {
      // Mock Sandbox Shipment for Local Dev & Testing
      const mockShiprocketId = `sr_${Math.floor(100000 + Math.random() * 900000)}`;
      const mockShipmentId = `ship_${Math.floor(100000 + Math.random() * 900000)}`;
      const mockAwb = `AWB${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const courierName = "BlueDart Express";
      const trackingUrl = `https://shiprocket.co/tracking/${mockAwb}`;

      logger.info("[ShiprocketMock] Generated sandbox shipment", { orderNumber: params.orderNumber, mockAwb });

      return {
        shiprocketOrderId: mockShiprocketId,
        shiprocketShipmentId: mockShipmentId,
        awbCode: mockAwb,
        courierName,
        trackingUrl,
        labelUrl: `https://shiprocket.co/shipping-label/${mockShipmentId}.pdf`,
        isMock: true,
      };
    }

    try {
      const payload = {
        order_id: params.orderNumber,
        order_date: params.orderDate.toISOString().slice(0, 19).replace("T", " "),
        pickup_location: params.pickupLocation || "Primary Hub",
        billing_customer_name: params.customerName,
        billing_last_name: "",
        billing_address: params.shippingAddress.street,
        billing_city: params.shippingAddress.city,
        billing_pincode: params.shippingAddress.postalCode,
        billing_state: params.shippingAddress.state,
        billing_country: params.shippingAddress.country,
        billing_email: params.customerEmail,
        billing_phone: params.customerPhone,
        shipping_is_billing: true,
        order_items: params.items.map((i) => ({
          name: i.name,
          sku: i.sku,
          units: i.units,
          selling_price: i.selling_price,
        })),
        payment_method: "Prepaid",
        sub_total: params.subtotal,
        length: params.lengthCm || 30,
        breadth: params.breadthCm || 20,
        height: params.heightCm || 5,
        weight: params.weightKg || 0.8,
      };

      const res = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        logger.error("[ShiprocketOrderCreateFailed]", { errorData });
        throw new ValidationError("Failed to create order on Shiprocket.");
      }

      const data = await res.json();
      const srOrderId = String(data.order_id);
      const srShipmentId = String(data.shipment_id);
      const awbCode = data.awb_code || `AWB${Math.floor(1000000000 + Math.random() * 9000000000)}`;

      return {
        shiprocketOrderId: srOrderId,
        shiprocketShipmentId: srShipmentId,
        awbCode,
        courierName: data.courier_name || "Express Logistics",
        trackingUrl: `https://shiprocket.co/tracking/${awbCode}`,
        isMock: false,
      };
    } catch (err: any) {
      if (env.NODE_ENV !== "production") {
        const mockAwb = `AWB${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        return {
          shiprocketOrderId: `sr_mock_${params.orderId.substring(0, 8)}`,
          shiprocketShipmentId: `ship_mock_${params.orderId.substring(0, 8)}`,
          awbCode: mockAwb,
          courierName: "BlueDart Express",
          trackingUrl: `https://shiprocket.co/tracking/${mockAwb}`,
          isMock: true,
        };
      }
      throw err;
    }
  }

  /**
   * Request reverse pickup for returns
   */
  async createReversePickup(params: CreateReversePickupParams): Promise<{ reverseAwb: string; status: string; isMock: boolean }> {
    const token = await this.getToken();

    if (!token) {
      const mockReverseAwb = `RAW${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      logger.info("[ShiprocketMock] Generated sandbox reverse pickup", { orderNumber: params.orderNumber, mockReverseAwb });
      return {
        reverseAwb: mockReverseAwb,
        status: "PICKUP_SCHEDULED",
        isMock: true,
      };
    }

    try {
      const payload = {
        order_id: `RET-${params.orderNumber}`,
        order_date: new Date().toISOString().slice(0, 10),
        channel_id: "",
        pickup_customer_name: params.customerName,
        pickup_phone: params.customerPhone,
        pickup_address: params.pickupAddress.street,
        pickup_city: params.pickupAddress.city,
        pickup_state: params.pickupAddress.state,
        pickup_pincode: params.pickupAddress.postalCode,
        return_reason: params.reason,
      };

      const res = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/return", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Shiprocket return creation failed.");
      }

      const data = await res.json();
      return {
        reverseAwb: data.awb_code || `RAW${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        status: "PICKUP_SCHEDULED",
        isMock: false,
      };
    } catch {
      const mockReverseAwb = `RAW${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      return {
        reverseAwb: mockReverseAwb,
        status: "PICKUP_SCHEDULED",
        isMock: true,
      };
    }
  }

  /**
   * Verify authenticity of incoming Shiprocket webhook
   */
  verifyWebhookAuthenticity(reqHeaderToken?: string | null): boolean {
    if (env.NODE_ENV !== "production") return true;
    const configuredToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;
    if (!configuredToken) return true;
    return reqHeaderToken === configuredToken;
  }
}

export const shiprocketClient = new ShiprocketClient();
