"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import clsx from "clsx";
import { Link, useRouter } from "@/i18n/navigation";
import { onRealtime } from "@/components/providers/realtime-client";
import { IconArrowLeft, IconCheck, IconClip, IconClose, IconDoubleCheck, IconSend } from "@/components/ui/icons";
import { Notice } from "@/components/ui/misc";
import { formatDate, formatTime } from "@/lib/format";
import { brand } from "@/config/brand";
import { OfferCard, RequestCard } from "./cards";
import { useVisualViewportHeight } from "./use-visual-viewport";
import type { ChatMessage, ConversationMeta } from "@/lib/chat";

type Local = ChatMessage & { local?: "sending" | "failed"; files?: File[] };
const MAX_FILES = 4;

function useDraft(key: string) {
  const [value, setValue] = useState("");
  useEffect(() => setValue(localStorage.getItem(key) ?? ""), [key]);
  const update = (v: string) => {
    setValue(v);
    if (v) localStorage.setItem(key, v);
    else localStorage.removeItem(key);
  };
  return [value, update] as const;
}

export function ConversationView({ id, role, basePath, maxMb = 10 }: { id?: string; role: "customer" | "admin"; basePath: string; maxMb?: number }) {
  const t = useTranslations("chat");
  const e = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const isNew = !id;
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [items, setItems] = useState<Local[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(isNew);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useDraft(`ml-draft:${id ?? "new"}`);
  const [subject, setSubject] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const vvh = useVisualViewportHeight();

  const markRead = useCallback(() => {
    if (id && document.visibilityState === "visible") void fetch(`/api/chat/conversations/${id}/read`, { method: "POST" });
  }, [id]);

  const merge = (incoming: ChatMessage[]) =>
    setItems((prev) => {
      const map = new Map(prev.filter((p) => !p.local).map((p) => [p.id, p]));
      for (const m of incoming) map.set(m.id, m);
      const pending = prev.filter((p) => p.local);
      return [...[...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), ...pending];
    });

  const load = useCallback(async () => {
    if (!id) return;
    const r = await fetch(`/api/chat/conversations/${id}`, { cache: "no-store" });
    if (!r.ok) {
      setError(r.status === 404 ? "not_found" : "server");
      setLoaded(true);
      return;
    }
    const d = (await r.json()) as { meta: ConversationMeta; items: ChatMessage[]; hasMore: boolean };
    setMeta(d.meta);
    merge(d.items);
    setHasMore((h) => h || d.hasMore);
    setLoaded(true);
    markRead();
  }, [id, markRead]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const off = onRealtime((ev) => {
      if (ev.type === "resync") return void load();
      if (ev.data.conversationId !== id) return;
      if (ev.type === "message") {
        atBottom.current = atBottom.current || true;
        void load();
      } else if (["receipt", "offer", "conversation", "request"].includes(ev.type)) void load();
    });
    const onVis = () => document.visibilityState === "visible" && markRead();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      off();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [id, load, markRead]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [items]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  async function loadEarlier() {
    const first = items.find((m) => !m.local);
    if (!id || !first) return;
    const el = scroller.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const r = await fetch(`/api/chat/conversations/${id}?before=${encodeURIComponent(first.createdAt)}`, { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as { items: ChatMessage[] };
    atBottom.current = false;
    merge(d.items);
    setHasMore(d.items.length >= 50);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    });
  }

  async function sendTo(conversationId: string, body: string, attach: File[]) {
    const fd = new FormData();
    fd.set("body", body);
    for (const f of attach) fd.append("files", f);
    const r = await fetch(`/api/chat/conversations/${conversationId}/messages`, { method: "POST", body: fd });
    if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "server");
  }

  async function send(retry?: Local) {
    const body = retry ? retry.body : draft.trim();
    const attach = retry ? (retry.files ?? []) : files;
    if (!body && !attach.length) return;
    setError(null);

    if (isNew) {
      setBusy(true);
      try {
        const r = await fetch("/api/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: subject || undefined, body: attach.length ? undefined : body }) });
        const d = (await r.json()) as { id?: string; error?: string };
        if (!r.ok || !d.id) throw new Error(d.error ?? "server");
        if (attach.length) await sendTo(d.id, body, attach);
        setDraft("");
        setFiles([]);
        router.replace(`${basePath}/${d.id}`);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }

    const temp: Local = retry
      ? { ...retry, local: "sending" }
      : { id: `tmp-${Date.now()}`, kind: "text", body, mine: true, senderRole: role, createdAt: new Date().toISOString(), attachments: [], local: "sending", files: attach };
    atBottom.current = true;
    setItems((prev) => [...prev.filter((p) => p.id !== temp.id), temp]);
    if (!retry) {
      setDraft("");
      setFiles([]);
    }
    try {
      await sendTo(id!, body, attach);
      setItems((prev) => prev.filter((p) => p.id !== temp.id));
      await load();
    } catch (err) {
      const code = (err as Error).message;
      setItems((prev) => prev.map((p) => (p.id === temp.id ? { ...p, local: "failed" } : p)));
      setError(code);
    }
  }

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, MAX_FILES);
    const tooBig = next.find((f) => f.size > maxMb * 1024 * 1024);
    if (tooBig) setError("upload_too_large");
    setFiles(next.filter((f) => f.size <= maxMb * 1024 * 1024));
  }

  const statusOf = (m: Local) => {
    if (m.local) return m.local;
    if (meta?.otherReadAt && m.createdAt <= meta.otherReadAt) return "read";
    if (meta?.otherDeliveredAt && m.createdAt <= meta.otherDeliveredAt) return "delivered";
    return "sent";
  };

  let lastDay = "";
  const counterpart = meta?.counterpart ?? (role === "customer" ? brand.creatorName : "");

  return (
    <div
      className="fixed inset-x-0 top-0 z-[55] flex flex-col bg-ivory-100 lg:static lg:z-auto lg:h-full"
      style={{ height: vvh ? `${vvh}px` : "100dvh" }}
      data-testid="conversation-view"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-champagne/50 bg-ivory-50/90 px-4 py-3 backdrop-blur sm:px-6">
        <Link href={basePath} className="-ml-1 flex size-9 items-center justify-center text-espresso lg:hidden" aria-label={t("back")}>
          <IconArrowLeft size={20} />
        </Link>
        <span className="font-display flex size-10 shrink-0 items-center justify-center rounded-full bg-espresso text-lg text-champagne">{(counterpart || "·").slice(0, 1)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-xl text-espresso">{isNew ? t("startTitle", { creator: brand.creatorName }) : counterpart}</p>
          <p className="truncate text-[11px] uppercase tracking-[0.14em] text-taupe-700">{meta?.subject ?? (meta ? t(`${role === "admin" ? "adminStatus" : "status"}.${meta.status}`) : t("private"))}</p>
        </div>
      </div>

      <div ref={scroller} onScroll={onScroll} className="paper-grain min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8" aria-live="polite" data-testid="message-list">
        {role === "customer" && (
          <p className="mx-auto mb-6 max-w-sm text-center text-[11px] leading-relaxed text-taupe-700">{t("privateNote", { creator: brand.creatorName })}</p>
        )}
        {!loaded && <div className="mx-auto mt-10 size-5 animate-spin rounded-full border border-espresso border-t-transparent" />}
        {error === "not_found" && <Notice tone="error">{e("not_found")}</Notice>}
        {hasMore && (
          <div className="mb-6 text-center">
            <button onClick={loadEarlier} className="eyebrow text-taupe-700 link-underline">
              {t("loadEarlier")}
            </button>
          </div>
        )}
        {meta?.status === "archived" && role === "customer" && <Notice className="mb-6">{t("archivedNote")}</Notice>}
        <ol className="space-y-3">
          {items.map((m) => {
            const day = formatDate(m.createdAt, locale, { dateStyle: "long" });
            const sep = day !== lastDay;
            lastDay = day;
            const st = m.mine ? statusOf(m) : null;
            return (
              <li key={m.id} className="space-y-3" data-testid="message" data-kind={m.kind} data-mine={m.mine ? "1" : "0"}>
                {sep && (
                  <div className="flex items-center gap-4 py-2">
                    <span className="hairline flex-1" />
                    <span className="eyebrow text-taupe-700">{day}</span>
                    <span className="hairline flex-1" />
                  </div>
                )}
                {m.kind === "system" ? (
                  <p className="text-center text-xs italic text-taupe-700">{m.body}</p>
                ) : (
                  <div className={clsx("flex animate-fade-up flex-col", m.mine ? "items-end" : "items-start")}>
                    {m.kind === "request" && m.request ? (
                      <RequestCard request={m.request} greeting={m.body} />
                    ) : m.kind === "offer" && m.offer ? (
                      <OfferCard offer={m.offer} role={role} onChange={load} />
                    ) : (
                      <div
                        className={clsx(
                          "max-w-[85%] px-4 py-3 text-[15px] leading-relaxed sm:max-w-[70%]",
                          m.mine ? "bg-espresso text-ivory-50" : "border border-champagne/60 bg-[#e6dccf] text-espresso",
                          m.local === "sending" && "opacity-70",
                        )}
                      >
                        {m.attachments.length > 0 && (
                          <div className={clsx("mb-2 grid gap-1.5", m.attachments.length > 1 && "grid-cols-2")}>
                            {m.attachments.map((a) => (
                              <a key={a.id} href={`/api/chat/attachments/${a.id}`} target="_blank" rel="noopener" className="block overflow-hidden bg-ivory-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`/api/chat/attachments/${a.id}`} alt={a.fileName} width={a.width ?? undefined} height={a.height ?? undefined} className="h-auto max-h-64 w-full object-cover" loading="lazy" />
                              </a>
                            ))}
                          </div>
                        )}
                        {m.files && m.local && <p className="mb-1 text-xs opacity-80">📎 {m.files.length}</p>}
                        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1.5 px-1 text-[11px] text-taupe-700">
                      <time dateTime={m.createdAt}>{formatTime(m.createdAt, locale)}</time>
                      {st === "sending" && <span>· {t("sending")}</span>}
                      {st === "sent" && <IconCheck size={13} aria-label={t("sent")} />}
                      {st === "delivered" && <IconDoubleCheck size={14} aria-label={t("delivered")} />}
                      {st === "read" && <IconDoubleCheck size={14} className="text-champagne-400" aria-label={t("read")} />}
                      {st === "failed" && (
                        <button className="font-semibold text-danger underline" onClick={() => send(m)}>
                          {t("retry")}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <form
        className="shrink-0 border-t border-champagne/50 bg-ivory-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6"
        onSubmit={(ev) => {
          ev.preventDefault();
          void send();
        }}
      >
        {error && error !== "not_found" && (
          <p role="alert" className="mb-2 text-xs text-danger">
            {e.has(error) ? e(error) : e("server")}
          </p>
        )}
        {isNew && (
          <input
            value={subject}
            onChange={(ev) => setSubject(ev.target.value.slice(0, 120))}
            placeholder={t("subjectPlaceholder")}
            aria-label={t("subjectLabel")}
            className="mb-2 h-10 w-full border-b border-taupe/30 bg-transparent px-1 text-sm outline-none focus:border-espresso"
          />
        )}
        {files.length > 0 && (
          <ul className="mb-2 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-2 border border-champagne bg-ivory-100 px-2 py-1 text-xs">
                <span className="max-w-40 truncate">{f.name}</span>
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={t("removeAttachment")}>
                  <IconClose size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <button type="button" onClick={() => fileInput.current?.click()} className="flex size-11 shrink-0 items-center justify-center text-taupe-700 hover:text-espresso" aria-label={t("attach")} title={t("attachmentsHint", { mb: maxMb })}>
            <IconClip size={20} />
          </button>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(ev) => (pickFiles(ev.target.files), (ev.target.value = ""))} />
          <label className="sr-only" htmlFor="chat-input">
            {t("placeholder")}
          </label>
          <textarea
            id="chat-input"
            value={draft}
            onChange={(ev) => setDraft(ev.target.value.slice(0, 4000))}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && !ev.shiftKey && !ev.nativeEvent.isComposing && window.matchMedia("(min-width: 1024px)").matches) {
                ev.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder={t("placeholder")}
            className="max-h-40 min-h-11 flex-1 resize-none border border-taupe/40 bg-ivory-100 px-4 py-2.5 text-[15px] leading-relaxed outline-none [field-sizing:content] focus:border-espresso"
            data-testid="chat-input"
          />
          <button type="submit" disabled={busy || (!draft.trim() && !files.length)} className="flex size-11 shrink-0 items-center justify-center bg-espresso text-ivory-50 transition hover:bg-espresso-700 disabled:opacity-40" aria-label={t("send")} data-testid="chat-send">
            {busy ? <span className="size-4 animate-spin rounded-full border border-current border-t-transparent" /> : <IconSend size={18} />}
          </button>
        </div>
        {draft && <p className="mt-1.5 px-1 text-[10px] text-taupe-700">{t("draftSaved")}</p>}
      </form>
    </div>
  );
}
