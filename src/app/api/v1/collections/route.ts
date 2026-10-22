import { NextRequest } from "next/server";
import { collectionService } from "@/modules/collections/collection.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const featuredOnly = searchParams.get("featured") === "true";

    const collections = await collectionService.listCollections(false, featuredOnly);
    return apiSuccess(collections);
  } catch (error) {
    return handleApiError(error);
  }
}
