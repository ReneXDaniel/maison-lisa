import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authTokens } from "@/db/schema";
import { randomToken, sha256Hex } from "@/lib/crypto";

type Purpose = "verify_email" | "reset_password" | "change_email";

const TTL: Record<Purpose, number> = {
  verify_email: 48 * 3600,
  reset_password: 3600,
  change_email: 24 * 3600,
};

/** Issues a single-use token (only its hash is stored). Older unused tokens of the same purpose are invalidated. */
export async function issueToken(userId: string, purpose: Purpose, newEmail?: string) {
  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.userId, userId), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt)));
  const token = randomToken(32);
  await db.insert(authTokens).values({
    userId,
    purpose,
    tokenHash: sha256Hex(token),
    newEmail: newEmail ?? null,
    expiresAt: new Date(Date.now() + TTL[purpose] * 1000),
  });
  return token;
}

/** Atomically consumes a token. Returns null when invalid, used or expired. */
export async function consumeToken(token: string, purpose: Purpose) {
  if (!token || token.length > 100) return null;
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(eq(authTokens.tokenHash, sha256Hex(token)), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())),
    )
    .returning();
  return row ?? null;
}

/** Non-consuming check (e.g. to render the reset form only for valid links). */
export async function peekToken(token: string, purpose: Purpose) {
  if (!token || token.length > 100) return null;
  const [row] = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, sha256Hex(token)), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())));
  return row ?? null;
}
