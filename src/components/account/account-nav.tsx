"use client";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { Link, usePathname } from "@/i18n/navigation";
import { useUI } from "@/stores/ui";
import { logoutAction } from "@/app/actions/auth";

const ITEMS = [
  ["/account", "overview"],
  ["/messages", "messages"],
  ["/account/orders", "orders"],
  ["/account/purchases", "purchases"],
  ["/account/requests", "requests"],
  ["/cart", "cart"],
  ["/account/profile", "profile"],
  ["/account/security", "security"],
] as const;

export function AccountNav() {
  const t = useTranslations("account.nav");
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const unread = useUI((s) => s.unreadMessages);
  const cart = useUI((s) => s.cartCount);
  return (
    <nav aria-label={t("label")} className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto border-b border-champagne/50 px-5 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-b-0 lg:border-r lg:px-0 lg:pr-6">
      {ITEMS.map(([href, key]) => {
        const active = href === "/account" ? pathname === "/account" : pathname.startsWith(href);
        const badge = key === "messages" ? unread : key === "cart" ? cart : 0;
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center justify-between gap-3 whitespace-nowrap px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors lg:border-l-2 lg:px-4",
              active ? "text-espresso lg:border-espresso lg:bg-ivory-200" : "text-taupe-700 hover:text-espresso lg:border-transparent",
            )}
          >
            {t(key)}
            {badge > 0 && <span className="rounded-full bg-espresso px-2 text-[10px] text-ivory-50">{badge}</span>}
          </Link>
        );
      })}
      <form action={logoutAction} className="lg:mt-6 lg:border-t lg:border-champagne/50 lg:pt-4">
        <button type="submit" className="whitespace-nowrap px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-taupe-700 transition-colors hover:text-espresso lg:px-4" data-testid="logout">
          {tNav("logout")}
        </button>
      </form>
    </nav>
  );
}
