import { NextRequest } from "next/server";
import { catalogService } from "@/modules/catalog/catalog.service";
import { apiPublicSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(
  _req: NextRequest,
  segmentData: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await segmentData.params;
    const product = await catalogService.getProductBySlug(slug);
    return apiPublicSuccess(product, 60, 300);
  } catch (error) {
    return handleApiError(error);
  }
}
