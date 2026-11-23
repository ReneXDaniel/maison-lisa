"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link, usePathname } from "@/i18n/navigation";
import { brand } from "@/config/brand";
import { useUI } from "@/stores/ui";
import { IconClose, IconMenu } from "@/components/ui/icons";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { logoutAction } from "@/app/actions/auth";

export const ADMIN_NAV = [
  ["", "overview"],
  ["/customers", "customers"],
  ["/messages", "messages"],
  ["/requests", "requests"],
  ["/products", "products"],
  ["/collections", "collections"],
  ["/orders", "orders"],
  ["/payments", "payments"],
  ["/discounts", "discounts"],
  ["/media", "media"],
  ["/content", "content"],
  ["/looks", "looks"],
  ["/releases", "releases"],
  ["/languages", "languages"],
  ["/settings", "settings"],
] as const;

export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const unread = useUI((s) => s.unreadMessages);
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label={t("label")} className="flex flex-col gap-0.5">
      {ADMIN_NAV.map(([href, key]) => {
        const full = `/admin${href}`;
        const active = href === "" ? pathname === "/admin" : pathname.startsWith(full);
        return (
          <Link
            key={key}
            href={full}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center justify-between px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors",
              active ? "bg-champagne/20 text-ivory-50" : "text-champagne-200/80 hover:bg-champagne/10 hover:text-ivory-50",
            )}
          >
            {t(key)}
            {key === "messages" && unread > 0 && <span className="rounded-full bg-champagne px-2 text-[10px] text-espresso">{unread}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="dark-surface sticky top-0 z-40 flex h-14 items-center justify-between bg-espresso px-4 text-ivory-50 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label={t("open")} className="flex size-10 items-center justify-center">
          <IconMenu />
        </button>
        <span className="font-display tracking-[0.3em]">{brand.name}</span>
        <span className="eyebrow text-champagne">{t("atelier")}</span>
      </div>
      <aside
        className={clsx(
          "dark-surface fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-espresso text-ivory-50 transition-transform duration-500 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 pb-6 pt-7">
          <div>
            <Link href="/" className="font-display block text-xl tracking-[0.34em]">
              {brand.name}
            </Link>
            <p className="eyebrow mt-1 text-champagne">{t("atelier")}</p>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden" aria-label={t("close")}>
            <IconClose />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2">{nav}</div>
        <div className="flex items-center justify-between border-t border-champagne/20 px-4 py-4">
          <LanguageSwitcher tone="light" align="left" />
          <form action={logoutAction}>
            <button className="eyebrow text-champagne-200 hover:text-ivory-50">{t("logout")}</button>
          </form>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-espresso/40 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
