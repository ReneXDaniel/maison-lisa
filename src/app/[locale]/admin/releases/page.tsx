import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { media, releaseTranslations } from "@/db/schema";
import { AdminPage, Panel } from "@/components/admin/ui";
import { ReleaseEditor } from "@/components/admin/release-editor";
import { requirePage } from "@/lib/auth/guards";
import { listReleases } from "@/lib/releases";

export default async function AdminReleases({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", "/admin/releases");
  const t = await getTranslations("admin.releases");
  const [list, tr, images] = await Promise.all([listReleases(locale, { includeUnpublished: true }), db.select().from(releaseTranslations), db.select({ id: media.id, fileName: media.fileName }).from(media).where(eq(media.kind, "site"))]);
  const trFor = (id: string) => Object.fromEntries(tr.filter((x) => x.releaseId === id).map((x) => [x.locale, { title: x.title, description: x.description }]));
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")}>
      <p className="mb-6 max-w-2xl text-sm text-taupe-700">{t("help")}</p>
      <div className="space-y-6">
        {list.map((r) => (
          <Panel key={r.id} title={r.title}>
            <ReleaseEditor release={{ id: r.id, slug: r.slug, releaseAt: r.releaseAt ? r.releaseAt.toISOString().slice(0, 16) : "", published: r.published, coverMediaId: r.coverMediaId ?? "", sortOrder: r.sortOrder }} translations={trFor(r.id)} images={images} />
          </Panel>
        ))}
        <Panel title={t("new")}><ReleaseEditor release={null} translations={{}} images={images} /></Panel>
      </div>
    </AdminPage>
  );
}
