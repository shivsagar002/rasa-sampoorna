import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { uploadDirectFile, ALLOWED_IMAGE_TYPES } from "@/lib/storage/r2";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, BadRequestError } from "@/lib/api/errors";

export async function POST(req: NextRequest) {
  try {
    await requireStaff(req);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as "products" | "categories" | "collections" | "cms") || "products";

    if (!file) {
      throw new BadRequestError("No image file provided for upload.");
    }

    const contentType = file.type || "image/jpeg";
    if (!ALLOWED_IMAGE_TYPES[contentType.toLowerCase()]) {
      throw new BadRequestError(
        `Unsupported file type: ${contentType}. Please upload a JPG, PNG, WebP, or AVIF image.`
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadDirectFile(
      buffer,
      file.name || "upload.jpg",
      contentType,
      folder
    );

    return apiSuccess(result, "Image uploaded successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
