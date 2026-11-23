import { and, count, desc, eq, inArray, notInArray } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { customRequests, orders } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, Notice } from "@/components/ui/misc";
import { MediaImage } from "@/components/shop/media-image";
import { requirePage } from "@/lib/auth/guards";
import { listPurchases } from "@/lib/purchases";
import { unreadConversations } from "@/lib/counts";
import { welcomeEligible, getWelcomeDiscount } from "@/lib/discounts";
import { formatDate, formatMoney } from "@/lib/format";

export default async function AccountOverview({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ restricted?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePage(locale, "user", "/account");
  const t = await getTranslations("account.overview");
  const o = await getTranslations("account.orderStatus");
  const rs = await getTranslations("requests.status");
  const v = await getTranslations("verify.status");
  const [purchases, unread, recentOrders, activeRequests, welcome, eligible] = await Promise.all([
    user.isAdultVerified ? listPurchases(user, locale) : Promise.resolve([]),
    unreadConversations(user),
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(3),
    db.select().from(customRequests).where(and(eq(customRequests.customerId, user.id), notInArray(customRequests.status, ["completed", "cancelled", "rejected"]))).orderBy(desc(customRequests.updatedAt)).limit(3),
    getWelcomeDiscount(),
    welcomeEligible(db, user.id),
  ]);
  const restricted = (await searchParams).restricted;

  return (
    <div className="space-y-10" data-testid="account-overview">
      {(restricted || user.blocked) && <Notice tone="error">{t("restricted")}</Notice>}
      {!user.emailVerified ? (
        <Notice tone="warning" title={t("confirmEmailTitle")}>
          {t("confirmEmailBody")} <Link href="/auth/verify-email" className="font-semibold underline">{t("confirmEmailCta")}</Link>
        </Notice>
      ) : !user.isAdultVerified && !user.isAdmin ? (
        <Notice tone="info" title={v(`${user.ageStatus}.title`)}>
          {t("verifyBody")} <Link href="/verify" className="font-semibold underline">{t("verifyCta")}</Link>
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-6">
          <p className="eyebrow text-taupe-700">{t("messages")}</p>
          <p className="font-display mt-3 text-4xl text-espresso">{unread}</p>
          <p className="text-xs text-taupe-700">{t("unread")}</p>
          <Link href="/messages" className="eyebrow mt-4 inline-block text-espresso link-underline">{t("openMessages")}</Link>
        </Card>
        <Card className="p-6">
          <p className="eyebrow text-taupe-700">{t("requests")}</p>
          <p className="font-display mt-3 text-4xl text-espresso">{activeRequests.length}</p>
          <p className="text-xs text-taupe-700">{t("activeRequests")}</p>
          <Link href="/account/requests" className="eyebrow mt-4 inline-block text-espresso link-underline">{t("openRequests")}</Link>
        </Card>
        <Card className="p-6">
          <p className="eyebrow text-taupe-700">{t("purchases")}</p>
          <p className="font-display mt-3 text-4xl text-espresso">{purchases.length}</p>
          <p className="text-xs text-taupe-700">{t("available")}</p>
          <Link href="/account/purchases" className="eyebrow mt-4 inline-block text-espresso link-underline">{t("openPurchases")}</Link>
        </Card>
      </div>

      {welcome && eligible && welcome.kind === "percent" && (
        <div className="dark-surface flex flex-col gap-4 bg-espresso p-7 text-ivory-50 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow text-champagne">{t("promotion")}</p>
            <p className="font-display mt-2 text-3xl">{t("welcomeTitle", { percent: welcome.value })}</p>
          </div>
          <ButtonLink href="/collections" variant="champagne">{t("explore")}</ButtonLink>
        </div>
      )}

      {purchases.length > 0 && (
        <section>
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="font-display text-3xl text-espresso">{t("recentPurchases")}</h2>
            <Link href="/account/purchases" className="eyebrow text-taupe-700 link-underline">{t("viewAll")}</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {purchases.slice(0, 3).map((p) => (
              <Link key={p.entitlementId} href="/account/purchases" className="group block">
                {p.product ? <MediaImage media={p.product.cover} alt={p.product.title} className="aspect-[4/5]" canViewVerified sizes="300px" /> : <div className="dark-surface flex aspect-[4/5] items-center justify-center bg-espresso"><span className="eyebrow text-champagne">{t("personal")}</span></div>}
                <p className="font-display mt-3 text-xl text-espresso">{p.product?.title ?? p.offer?.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display mb-4 text-3xl text-espresso">{t("recentOrders")}</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-taupe-700">{t("noOrders")}</p>
          ) : (
            <ul className="divide-y divide-champagne/50 border-y border-champagne/50">
              {recentOrders.map((ord) => (
                <li key={ord.id} className="flex items-center justify-between gap-4 py-4 text-sm">
                  <Link href={`/account/orders/${ord.id}`} className="link-underline">{ord.number}</Link>
                  <span className="text-taupe-700">{formatDate(ord.createdAt, locale)}</span>
                  <Badge tone={ord.status === "paid" ? "success" : "neutral"}>{o(ord.status)}</Badge>
                  <span>{formatMoney(ord.totalCents, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="font-display mb-4 text-3xl text-espresso">{t("activeRequestsTitle")}</h2>
          {activeRequests.length === 0 ? (
            <p className="text-sm text-taupe-700">{t("noRequests")} <Link href="/custom-requests" className="underline">{t("createRequest")}</Link></p>
          ) : (
            <ul className="divide-y divide-champagne/50 border-y border-champagne/50">
              {activeRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-4 text-sm">
                  <span>No. {r.number}</span>
                  <Badge tone="champagne">{rs(r.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
