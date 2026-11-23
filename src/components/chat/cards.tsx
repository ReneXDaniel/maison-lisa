"use client";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { formatDate, formatMoney } from "@/lib/format";
import { useUI } from "@/stores/ui";
import { acceptOfferAction, addOfferToCartAction, declineOfferAction } from "@/app/actions/offers";
import type { ChatMessage } from "@/lib/chat";

const SELECTION_ORDER = ["polishColor", "polishFinish", "style", "stockings", "footwear", "accessories", "background"] as const;

export function RequestCard({ request, greeting }: { request: NonNullable<ChatMessage["request"]>; greeting: string }) {
  const t = useTranslations("chat.request");
  const o = useTranslations("options");
  const r = useTranslations("requests.status");
  return (
    <div className="w-full max-w-md border border-champagne bg-ivory-50 shadow-card" data-testid="request-card">
      <div className="flex items-center justify-between gap-3 border-b border-champagne/60 px-5 py-3">
        <p className="eyebrow text-taupe-700">{t("title", { number: request.number })}</p>
        <Badge tone="champagne">{r(request.status)}</Badge>
      </div>
      <div className="space-y-3 px-5 py-4">
        <p className="font-display text-xl leading-snug text-espresso">{greeting}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {SELECTION_ORDER.filter((k) => request.selections[k]).map((k) => (
            <div key={k} className="contents">
              <dt className="text-taupe-700">{o(`${k}.label`)}</dt>
              <dd className="font-semibold text-charcoal">{o(`${k}.${request.selections[k]}`)}</dd>
            </div>
          ))}
        </dl>
        {request.notes && (
          <div className="border-t border-champagne/50 pt-3">
            <p className="eyebrow mb-1 text-taupe-700">{t("wishes")}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-charcoal">{request.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function OfferCard({ offer, role, onChange }: { offer: NonNullable<ChatMessage["offer"]>; role: "customer" | "admin"; onChange: () => void }) {
  const t = useTranslations("chat.offer");
  const e = useTranslations("errors");
  const locale = useLocale();
  const setCartCount = useUI((s) => s.setCartCount);
  const toast = useUI((s) => s.toast);
  const [pending, start] = useTransition();
  const [inCart, setInCart] = useState(false);
  const expired = offer.deadline ? new Date(offer.deadline).getTime() < Date.now() : false;
  const status = expired && (offer.status === "open" || offer.status === "accepted") ? "expired" : offer.status;

  const act = (fn: () => Promise<{ ok: boolean; error?: string; data?: unknown }>, after?: (d: unknown) => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast({ tone: "error", title: e.has(res.error ?? "") ? e(res.error!) : e("server") });
      else after?.(res.data);
      onChange();
    });

  const toCart = (d: unknown) => {
    const c = (d as { cartCount?: number })?.cartCount;
    if (typeof c === "number") setCartCount(c);
    setInCart(true);
    toast({ tone: "success", title: t("addedTitle"), body: offer.title, href: "/cart" });
  };

  return (
    <div className="dark-surface w-full max-w-md overflow-hidden border border-champagne/70 bg-espresso text-ivory-50 shadow-lift" data-testid="offer-card" data-status={status}>
      <div className="flex items-center justify-between gap-3 px-6 pt-5">
        <p className="eyebrow text-champagne">{t("label")}</p>
        <Badge tone={status === "paid" ? "success" : status === "open" ? "champagne" : "neutral"}>{t(`status.${status}`)}</Badge>
      </div>
      <div className="px-6 pb-6 pt-3">
        <p className="font-display text-3xl leading-tight">{offer.title}</p>
        {offer.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-champagne-200">{offer.description}</p>}
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-champagne/25 pt-4 text-sm">
          <dt className="text-champagne-200/80">{t("price")}</dt>
          <dd className="font-display text-2xl text-ivory-50">{formatMoney(offer.priceCents, locale, offer.currency)}</dd>
          {offer.deliveryDetails && (
            <>
              <dt className="text-champagne-200/80">{t("delivery")}</dt>
              <dd>{offer.deliveryDetails}</dd>
            </>
          )}
          {offer.deadline && (
            <>
              <dt className="text-champagne-200/80">{t("deadline")}</dt>
              <dd>{formatDate(offer.deadline, locale)}</dd>
            </>
          )}
        </dl>
        {role === "customer" && (status === "open" || status === "accepted") && (
          <div className="mt-6 space-y-3">
            <div className="flex flex-wrap gap-2">
              {status === "open" ? (
                <>
                  <Button variant="champagne" loading={pending} onClick={() => act(() => acceptOfferAction(offer.id), toCart)} data-testid="offer-accept">
                    {t("accept")}
                  </Button>
                  <Button variant="light" disabled={pending} onClick={() => act(() => declineOfferAction(offer.id))}>
                    {t("decline")}
                  </Button>
                </>
              ) : inCart ? (
                <ButtonLink href="/cart" variant="champagne">{t("goToCart")}</ButtonLink>
              ) : (
                <Button variant="champagne" loading={pending} onClick={() => act(() => addOfferToCartAction(offer.id), toCart)} data-testid="offer-add-cart">
                  {t("addToCart")}
                </Button>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-champagne-200/75">{t("acceptNote")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
