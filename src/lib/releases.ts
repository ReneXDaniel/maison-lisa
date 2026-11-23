import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { releases, releaseTranslations } from "@/db/schema";
import { mediaByIds, pickTranslation } from "./catalog";

export async function listReleases(locale: string, opts: { includeUnpublished?: boolean } = {}) {
  const rows = await db.select().from(releases).where(opts.includeUnpublished ? undefined : eq(releases.published, true)).orderBy(asc(releases.sortOrder));
  if (!rows.length) return [];
  const [tr, covers] = await Promise.all([
    db.select().from(releaseTranslations).where(inArray(releaseTranslations.releaseId, rows.map((r) => r.id))),
    mediaByIds(rows.map((r) => r.coverMediaId).filter(Boolean) as string[]),
  ]);
  return rows.map((r) => {
    const t = pickTranslation(tr.filter((x) => x.releaseId === r.id), locale);
    return { ...r, title: t?.title ?? r.slug, description: t?.description ?? "", cover: r.coverMediaId ? (covers.get(r.coverMediaId) ?? null) : null };
  });
}
