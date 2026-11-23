"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { Link, usePathname } from "@/i18n/navigation";
import { brand } from "@/config/brand";
import { useUI } from "@/stores/ui";
import { useSessionUser } from "@/components/providers/session-provider";
import { LanguageSwitcher } from "./language-switcher";
import { NotificationBell } from "./notification-bell";
import { IconBag, IconChat, IconClose, IconMenu, IconUser } from "@/components/ui/icons";

export const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/collections", key: "collections" },
  { href: "/nail-studio", key: "nailStudio" },
  { href: "/custom-requests", key: "customRequests" },
  { href: "/about", key: "about" },
  { href: "/shop", key: "shop" },
  { href: "/messages", key: "messages" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const user = useSessionUser();
  const cartCount = useUI((s) => s.cartCount);
  const unread = useUI((s) => s.unreadMessages);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const overlay = pathname === "/" && !scrolled && !menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const iconTone = overlay ? "text-ivory-50 hover:text-champagne" : "text-espresso hover:text-taupe-700";

  return (
    <>
      <a href="#main" className="sr-only z-[90] bg-espresso px-4 py-2 text-ivory-50 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        {t("skipToContent")}
      </a>
      <header
        className={clsx(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter,height] duration-700 ease-[var(--ease-luxe)]",
          overlay ? "bg-transparent" : "bg-ivory-50/88 shadow-[0_1px_0_rgb(201_178_153/0.5)] backdrop-blur-md",
        )}
      >
        <div className={clsx("mx-auto flex max-w-[1440px] items-center gap-2 px-4 transition-[height] min-[380px]:gap-4 duration-500 sm:px-8", scrolled ? "h-16" : "h-20")}>
          <button
            type="button"
            className={clsx("-ml-2 flex size-10 items-center justify-center min-[1360px]:hidden", iconTone)}
            onClick={() => setMenuOpen(true)}
            aria-label={t("openMenu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <IconMenu size={22} />
          </button>

          <Link
            href="/"
            className={clsx(
              "font-display whitespace-nowrap text-[15px] tracking-[0.28em] transition-colors min-[380px]:text-[19px] min-[380px]:tracking-[0.42em] sm:text-[22px] min-[1360px]:mr-4 min-[1360px]:tracking-[0.34em]",
              overlay ? "text-ivory-50" : "text-espresso",
            )}
            aria-label={`${brand.name} — ${t("home")}`}
          >
            {brand.name}
          </Link>

          <nav aria-label={t("primary")} className="mx-auto hidden min-[1360px]:block">
            <ul className="flex items-center gap-6">
              {NAV_ITEMS.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={clsx(
                      "relative whitespace-nowrap py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors",
                      overlay ? "text-ivory-50/90 hover:text-ivory-50" : "text-charcoal hover:text-espresso",
                      "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-500 hover:after:scale-x-100",
                      isActive(item.href) && "after:scale-x-100",
                    )}
                  >
                    {t(item.key)}
                    {item.key === "messages" && unread > 0 && <span className="absolute -right-2.5 top-1 size-1.5 rounded-full bg-champagne-400" aria-hidden />}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1 min-[1360px]:ml-0">
            <div className="hidden sm:block">
              <LanguageSwitcher tone={overlay ? "light" : "dark"} />
            </div>
            {user && (
              <Link href="/messages" className={clsx("relative flex size-10 items-center justify-center", iconTone)} aria-label={unread ? t("messagesUnread", { count: unread }) : t("messages")}>
                <IconChat size={20} />
                {unread > 0 && (
                  <span className="absolute right-1 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-champagne px-1 text-[9px] font-bold text-espresso">{unread > 9 ? "9+" : unread}</span>
                )}
              </Link>
            )}
            {user && <NotificationBell tone={overlay ? "light" : "dark"} />}
            <Link href={user ? (user.isAdmin ? "/admin" : "/account") : "/auth/login"} className={clsx("flex size-10 items-center justify-center", iconTone)} aria-label={user ? t("account") : t("login")}>
              <IconUser size={20} />
            </Link>
            <Link href="/cart" className={clsx("relative flex size-10 items-center justify-center", iconTone)} aria-label={t("cartCount", { count: cartCount })} data-testid="header-cart">
              <IconBag size={20} />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    className={clsx(
                      "absolute right-0.5 top-1 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-[18px]",
                      overlay ? "bg-ivory-50 text-espresso" : "bg-espresso text-ivory-50",
                    )}
                    data-testid="cart-count"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t("menu")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="dark-surface fixed inset-0 z-[60] flex flex-col bg-espresso text-ivory-50"
          >
            <div className="flex h-20 items-center justify-between px-4 sm:px-8">
              <span className="font-display text-[19px] tracking-[0.42em]">{brand.name}</span>
              <button className="flex size-10 items-center justify-center" onClick={() => setMenuOpen(false)} aria-label={t("closeMenu")}>
                <IconClose size={22} />
              </button>
            </div>
            <nav aria-label={t("primary")} className="flex flex-1 flex-col justify-center overflow-y-auto px-8 pb-10">
              <ul className="space-y-1">
                {[...NAV_ITEMS, { href: "/look-studio", key: "lookStudio" as const }, { href: "/quiz", key: "quiz" as const }, { href: "/next-chapter", key: "nextChapter" as const }].map((item, i) => (
                  <motion.li key={item.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i + 0.1, duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}>
                    <Link href={item.href} className={clsx("font-display block py-1.5 text-4xl transition-colors sm:text-5xl", isActive(item.href) ? "text-champagne" : "text-ivory-50 hover:text-champagne")}>
                      {t(item.key)}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-10 flex items-center gap-6 border-t border-champagne/25 pt-6">
                <LanguageSwitcher tone="light" align="left" />
                <Link href={user ? "/account" : "/auth/login"} className="eyebrow text-champagne">
                  {user ? t("account") : t("login")}
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
