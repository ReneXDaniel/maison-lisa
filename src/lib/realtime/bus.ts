import "server-only";
import { EventEmitter } from "node:events";
import { Client } from "pg";
import { env } from "@/lib/env";
import { pool } from "@/db";

/**
 * Realtime fan-out built on PostgreSQL LISTEN/NOTIFY, so events reach every
 * application instance without extra infrastructure. Each instance holds one
 * LISTEN connection and dispatches to its local SSE subscribers.
 *
 * Payloads carry identifiers only; clients re-fetch content through
 * authorised endpoints. Nothing sensitive travels through NOTIFY.
 */
export type RealtimeEvent = {
  type: "message" | "receipt" | "conversation" | "notification" | "offer" | "request" | "order";
  to: { users?: string[]; admins?: boolean };
  data: Record<string, string | number | null>;
};

const CHANNEL = "ml_events";

type State = { emitter: EventEmitter; listener: Client | null; connecting: Promise<void> | null };
const g = globalThis as unknown as { __mlBus?: State };
const state: State = (g.__mlBus ??= { emitter: new EventEmitter().setMaxListeners(0), listener: null, connecting: null });

async function ensureListener() {
  if (state.listener || state.connecting) return state.connecting ?? undefined;
  state.connecting = (async () => {
    const client = new Client({ connectionString: env().DATABASE_URL });
    client.on("notification", (msg) => {
      if (msg.channel !== CHANNEL || !msg.payload) return;
      try {
        state.emitter.emit("event", JSON.parse(msg.payload) as RealtimeEvent);
      } catch {
        /* ignore malformed */
      }
    });
    client.on("error", () => {
      state.listener = null;
      setTimeout(() => void ensureListener(), 2000);
    });
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
    state.listener = client;
  })().finally(() => {
    state.connecting = null;
  });
  return state.connecting;
}

export async function publish(event: RealtimeEvent) {
  try {
    await pool().query("SELECT pg_notify($1, $2)", [CHANNEL, JSON.stringify(event)]);
  } catch (err) {
    console.error("[realtime] notify failed, delivering locally", err);
    state.emitter.emit("event", event);
  }
}

export async function subscribe(who: { userId: string; isAdmin: boolean }, cb: (e: RealtimeEvent) => void) {
  await ensureListener();
  const handler = (e: RealtimeEvent) => {
    if (e.to.users?.includes(who.userId) || (e.to.admins && who.isAdmin)) cb(e);
  };
  state.emitter.on("event", handler);
  return () => state.emitter.off("event", handler);
}
