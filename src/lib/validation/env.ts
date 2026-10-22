import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Authentication
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters long"),
  AUTH_SESSION_EXPIRY_DAYS: z.coerce.number().default(30),

  // Payments (Razorpay)
  RAZORPAY_KEY_ID: z.string().optional().default("rzp_test_placeholder"),
  RAZORPAY_KEY_SECRET: z.string().optional().default("razorpay_secret_placeholder"),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default("razorpay_webhook_secret_placeholder"),

  // Logistics (Shiprocket)
  SHIPROCKET_EMAIL: z.string().email().optional(),
  SHIPROCKET_PASSWORD: z.string().optional(),

  // Storage (Cloudflare R2)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional().default("rasa-products"),
  R2_PUBLIC_DOMAIN: z.string().optional().default("https://assets.rasasampoorna.com"),

  // Transactional Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("orders@rasasampoorna.com"),
  NOTIFICATIONS_ADMIN_EMAIL: z.string().email().optional().default("admin@rasasampoorna.com"),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function getEnv(): Env {
  if (parsedEnv) return parsedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `  - ${err.path.join(".")}: ${err.message}`)
      .join("\n");

    const message = `[Env Validation Error] Invalid environment variables:\n${errorDetails}`;

    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    } else {
      console.warn(message);
      // Fallback with defaults for development if possible
      parsedEnv = envSchema.parse({
        ...process.env,
        DATABASE_URL:
          process.env.DATABASE_URL ||
          "postgresql://postgres:postgres@localhost:5432/rasa_db?schema=public",
        AUTH_SECRET:
          process.env.AUTH_SECRET || "development-secret-minimum-32-chars-key-rasa",
      });
      return parsedEnv;
    }
  }

  parsedEnv = result.data;
  return parsedEnv;
}

export const env = getEnv();
