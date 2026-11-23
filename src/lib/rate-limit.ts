import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Fixed-window rate limiter stored in PostgreSQL so limits hold across
 * multiple application instances. Returns true when the action is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (process.env.RATE_LIMIT_DISABLED === "true" && process.env.NODE_ENV !== "production") return true;
  const res = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE rate_limits.window_start END
    RETURNING count
  `);
  const count = Number(res.rows[0]?.count ?? 0);
  return count <= limit;
}

export const LIMITS = {
  login: { limit: 10, window: 15 * 60 },
  register: { limit: 5, window: 60 * 60 },
  passwordReset: { limit: 5, window: 60 * 60 },
  emailResend: { limit: 5, window: 60 * 60 },
  verificationStart: { limit: 6, window: 60 * 60 },
  message: { limit: 30, window: 60 },
  messageDaily: { limit: 400, window: 24 * 60 * 60 },
  upload: { limit: 20, window: 60 * 60 },
  discountCode: { limit: 15, window: 10 * 60 },
  request: { limit: 10, window: 60 * 60 },
  subscribe: { limit: 5, window: 60 * 60 },
  vote: { limit: 20, window: 60 * 60 },
} as const;
