import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/misc";
import { MediaImage } from "@/components/shop/media-image";
import { IconDownload } from "@/components/ui/icons";
import { requirePage } from "@/lib/auth/guards";
import { listPurchases, fileUrl } from "@/lib/purchases";
import { getSetting } from "@/lib/settings";
import { formatDate } from "@/lib/format";
import { brand } from "@/config/brand";

/** Purchased collections with short-lived, account-bound links (age verification required). */
export default async function PurchasesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePage(locale, "adult", "/account/purchases");
  const t = await getTranslations("account.purchases");
  const purchases = await listPurchases(user, locale);
  const ttl = await getSetting("downloadLinkTtlMinutes");
  if (!purchases.length) return <EmptyState title={t("empty")} body={t("emptyBody")} action={<ButtonLink href="/collections">{t("explore")}</ButtonLink>} />;
  const withLinks = await Promise.all(
    purchases.map(async (p) => ({ ...p, links: await Promise.all(p.files.map(async (f) => ({ ...f, view: await fileUrl(user, f.kind, f.id, true), download: await fileUrl(user, f.kind, f.id) }))) })),
  );
  return (
    <div className="space-y-12" data-testid="purchases">
      <Notice>{t("linkNote", { minutes: ttl })}</Notice>
      {withLinks.map((p) => (
        <section key={p.entitlementId} className="grid gap-6 border-b border-champagne/50 pb-12 md:grid-cols-[220px_minmax(0,1fr)]" data-testid="purchase">
          {p.product ? (
            <MediaImage media={p.product.cover} alt={p.product.title} className="aspect-[4/5]" canViewVerified sizes="220px" />
          ) : (
            <div className="dark-surface flex aspect-[4/5] flex-col items-center justify-center gap-2 bg-espresso p-6 text-center">
              <span className="font-display text-3xl tracking-[0.3em] text-champagne">{brand.monogram}</span>
              <span className="eyebrow text-champagne-200">{t("personal")}</span>
            </div>
          )}
          <div>
            <p className="eyebrow text-taupe-700">{t("ordered", { number: p.orderNumber, date: formatDate(p.grantedAt, locale) })}</p>
            <h2 className="font-display mt-2 text-3xl text-espresso">{p.product?.title ?? p.offer?.title}</h2>
            {p.links.length === 0 ? (
              <p className="mt-4 text-sm text-taupe-700">{p.offer ? t("preparing", { creator: brand.creatorName }) : t("noFiles")}</p>
            ) : (
              <ul className="mt-6 divide-y divide-champagne/40 border-y border-champagne/40">
                {p.links.map((f, i) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm" data-testid="purchase-file">
                    <span className="text-charcoal">{String(i + 1).padStart(2, "0")} · {f.fileName}{f.width ? ` · ${f.width}×${f.height}` : ""}</span>
                    <span className="flex gap-4">
                      <a href={f.view} target="_blank" rel="noopener" className="eyebrow text-espresso link-underline">{t("view")}</a>
                      <a href={f.download} className="eyebrow flex items-center gap-1.5 text-espresso link-underline" data-testid="download-link"><IconDownload size={14} />{t("download")}</a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/account/orders/${p.orderId}`} className="eyebrow mt-4 inline-block text-taupe-700 link-underline">{t("viewOrder")}</Link>
          </div>
        </section>
      ))}
    </div>
  );
}
