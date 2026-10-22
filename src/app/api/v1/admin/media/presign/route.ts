import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/security/guards";
import { createPresignedUploadUrl } from "@/lib/storage/r2";
import { apiSuccess } from "@/lib/api/response";
import { handleApiError, BadRequestError } from "@/lib/api/errors";
import { z } from "zod";

const presignSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  contentType: z.string().min(1, "Content-Type is required"),
  fileSizeBytes: z.number().int().positive().optional(),
  folder: z.enum(["products", "categories", "collections", "cms"]).default("products"),
});

export async function POST(req: NextRequest) {
  try {
    await requireStaff(req);
    const body = await req.json();
    const input = presignSchema.parse(body);

    const result = await createPresignedUploadUrl(
      input.filename,
      input.contentType,
      input.fileSizeBytes,
      input.folder
    );

    return apiSuccess(result, "Presigned upload URL generated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
