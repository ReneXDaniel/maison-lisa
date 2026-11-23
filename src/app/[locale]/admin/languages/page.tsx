import { count, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { collections, collectionTranslations, contentBlocks, products, productTranslations, releases, releaseTranslations } from "@/db/schema";
import { AdminPage, Table, Td } from "@/components/admin/ui";
import { Badge, Notice } from "@/components/ui/misc";
import { requirePage } from "@/lib/auth/guards";
import { defaultLocale, localeNames, locales } from "@/i18n/routing";
import { loaders, NAMESPACES } from "../../../../../messages";

type Obj = Record<string, unknown>;
const countKeys = (o: Obj): number => Object.values(o).reduce<number>((n, v) => n + (v && typeof v === "object" ? countKeys(v as Obj) : 1), 0);

export default async function AdminLanguages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "admin", "/admin/languages");
  const t = await getTranslations("admin.languages");
  const [[p], [c], [r], pt, ct, rt, cb] = await Promise.all([
    db.select({ n: count() }).from(products),
    db.select({ n: count() }).from(collections),
    db.select({ n: count() }).from(releases),
    db.select({ l: productTranslations.locale, n: count() }).from(productTranslations).groupBy(productTranslations.locale),
    db.select({ l: collectionTranslations.locale, n: count() }).from(collectionTranslations).groupBy(collectionTranslations.locale),
    db.select({ l: releaseTranslations.locale, n: count() }).from(releaseTranslations).groupBy(releaseTranslations.locale),
    db.select({ l: contentBlocks.locale, n: count() }).from(contentBlocks).groupBy(contentBlocks.locale),
  ]);
  const ui = await Promise.all(locales.map(async (l) => [l, (await Promise.all(NAMESPACES.map((ns) => loaders[l]![ns]()))).reduce((n, m) => n + countKeys(m), 0)] as const));
  const uiTotal = ui.find(([l]) => l === "en")?.[1] ?? 1;
  const n = (rows: { l: string; n: number }[], l: string) => Number(rows.find((x) => x.l === l)?.n ?? 0);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 100);
  return (
    <AdminPage eyebrow={t("eyebrow")} title={t("title")}>
      <Notice className="mb-6">{t("help", { lang: localeNames[defaultLocale] })}</Notice>
      <Table head={[t("language"), t("interface"), t("products"), t("collections"), t("releases"), t("content")]}>
        {locales.map((l) => {
          const u = ui.find(([x]) => x === l)?.[1] ?? 0;
          const cells = [pct(u, uiTotal), pct(n(pt, l), Number(p?.n ?? 0)), pct(n(ct, l), Number(c?.n ?? 0)), pct(n(rt, l), Number(r?.n ?? 0))];
          return (
            <tr key={l}>
              <Td><span className="font-semibold">{localeNames[l]}</span> <span className="text-xs text-taupe-700">/{l}</span>{l === defaultLocale && <Badge className="ml-2" tone="champagne">{t("default")}</Badge>}</Td>
              {cells.map((v, i) => <Td key={i}><Badge tone={v >= 100 ? "success" : v >= 50 ? "warning" : "danger"}>{v}%</Badge></Td>)}
              <Td className="text-xs text-taupe-700">{t("overrides", { n: n(cb, l) })}</Td>
            </tr>
          );
        })}
      </Table>
      <p className="mt-6 text-xs text-taupe-700">{t("fallbackNote")}</p>
    </AdminPage>
  );
}
