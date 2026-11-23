import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../src/db/schema";

/** Demo catalogue — filled in once demo artwork is generated (see scripts/generate-demo-assets.ts). */
export async function seedDemoContent(_db: NodePgDatabase<typeof schema>) {
  console.log("• demo content: not yet available");
}
