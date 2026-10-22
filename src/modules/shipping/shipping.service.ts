import { ValidationError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";

export interface PincodeCheckResult {
  pincode: string;
  isServiceable: boolean;
  estimatedDays: number;
  message: string;
}

export class ShippingService {
  /**
   * Validate Indian pincode serviceability and calculate transit time
   */
  async checkPincodeServiceability(pincode: string): Promise<PincodeCheckResult> {
    if (!/^\d{6}$/.test(pincode)) {
      throw new ValidationError("Pincode must be exactly 6 digits.");
    }

    // Standard courier serviceability model
    const firstDigit = pincode.charAt(0);
    // Invalid Indian postal zones are 0 or 9 (unless special military)
    if (firstDigit === "0") {
      return {
        pincode,
        isServiceable: false,
        estimatedDays: 0,
        message: "Delivery is currently unavailable to this pin code.",
      };
    }

    // Typical delivery windows based on origin (e.g. Karnataka / South India hub)
    const southZones = ["5", "6"];
    const estimatedDays = southZones.includes(firstDigit) ? 2 : 4;

    return {
      pincode,
      isServiceable: true,
      estimatedDays,
      message: `Standard delivery available: estimated in ${estimatedDays}–${estimatedDays + 2} business days.`,
    };
  }

  /**
   * Track shipment by AWB or Tracking number
   */
  async getShipmentTracking(awbCode: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { awbCode },
      include: {
        trackingEvents: { orderBy: { timestamp: "desc" } },
        order: { select: { orderNumber: true, status: true } },
      },
    });

    return shipment;
  }
}

export const shippingService = new ShippingService();
