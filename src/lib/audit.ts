import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { clientIp } from "./request-info";

/** Records sensitive actions (admin changes, account security events, payment state changes). */
export async function audit(
  actorId: string | null,
  action: string,
  target?: { type: string; id: string },
  meta: Record<string, unknown> = {},
) {
  let ip: string | null = null;
  try {
    ip = await clientIp();
  } catch {
    ip = null; // outside a request (scripts / webhooks processed in background)
  }
  await db.insert(auditLogs).values({ actorId, action, targetType: target?.type, targetId: target?.id, meta, ip });
}
