import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { validateBody } from "@/lib/validation/api-validator";
import { collectionSchema } from "@/modules/collections/collection.schema";
import { collectionService } from "@/modules/collections/collection.service";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";

export async function GET(req: NextRequest) {
  try {
    await requireStaff(req);
    const collections = await collectionService.listCollections(true);
    return apiSuccess(collections);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireStaff(req);
    const input = await validateBody(req, collectionSchema);
    const collection = await collectionService.createCollection(input);
    return apiSuccess(collection, "Collection created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
