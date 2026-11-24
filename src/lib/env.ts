import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated once at first use.
 *
 * Development simulators (verification + payment) are only usable when
 * ALLOW_DEV_SIMULATORS=true AND NODE_ENV !== "production". A production
 * process that is configured with a dev provider refuses to start the
 * relevant flow (see assertProductionSafety).
 *
 * Exception — preview deployments: PREVIEW_MODE=true with a PREVIEW_PASSWORD
 * of at least 8 characters runs a production build with the labelled
 * simulators, behind a site-wide password (src/proxy.ts). It is meant for
 * testing a hosted copy, never for taking real customers or payments.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).default("postgres://maison:maison_dev@localhost:5432/maison_lisa"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  APP_ENCRYPTION_KEY: z.string().min(32, "APP_ENCRYPTION_KEY must be a base64 32-byte key"),

  MAIL_TRANSPORT: z.enum(["outbox", "smtp"]).default("outbox"),
  MAIL_FROM: z.string().default("MAISON LISA <concierge@example.com>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),
  ADMIN_NOTIFY_EMAIL: z.string().email().optional().or(z.literal("")),

  STORAGE_DRIVER: z.enum(["local", "s3", "db"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default("./storage"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  VERIFICATION_PROVIDER: z.enum(["dev", "veriff"]).default("dev"),
  VERIFF_API_KEY: z.string().optional(),
  VERIFF_SHARED_SECRET: z.string().optional(),
  VERIFF_BASE_URL: z.string().url().default("https://stationapi.veriff.com"),
  VERIFICATION_VALIDITY_DAYS: z.coerce.number().int().positive().default(365),

  PAYMENT_PROVIDER: z.enum(["dev", "verotel"]).default("dev"),
  VEROTEL_SHOP_ID: z.string().optional(),
  VEROTEL_SIGNATURE_KEY: z.string().optional(),
  VEROTEL_FLEXPAY_URL: z.string().url().default("https://secure.verotel.com/startorder"),

  ALLOW_DEV_SIMULATORS: z.enum(["true", "false"]).default("false"),
  DEV_WEBHOOK_SECRET: z.string().default("dev-webhook-secret-change-me-0123456789"),
  CRON_SECRET: z.string().optional(),
  CLAMAV_HOST: z.string().optional(),
  CLAMAV_PORT: z.coerce.number().default(3310),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  PREVIEW_MODE: z.enum(["true", "false"]).default("false"),
  PREVIEW_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().NODE_ENV === "production";

/** A password-protected preview deployment (see the note at the top). */
export function previewMode(): boolean {
  const e = env();
  return e.PREVIEW_MODE === "true" && (e.PREVIEW_PASSWORD ?? "").length >= 8;
}

/** True only in non-production processes, or a protected preview, that explicitly opted in. */
export function devSimulatorsEnabled(): boolean {
  const e = env();
  return e.ALLOW_DEV_SIMULATORS === "true" && (e.NODE_ENV !== "production" || previewMode());
}

/**
 * Throws if a production process is configured with any development-only
 * integration. Called by every provider factory.
 */
export function assertProductionSafety(): void {
  const e = env();
  if (e.NODE_ENV !== "production") return;
  if (e.PREVIEW_MODE === "true") {
    if (!previewMode()) throw new Error("PREVIEW_MODE=true requires PREVIEW_PASSWORD (min. 8 characters)");
    return; // labelled simulators behind the site-wide preview password
  }
  const problems: string[] = [];
  if (e.ALLOW_DEV_SIMULATORS === "true") problems.push("ALLOW_DEV_SIMULATORS must be false in production");
  if (e.VERIFICATION_PROVIDER === "dev") problems.push("VERIFICATION_PROVIDER=dev is not allowed in production");
  if (e.PAYMENT_PROVIDER === "dev") problems.push("PAYMENT_PROVIDER=dev is not allowed in production");
  if (e.MAIL_TRANSPORT === "outbox") problems.push("MAIL_TRANSPORT=outbox does not deliver email; use smtp in production");
  if (problems.length) throw new Error(`Refusing to run unsafe configuration in production:\n- ${problems.join("\n- ")}`);
}
