import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/validation/env";
import { BadRequestError } from "@/lib/api/errors";

export interface R2ObjectMetadata {
  key: string;
  publicUrl: string;
  bucket: string;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresInSeconds: number;
}

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (s3ClientInstance) return s3ClientInstance;

  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    return null;
  }

  s3ClientInstance = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return s3ClientInstance;
}

/**
 * Generate a clean, unique R2 storage key
 */
export function generateR2Key(
  folder: "products" | "categories" | "collections" | "cms",
  originalFilename: string,
  extension: string
): string {
  const baseName = originalFilename
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 40);

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${folder}/${timestamp}-${randomSuffix}-${baseName}.${extension}`;
}

/**
 * Resolve public CDN URL from R2 storage key
 */
export function getR2PublicUrl(key: string): string {
  if (key.startsWith("http://") || key.startsWith("https://") || key.startsWith("/")) {
    return key;
  }
  const baseUrl = (env.R2_PUBLIC_DOMAIN || "https://assets.rasasampoorna.com").replace(/\/$/, "");
  return `${baseUrl}/${key.replace(/^\//, "")}`;
}

/**
 * Generate short-lived presigned upload URL for admin media uploads
 */
export async function createPresignedUploadUrl(
  filename: string,
  contentType: string,
  fileSizeBytes?: number,
  folder: "products" | "categories" | "collections" | "cms" = "products"
): Promise<PresignedUploadResult> {
  const normalizedType = contentType.toLowerCase().trim();
  const extension = ALLOWED_IMAGE_TYPES[normalizedType];

  if (!extension) {
    throw new BadRequestError(
      `Invalid image content type: "${contentType}". Supported types: JPG, PNG, WebP, AVIF.`
    );
  }

  if (fileSizeBytes && fileSizeBytes > MAX_IMAGE_SIZE_BYTES) {
    throw new BadRequestError(
      `File size exceeds limit of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`
    );
  }

  const key = generateR2Key(folder, filename, extension);
  const publicUrl = getR2PublicUrl(key);
  const expiresInSeconds = 15 * 60; // 15 minutes

  const s3 = getS3Client();

  if (!s3) {
    // In local dev without R2 credentials, provide mock endpoint
    return {
      uploadUrl: `/api/v1/admin/media/mock-upload?key=${encodeURIComponent(key)}`,
      key,
      publicUrl,
      expiresInSeconds,
    };
  }

  const bucket = env.R2_BUCKET_NAME || "rasa-products";
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: normalizedType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });

  return {
    uploadUrl,
    key,
    publicUrl,
    expiresInSeconds,
  };
}

import fs from "fs";
import path from "path";

/**
 * Upload a file directly to Cloudflare R2 (or local public/uploads directory)
 */
export async function uploadDirectFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: "products" | "categories" | "collections" | "cms" = "products"
): Promise<{ key: string; publicUrl: string }> {
  const normalizedType = contentType.toLowerCase().trim();
  const extension = ALLOWED_IMAGE_TYPES[normalizedType] || "jpg";

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new BadRequestError(
      `File size exceeds limit of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`
    );
  }

  const key = generateR2Key(folder, filename, extension);
  const s3 = getS3Client();

  if (s3) {
    const bucket = env.R2_BUCKET_NAME || "rasa-products";
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: normalizedType,
      })
    );
    return {
      key,
      publicUrl: getR2PublicUrl(key),
    };
  }

  // Local filesystem fallback
  const safeBaseName = path.basename(key);
  const uploadsDir = path.join(process.cwd(), "public", "uploads", folder);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const targetPath = path.join(uploadsDir, safeBaseName);
  fs.writeFileSync(targetPath, buffer);

  const localPublicUrl = `/uploads/${folder}/${safeBaseName}`;
  return {
    key,
    publicUrl: localPublicUrl,
  };
}

/**
 * Delete an object from Cloudflare R2
 */
export async function deleteR2Object(key: string): Promise<boolean> {
  const s3 = getS3Client();
  if (!s3) {
    return true; // No-op in mock environment
  }

  try {
    const bucket = env.R2_BUCKET_NAME || "rasa-products";
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    console.error(`Failed to delete R2 object with key "${key}":`, error);
    return false;
  }
}

