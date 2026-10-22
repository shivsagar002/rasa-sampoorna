import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { addressSchema } from "@/modules/addresses/address.schema";
import { addressService } from "@/modules/addresses/address.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const addresses = await addressService.listAddresses(session.userId);
    return apiSuccess(addresses);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const input = await validateBody(req, addressSchema);
    const address = await addressService.createAddress(session.userId, input);

    return apiSuccess(address, "Address added successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
