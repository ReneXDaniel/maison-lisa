"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/misc";
import { locales, localeNames } from "@/i18n/routing";
import {
  beginMfaSetupAction,
  changePasswordAction,
  confirmMfaSetupAction,
  deleteAccountAction,
  disableMfaAction,
  requestEmailChangeAction,
  signOutOtherSessionsAction,
  updateProfileAction,
} from "@/app/actions/account";

type Res = { ok: boolean; error?: string };

function useResult() {
  const e = useTranslations("errors");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const show = (r: Res, success: string) => setMsg(r.ok ? { tone: "success", text: success } : { tone: "error", text: e.has(r.error ?? "") ? e(r.error!) : e("server") });
  return { msg, show, clear: () => setMsg(null) };
}

export function ProfileForm({ initial }: { initial: { displayName: string; locale: string; notifyEmailMessages: boolean; notifyEmailOrders: boolean; readReceipts: boolean } }) {
  const t = useTranslations("account.profile");
  const c = useTranslations("common");
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const { msg, show } = useResult();
  return (
    <form
      className="space-y-6"
      onSubmit={(ev) => {
        ev.preventDefault();
        start(async () => {
          show(await updateProfileAction(v as Parameters<typeof updateProfileAction>[0]), c("saved"));
          router.refresh();
        });
      }}
    >
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Field label={t("displayName")} value={v.displayName} onChange={(e) => setV({ ...v, displayName: e.target.value })} maxLength={40} required />
      <Select label={t("language")} value={v.locale} onChange={(e) => setV({ ...v, locale: e.target.value })}>
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </Select>
      <fieldset className="space-y-3">
        <legend className="eyebrow mb-3 text-taupe-700">{t("notifications")}</legend>
        <Checkbox label={t("notifyMessages")} checked={v.notifyEmailMessages} onChange={(e) => setV({ ...v, notifyEmailMessages: e.target.checked })} />
        <Checkbox label={t("notifyOrders")} checked={v.notifyEmailOrders} onChange={(e) => setV({ ...v, notifyEmailOrders: e.target.checked })} />
        <Checkbox label={t("readReceipts")} checked={v.readReceipts} onChange={(e) => setV({ ...v, readReceipts: e.target.checked })} />
      </fieldset>
      <Button type="submit" loading={pending}>
        {c("save")}
      </Button>
    </form>
  );
}

export function EmailChangeForm() {
  const t = useTranslations("account.profile");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();
  const { msg, show } = useResult();
  return (
    <form
      className="space-y-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        start(async () => show(await requestEmailChangeAction(email, password), t("emailSent")));
      }}
    >
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Field label={t("newEmail")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      <Field label={t("currentPassword")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      <Button type="submit" variant="secondary" loading={pending}>
        {t("changeEmail")}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const t = useTranslations("account.profile");
  const e = useTranslations("errors");
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [pending, start] = useTransition();
  const { msg, show } = useResult();
  return (
    <form
      className="space-y-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (v.next !== v.confirm) return show({ ok: false, error: "password_mismatch" }, "");
        start(async () => {
          const r = await changePasswordAction(v.current, v.next);
          show(r, t("passwordChanged"));
          if (r.ok) setV({ current: "", next: "", confirm: "" });
        });
      }}
    >
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Field label={t("currentPassword")} type="password" value={v.current} onChange={(x) => setV({ ...v, current: x.target.value })} required autoComplete="current-password" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("newPassword")} type="password" value={v.next} onChange={(x) => setV({ ...v, next: x.target.value })} required minLength={10} autoComplete="new-password" hint={e("weak_password")} />
        <Field label={t("confirmPassword")} type="password" value={v.confirm} onChange={(x) => setV({ ...v, confirm: x.target.value })} required autoComplete="new-password" />
      </div>
      <Button type="submit" variant="secondary" loading={pending}>
        {t("changePassword")}
      </Button>
    </form>
  );
}

export function MfaPanel({ enabled }: { enabled: boolean }) {
  const t = useTranslations("account.security");
  const router = useRouter();
  const [setup, setSetup] = useState<{ qr: string; uri: string; pending: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();
  const { msg, show } = useResult();

  if (enabled)
    return (
      <div className="space-y-4">
        <Notice tone="success">{t("mfaOn")}</Notice>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            start(async () => {
              show(await disableMfaAction(password), t("mfaDisabled"));
              router.refresh();
            });
          }}
        >
          <Field label={t("password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="min-w-60 flex-1" />
          <Button type="submit" variant="danger" loading={pending}>
            {t("disableMfa")}
          </Button>
        </form>
      </div>
    );

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-taupe-700">{t("mfaIntro")}</p>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {!setup ? (
        <Button
          variant="secondary"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await beginMfaSetupAction();
              if (r.ok) setSetup(r.data);
            })
          }
        >
          {t("enableMfa")}
        </Button>
      ) : (
        <form
          className="space-y-4 border border-champagne/60 bg-ivory-50 p-6"
          onSubmit={(ev) => {
            ev.preventDefault();
            start(async () => {
              const r = await confirmMfaSetupAction(setup.pending, code);
              show(r, t("mfaEnabled"));
              if (r.ok) {
                setSetup(null);
                router.refresh();
              }
            });
          }}
        >
          <p className="text-sm text-charcoal">{t("scan")}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt={t("qrAlt")} width={200} height={200} />
          <details className="text-xs text-taupe-700">
            <summary className="cursor-pointer">{t("manualKey")}</summary>
            <code className="mt-2 block break-all">{setup.uri}</code>
          </details>
          <Field label={t("code")} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={7} required />
          <Button type="submit" loading={pending}>
            {t("confirmMfa")}
          </Button>
        </form>
      )}
    </div>
  );
}

export function SessionsPanel({ sessions }: { sessions: { id: string; current: boolean; agent: string; created: string }[] }) {
  const t = useTranslations("account.security");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-champagne/50 border-y border-champagne/50 text-sm">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap justify-between gap-2 py-3">
            <span className="max-w-md truncate text-charcoal">{s.agent || t("unknownDevice")}</span>
            <span className="text-xs text-taupe-700">
              {s.created}
              {s.current && ` · ${t("thisDevice")}`}
            </span>
          </li>
        ))}
      </ul>
      {sessions.length > 1 && (
        <Button
          variant="secondary"
          size="sm"
          loading={pending}
          onClick={() =>
            start(async () => {
              await signOutOtherSessionsAction();
              router.refresh();
            })
          }
        >
          {t("signOutOthers")}
        </Button>
      )}
    </div>
  );
}

export function DeleteAccountPanel() {
  const t = useTranslations("account.security");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();
  const { msg, show } = useResult();
  return (
    <form
      className="space-y-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!window.confirm(t("deleteConfirm"))) return;
        start(async () => {
          const r = await deleteAccountAction(password);
          if (r && !r.ok) show(r, "");
        });
      }}
    >
      <p className="text-sm leading-relaxed text-taupe-700">{t("deleteIntro")}</p>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Field label={t("password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      <Button type="submit" variant="danger" loading={pending}>
        {t("deleteAccount")}
      </Button>
    </form>
  );
}
