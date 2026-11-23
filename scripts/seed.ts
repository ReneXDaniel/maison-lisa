/**
 * Seeds the database.
 *  - Always: Lisa's administrator account (from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
 *            and the automatic first-order welcome discount (10 %).
 *  - With SEED_DEMO_CONTENT=true (development only): demo collections, products,
 *    clearly-labelled demo artwork, releases, a look poll and example codes.
 *
 * Idempotent: safe to run repeatedly.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { hash } from "@node-rs/argon2";
import * as schema from "../src/db/schema";
import { seedDemoContent } from "./seed-demo";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const pool = new Pool({ connectionString: url });
const db = drizzle(pool, { schema });

const email = (process.env.SEED_ADMIN_EMAIL ?? "lisa@maison-lisa.test").toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
if (!password || password.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be set (min. 12 characters)");

const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
if (!existing) {
  const [admin] = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 }),
      role: "admin",
      emailVerifiedAt: new Date(),
    })
    .returning();
  await db.insert(schema.profiles).values({ userId: admin!.id, displayName: "Lisa", locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? "de", notifyEmailMessages: false });
  console.log(`✓ admin account created: ${email}`);
} else console.log(`• admin account exists: ${email}`);

const [welcome] = await db.select().from(schema.discounts).where(eq(schema.discounts.isWelcome, true));
if (!welcome) {
  await db.insert(schema.discounts).values({
    name: "Welcome — first order",
    kind: "percent",
    value: 10,
    scope: "order",
    firstOrderOnly: true,
    perCustomerLimit: 1,
    isWelcome: true,
    active: true,
  });
  console.log("✓ welcome discount (10 %) created");
}

if (process.env.SEED_DEMO_CONTENT === "true") {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo content in production");
  await seedDemoContent(db);
}

await pool.end();
console.log("✓ seed complete");
