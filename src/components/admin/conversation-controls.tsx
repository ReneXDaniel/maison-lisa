"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Select, TextArea } from "@/components/ui/field";
import { useUI } from "@/stores/ui";
import { IconArchive, IconFlag } from "@/components/ui/icons";
import { addNoteAction, setBlockedAction, setConversationStatusAction, setRequestStatusAction, toggleFlagAction } from "@/app/actions/admin-chat";
import { REQUEST_STATUSES } from "@/lib/constants";
import { createOfferAction } from "@/app/actions/offers";

type R = { ok: boolean; error?: string };

function useRunner() {
  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const e = useTranslations("errors");
  const [pending, start] = useTransition();
  const go = (fn: () => Promise<R>, success?: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast({ tone: "error", title: e.has(r.error ?? "") ? e(r.error!) : e("server") });
      else if (success) toast({ tone: "success", title: success });
      router.refresh();
    });
  return { pending, go };
}

export function ConversationControls({ id, status, flagged }: { id: string; status: string; flagged: boolean }) {
  const t = useTranslations("admin.messages");
  const s = useTranslations("chat.adminStatus");
  const { pending, go } = useRunner();
  return (
    <div className="space-y-3">
      <Select label={t("status")} value={status} disabled={pending} onChange={(ev) => go(() => setConversationStatusAction(id, ev.target.value))}>
        {(["new", "active", "awaiting_lisa", "awaiting_customer", "completed", "archived"] as const).map((k) => (
          <option key={k} value={k}>
            {s(k)}
          </option>
        ))}
      </Select>
      <div className="flex gap-2">
        <Button size="sm" variant={flagged ? "danger" : "secondary"} disabled={pending} onClick={() => go(() => toggleFlagAction(id, !flagged))}>
          <IconFlag size={14} />
          {flagged ? t("unflag") : t("flag")}
        </Button>
        {status !== "archived" && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => go(() => setConversationStatusAction(id, "archived"))}>
            <IconArchive size={14} />
            {t("archive")}
          </Button>
        )}
      </div>
    </div>
  );
}

export function RequestStatusSelect({ id, status }: { id: string; status: string }) {
  const t = useTranslations("admin.messages");
  const st = useTranslations("requests.status");
  const { pending, go } = useRunner();
  return (
    <label className="mt-2 block">
      <span className="sr-only">{t("requestStatus")}</span>
      <select
        value={status}
        disabled={pending}
        onChange={(ev) => go(() => setRequestStatusAction(id, ev.target.value), t("requestUpdated"))}
        className="h-9 w-full border border-taupe/40 bg-ivory-50 px-2 text-xs"
        data-testid="request-status"
      >
        {REQUEST_STATUSES.map((k) => (
          <option key={k} value={k}>
            {st(k)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NoteForm({ conversationId }: { conversationId: string }) {
  const t = useTranslations("admin.messages");
  const [body, setBody] = useState("");
  const { pending, go } = useRunner();
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        if (body.trim()) go(async () => {
          const r = await addNoteAction(conversationId, body);
          if (r.ok) setBody("");
          return r;
        });
      }}
      className="space-y-2"
    >
      <TextArea label={t("addNote")} value={body} onChange={(ev) => setBody(ev.target.value)} rows={2} />
      <Button type="submit" size="sm" variant="secondary" loading={pending}>
        {t("saveNote")}
      </Button>
    </form>
  );
}

export function OfferForm({ conversationId, requests }: { conversationId: string; requests: { id: string; number: number }[] }) {
  const t = useTranslations("admin.messages");
  const { pending, go } = useRunner();
  const [v, setV] = useState({ title: t("offerDefaultTitle"), description: "", price: "35", deliveryDetails: t("offerDefaultDelivery"), deadline: "", requestId: requests[0]?.id ?? "" });
  const set = (k: keyof typeof v) => (ev: { target: { value: string } }) => setV({ ...v, [k]: ev.target.value });
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        go(() => createOfferAction({ conversationId, ...v }), t("offerSent"));
      }}
      className="space-y-3"
      data-testid="offer-form"
    >
      {requests.length > 0 && (
        <Select label={t("linkedRequest")} value={v.requestId} onChange={set("requestId")}>
          <option value="">{t("noLinkedRequest")}</option>
          {requests.map((r) => (
            <option key={r.id} value={r.id}>
              No. {r.number}
            </option>
          ))}
        </Select>
      )}
      <Field label={t("offerTitle")} value={v.title} onChange={set("title")} required maxLength={120} name="title" />
      <TextArea label={t("offerDescription")} value={v.description} onChange={set("description")} rows={3} name="description" />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("offerPrice")} type="number" min="1" step="0.01" value={v.price} onChange={set("price")} required name="price" />
        <Field label={t("offerDeadline")} type="date" value={v.deadline} onChange={set("deadline")} name="deadline" />
      </div>
      <Field label={t("offerDelivery")} value={v.deliveryDetails} onChange={set("deliveryDetails")} name="delivery" />
      <Button type="submit" loading={pending} className="w-full" data-testid="offer-submit">
        {t("sendOffer")}
      </Button>
    </form>
  );
}

export function BlockToggle({ userId, blocked }: { userId: string; blocked: boolean }) {
  const t = useTranslations("admin.messages");
  const { pending, go } = useRunner();
  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (blocked || window.confirm(t("blockConfirm"))) go(() => setBlockedAction(userId, !blocked));
      }}
    >
      {blocked ? t("unblock") : t("block")}
    </Button>
  );
}
