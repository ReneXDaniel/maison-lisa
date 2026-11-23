import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { collectionTranslations, media } from "@/db/schema";
import { AdminPage, Panel } from "@/components/admin/ui";
import { CollectionEditor } from "@/components/admin/collection-editor";
import { requirePage } from "@/lib/auth/guards";
import { listCollections } from "@/lib/catalog";

export default async function AdminCollections({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", "/admin/collections");
  const t = await getTranslations("admin.collections");
  const [cols, tr, siteImages] = await Promise.all([listCollections(locale, { includeUnpublished: true }), db.select().from(collectionTranslations), db.select({ id: media.id, fileName: media.fileName }).from(media).where(eq(media.kind, "site"))]);
  const trFor = (id: string) => Object.fromEntries(tr.filter((x) => x.collectionId === id).map((x) => [x.locale, { title: x.title, description: x.description }]));
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")}>
      <div className="space-y-6">
        {cols.map((c) => (
          <Panel key={c.id} title={c.title}>
            <CollectionEditor collection={{ id: c.id, slug: c.slug, sortOrder: c.sortOrder, published: c.published, coverMediaId: c.cover?.id ?? "" }} translations={trFor(c.id)} images={siteImages} />
          </Panel>
        ))}
        <Panel title={t("new")}>
          <CollectionEditor collection={null} translations={{}} images={siteImages} />
        </Panel>
      </div>
    </AdminPage>
  );
}
