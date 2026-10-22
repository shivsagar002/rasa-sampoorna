import { NextRequest } from "next/server";
import { validateBody } from "@/lib/validation/api-validator";
import { shippingService } from "@/modules/shipping/shipping.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { z } from "zod";

const pincodeCheckSchema = z.object({
  pincode: z.string().trim(),
});

export async function POST(req: NextRequest) {
  try {
    const { pincode } = await validateBody(req, pincodeCheckSchema);
    const result = await shippingService.checkPincodeServiceability(pincode);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
