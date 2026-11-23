"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useUI } from "@/stores/ui";
import { notificationHref } from "@/lib/notification-links";

export type RTEvent = { type: string; data: Record<string, string | number | null> };

/** Subscribe to realtime events anywhere in the client tree. */
export function onRealtime(handler: (e: RTEvent) => void) {
  const fn = (ev: Event) => handler((ev as CustomEvent<RTEvent>).detail);
  window.addEventListener("ml:rt", fn);
  return () => window.removeEventListener("ml:rt", fn);
}

/**
 * One Server-Sent Events connection per tab. Events carry identifiers only;
 * views re-fetch content through authorised endpoints. If the stream drops,
 * the browser reconnects automatically and views resynchronise on "open".
 */
export function RealtimeClient({ initial }: { initial: { cartCount: number; unreadMessages: number; unreadNotifications: number } }) {
  const setCounts = useUI((s) => s.setCounts);
  const toast = useUI((s) => s.toast);
  const t = useTranslations("notifications");

  useEffect(() => {
    setCounts(initial);
  }, [initial, setCounts]);

  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    const refreshCounts = () =>
      fetch("/api/me/counts", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => c && setCounts(c))
        .catch(() => {});

    const dispatch = (detail: RTEvent) => window.dispatchEvent(new CustomEvent("ml:rt", { detail }));

    const connect = () => {
      es = new EventSource("/api/realtime");
      es.addEventListener("open", () => {
        dispatch({ type: "resync", data: {} });
        void refreshCounts();
      });
      es.addEventListener("rt", (msg) => {
        const e = JSON.parse((msg as MessageEvent).data) as RTEvent;
        dispatch(e);
        if (e.type === "message" && typeof e.data.conversationId === "string") {
          // Acknowledge receipt: this is what turns "sent" into "delivered" for the sender.
          void fetch("/api/chat/delivered", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [e.data.conversationId] }) }).catch(() => {});
        }
        if (e.type === "message" || e.type === "notification" || e.type === "conversation") void refreshCounts();
        if (e.type === "notification" && typeof e.data.kind === "string" && !document.hidden) {
          const kind = e.data.kind;
          const onChat = kind === "message_from_lisa" || kind === "admin_new_message";
          const here = onChat && e.data.conversationId && location.pathname.includes(String(e.data.conversationId));
          if (!here) toast({ tone: "info", title: t(`types.${kind}`, { number: "", title: "" }), href: notificationHref(kind, e.data) });
        }
      });
      es.onerror = () => {
        // EventSource retries on its own; add a slow poll as a safety net while disconnected.
        if (!poll) poll = setInterval(refreshCounts, 20000);
      };
    };
    connect();
    return () => {
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, [setCounts, t, toast]);

  return null;
}

/** Sets counts for signed-out visitors (cart only). */
export function CountsInit({ cartCount }: { cartCount: number }) {
  const setCounts = useUI((s) => s.setCounts);
  useEffect(() => setCounts({ cartCount, unreadMessages: 0, unreadNotifications: 0 }), [cartCount, setCounts]);
  return null;
}
