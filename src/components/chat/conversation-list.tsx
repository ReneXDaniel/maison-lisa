"use client";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Link } from "@/i18n/navigation";
import { onRealtime } from "@/components/providers/realtime-client";
import { IconFlag, IconPlus, IconSearch } from "@/components/ui/icons";
import { formatDate, formatTime } from "@/lib/format";
import type { ConversationSummary } from "@/lib/chat";

type Filter = "all" | "unread" | "awaiting_lisa" | "flagged" | "archived";

export function ConversationList({ role, activeId, basePath }: { role: "customer" | "admin"; activeId?: string; basePath: string }) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role === "admin") params.set("filter", filter);
    const r = await fetch(`/api/chat/conversations?${params}`, { cache: "no-store" });
    if (r.ok) setItems(((await r.json()) as { items: ConversationSummary[] }).items);
  }, [q, filter, role]);

  useEffect(() => {
    const id = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  useEffect(() => onRealtime((e) => ["message", "conversation", "receipt", "resync", "offer"].includes(e.type) && void load()), [load]);

  const time = (iso: string) => {
    const d = new Date(iso);
    return d.toDateString() === new Date().toDateString() ? formatTime(d, locale) : formatDate(d, locale, { day: "numeric", month: "short" });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-4 border-b border-champagne/50 px-5 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-espresso">{t("title")}</h1>
          {role === "customer" && (
            <Link href="/messages/new" className="flex size-9 items-center justify-center border border-espresso/40 text-espresso transition hover:bg-espresso hover:text-ivory-50" aria-label={t("newConversation")} title={t("newConversation")} data-testid="new-conversation">
              <IconPlus size={16} />
            </Link>
          )}
        </div>
        <label className="flex h-10 items-center gap-2 border border-taupe/40 bg-ivory-50 px-3 focus-within:border-espresso">
          <IconSearch size={15} className="text-taupe-700" />
          <span className="sr-only">{t("search")}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} className="w-full bg-transparent text-sm outline-none placeholder:text-taupe-600/70" />
        </label>
        {role === "admin" && (
          <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
            {(["all", "unread", "awaiting_lisa", "flagged", "archived"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={clsx("whitespace-nowrap px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition", filter === f ? "bg-espresso text-ivory-50" : "text-taupe-700 hover:bg-ivory-200")}
              >
                {t(`filters.${f}`)}
              </button>
            ))}
          </div>
        )}
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto" data-testid="conversation-list">
        {items === null && [0, 1, 2].map((i) => <li key={i} className="skeleton m-4 h-16" />)}
        {items?.length === 0 && (
          <li className="px-6 py-14 text-center">
            <p className="font-display text-2xl text-espresso">{t("empty")}</p>
            <p className="mt-2 text-sm text-taupe-700">{role === "customer" ? t("emptyBody") : t("emptyAdmin")}</p>
          </li>
        )}
        {items?.map((c) => (
          <li key={c.id}>
            <Link
              href={`${basePath}/${c.id}`}
              aria-current={c.id === activeId ? "page" : undefined}
              className={clsx(
                "flex gap-3 border-b border-champagne/30 border-l-2 px-5 py-4 transition-colors",
                c.id === activeId ? "border-l-espresso bg-ivory-200" : "border-l-transparent hover:bg-ivory-200/60",
              )}
              data-testid="conversation-item"
            >
              <span className="font-display flex size-10 shrink-0 items-center justify-center rounded-full bg-champagne/60 text-lg text-espresso">{c.counterpart.slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={clsx("truncate font-display text-lg", c.unread ? "text-espresso" : "text-charcoal")}>{c.counterpart}</span>
                  <span className="shrink-0 text-[11px] text-taupe-700">{time(c.lastMessageAt)}</span>
                </span>
                {c.subject && <span className="block truncate text-xs font-semibold text-taupe-700">{c.subject}</span>}
                <span className="mt-0.5 flex items-center gap-2">
                  <span className={clsx("truncate text-[13px]", c.unread ? "font-semibold text-charcoal" : "text-taupe-700")}>
                    {c.preview?.startsWith("[") ? t(`previewKinds.${c.preview.slice(1, -1)}`) : (c.preview ?? t("noMessages"))}
                  </span>
                  {c.flagged && <IconFlag size={13} className="shrink-0 text-danger" />}
                  {c.unread > 0 && (
                    <span className="ml-auto flex min-w-5 items-center justify-center rounded-full bg-espresso px-1.5 text-[10px] font-bold leading-5 text-ivory-50" aria-label={t("unreadCount", { count: c.unread })}>
                      {c.unread}
                    </span>
                  )}
                </span>
                {role === "admin" && <span className="mt-1 inline-block text-[10px] uppercase tracking-[0.14em] text-taupe-700">{t(`adminStatus.${c.status}`)}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
