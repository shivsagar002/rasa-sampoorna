import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/security/guards";
import { addressService } from "@/modules/addresses/address.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { AddressType } from "@prisma/client";
import { z } from "zod";

const setDefaultSchema = z.object({
  type: z.nativeEnum(AddressType).default(AddressType.SHIPPING),
});

export async function POST(
  req: NextRequest,
  segmentData: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await segmentData.params;

    let body: { type: AddressType } = { type: AddressType.SHIPPING };
    try {
      const json = await req.json();
      body = setDefaultSchema.parse(json);
    } catch {
      // defaults to SHIPPING
    }

    const updated = await addressService.setDefault(id, session.userId, body.type);
    return apiSuccess(updated, `Address set as default ${body.type.toLowerCase()} address.`);
  } catch (error) {
    return handleApiError(error);
  }
}
