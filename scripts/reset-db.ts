import "dotenv/config";
import { Pool } from "pg";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to reset a production database");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString: url });
await pool.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
await pool.end();
console.log("✓ database reset");
