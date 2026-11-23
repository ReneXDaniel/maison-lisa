"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { useUI } from "@/stores/ui";
import { IconBell } from "@/components/ui/icons";
import { formatDateTime } from "@/lib/format";
import { notificationHref } from "@/lib/notification-links";

type N = { id: string; type: string; data: Record<string, string | number | null>; readAt: string | null; createdAt: string };

export function NotificationBell({ tone }: { tone: "light" | "dark" }) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const unread = useUI((s) => s.unreadNotifications);
  const setCounts = useUI((s) => s.setCounts);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<N[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: N[] }) => {
        if (!alive) return;
        setItems(d.items);
        if (d.items.some((i) => !i.readAt)) {
          void fetch("/api/notifications", { method: "POST" }).then(() => setCounts({ unreadNotifications: 0 }));
        }
      });
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setCounts]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={unread ? t("bellUnread", { count: unread }) : t("bell")}
        className={clsx("relative flex size-10 items-center justify-center", tone === "light" ? "text-ivory-50 hover:text-champagne" : "text-espresso hover:text-taupe-700")}
      >
        <IconBell size={20} />
        {unread > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-champagne-400 ring-2 ring-ivory-50" />}
      </button>
      <div
        className={clsx(
          "absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] border border-champagne/60 bg-ivory-50 shadow-lift transition-all duration-300",
          open ? "visible opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <p className="eyebrow border-b border-champagne/40 px-5 py-3 text-taupe-700">{t("title")}</p>
        <ul className="max-h-96 overflow-y-auto">
          {items === null && <li className="px-5 py-6 text-sm text-taupe-700">…</li>}
          {items?.length === 0 && <li className="px-5 py-8 text-center text-sm text-taupe-700">{t("empty")}</li>}
          {items?.map((n) => (
            <li key={n.id} className="border-b border-champagne/25 last:border-0">
              <Link href={notificationHref(n.type, n.data)} onClick={() => setOpen(false)} className="block px-5 py-3.5 transition-colors hover:bg-ivory-200">
                <p className={clsx("text-sm", !n.readAt ? "font-semibold text-espresso" : "text-charcoal")}>
                  {t(`types.${n.type}`, Object.fromEntries(Object.entries(n.data).map(([k, v]) => [k, String(v ?? "")])))}
                </p>
                <p className="mt-0.5 text-xs text-taupe-700">{formatDateTime(n.createdAt, locale)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
