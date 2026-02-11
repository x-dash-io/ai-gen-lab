import { z } from "zod";

/**
 * Environment variable validation schema
 * This ensures all required environment variables are present and correctly typed
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // NextAuth
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // PayPal (optional - only required for payment processing)
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_ENV: z.enum(["sandbox", "live"]).optional().default("sandbox"),

  // Cloudinary (optional - only required for file uploads)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Email (optional - only required for sending emails)
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * Call this at app startup to catch missing/invalid env vars early
 */
export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Environment validation failed:");
    console.error(parsed.error.format());
    throw new Error(
      `Invalid environment variables: ${parsed.error.issues.map((e) => e.path.join(".")).join(", ")}`
    );
  }

  return parsed.data;
}

/**
 * Get validated environment variables
 * This is a lazy getter that validates on first access
 */
let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = validateEnv();
  return cachedEnv;
}

/**
 * Check if a specific feature is configured
 */
export function isFeatureConfigured(feature: "paypal" | "cloudinary" | "email"): boolean {
  const env = process.env;

  switch (feature) {
    case "paypal":
      return !!(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
    case "cloudinary":
      return !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
    case "email":
      return !!(env.RESEND_API_KEY && env.FROM_EMAIL);
    default:
      return false;
  }
}

/**
 * Warn about missing optional features in development
 */
export function checkOptionalFeatures(): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const features = ["paypal", "cloudinary", "email"] as const;
  const missing = features.filter((f) => !isFeatureConfigured(f));

  if (missing.length > 0) {
    console.warn(
      `[DEV] Optional features not configured: ${missing.join(", ")}. Some functionality may be limited.`
    );
  }
}
