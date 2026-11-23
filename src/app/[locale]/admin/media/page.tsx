import { desc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { media } from "@/db/schema";
import { AdminPage, Panel } from "@/components/admin/ui";
import { ActionButton, ImageUpload } from "@/components/admin/forms";
import { Badge } from "@/components/ui/misc";
import { requirePage } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { assignMediaSlotAction, deleteSiteMediaAction } from "@/app/actions/admin";

const SLOTS = ["hero", "silkReveal", "hotspotImage", "aboutPortrait", "nailBase", "nailMask", "behindScenes"] as const;

export default async function AdminMedia({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", "/admin/media");
  const t = await getTranslations("admin.media");
  const [items, { siteMedia }] = await Promise.all([db.select().from(media).where(eq(media.kind, "site")).orderBy(desc(media.createdAt)), getSettings()]);
  const slotOf = (id: string) => SLOTS.filter((s) => (s === "behindScenes" ? (siteMedia.behindScenes ?? []).includes(id) : siteMedia[s] === id));
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")} actions={<ImageUpload kind="site" label={t("upload")} />}>
      <Panel title={t("slotsTitle")} className="mb-8">
        <p className="mb-4 text-sm text-taupe-700">{t("slotsHelp")}</p>
        <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {SLOTS.map((s) => (
            <li key={s} className="border border-champagne/40 p-3"><p className="eyebrow text-taupe-700">{t(`slots.${s}`)}</p><p className="mt-1 text-xs">{s === "behindScenes" ? t("count", { n: (siteMedia.behindScenes ?? []).length }) : siteMedia[s] ? "✓" : t("empty")}</p></li>
          ))}
        </ul>
      </Panel>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((m) => {
          const used = slotOf(m.id);
          return (
            <li key={m.id} className="border border-champagne/50 bg-ivory-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/media/${m.id}?w=480`} alt={m.alt} className="aspect-[4/3] w-full object-cover" loading="lazy" />
              <p className="mt-2 truncate text-xs font-semibold">{m.fileName}</p>
              <p className="text-[11px] text-taupe-700">{m.width}×{m.height}{m.isDemo && " · DEMO"}</p>
              <div className="mt-1 flex flex-wrap gap-1">{used.map((s) => <Badge key={s} tone="champagne">{t(`slots.${s}`)}</Badge>)}</div>
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-taupe-700">{t("assign")}</summary>
                <div className="mt-2 flex flex-wrap gap-1">
                  {SLOTS.map((s) => <ActionButton key={s} action={assignMediaSlotAction.bind(null, s, m.id)} label={s === "behindScenes" && used.includes("behindScenes") ? `− ${t(`slots.${s}`)}` : t(`slots.${s}`)} />)}
                </div>
              </details>
              {!used.length && <div className="mt-2"><ActionButton action={deleteSiteMediaAction.bind(null, m.id)} label={t("delete")} confirm={t("deleteConfirm")} variant="danger" /></div>}
            </li>
          );
        })}
      </ul>
    </AdminPage>
  );
}
