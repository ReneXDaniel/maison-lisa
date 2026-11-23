import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "@/lib/env";

export type DB = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

const g = globalThis as unknown as { __mlPool?: Pool; __mlDb?: DB };

export function pool(): Pool {
  if (!g.__mlPool) {
    g.__mlPool = new Pool({ connectionString: env().DATABASE_URL, max: 10, idleTimeoutMillis: 30_000 });
  }
  return g.__mlPool;
}

export function getDb(): DB {
  if (!g.__mlDb) g.__mlDb = drizzle(pool(), { schema });
  return g.__mlDb;
}

/** Lazily-initialised database handle (safe to import from any server module). */
export const db = new Proxy({} as DB, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export { schema };
