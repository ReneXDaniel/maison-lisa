import { desc, eq, inArray } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { customOffers, customRequests } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { requirePage } from "@/lib/auth/guards";
import { formatDate, formatMoney } from "@/lib/format";

const ORDER = ["polishColor", "polishFinish", "style", "stockings", "footwear", "accessories", "background"] as const;

export default async function RequestsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePage(locale, "user", "/account/requests");
  const t = await getTranslations("account.requests");
  const st = await getTranslations("requests.status");
  const o = await getTranslations("options");
  const os = await getTranslations("chat.offer.status");
  const list = await db.select().from(customRequests).where(eq(customRequests.customerId, user.id)).orderBy(desc(customRequests.createdAt));
  const offers = list.length ? await db.select().from(customOffers).where(inArray(customOffers.requestId, list.map((r) => r.id))) : [];
  if (!list.length) return <EmptyState title={t("empty")} body={t("emptyBody")} action={<ButtonLink href="/custom-requests">{t("create")}</ButtonLink>} />;
  return (
    <div className="space-y-5" data-testid="requests-list">
      {list.map((r) => {
        const sel = r.selections as Record<string, string>;
        return (
          <article key={r.id} className="border border-champagne/50 bg-ivory-50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-2xl text-espresso">{t("number", { number: r.number })}</p>
              <Badge tone="champagne">{st(r.status)}</Badge>
            </div>
            <p className="mt-1 text-xs text-taupe-700">{formatDate(r.createdAt, locale)}</p>
            <p className="mt-4 text-sm text-charcoal">{ORDER.filter((k) => sel[k]).map((k) => o(`${k}.${sel[k]}`)).join(" · ") || "—"}</p>
            {r.notes && <p className="mt-2 line-clamp-2 text-sm text-taupe-700">“{r.notes}”</p>}
            {offers.filter((x) => x.requestId === r.id).map((x) => (
              <div key={x.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-champagne/50 pt-4 text-sm">
                <span>{x.title}</span>
                <span className="flex items-center gap-3"><span className="font-semibold">{formatMoney(x.priceCents, locale)}</span><Badge>{os(x.status)}</Badge></span>
              </div>
            ))}
            {r.conversationId && <Link href={`/messages/${r.conversationId}`} className="eyebrow mt-5 inline-block text-espresso link-underline">{t("openConversation")}</Link>}
          </article>
        );
      })}
    </div>
  );
}
