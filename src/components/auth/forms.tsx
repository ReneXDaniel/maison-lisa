"use client";
import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/misc";
import { locales, localeNames } from "@/i18n/routing";
import {
  forgotPasswordAction,
  loginAction,
  mfaAction,
  registerAction,
  resendVerificationAction,
  resetPasswordAction,
  type FormState,
} from "@/app/actions/auth";

function useErr() {
  const t = useTranslations("errors");
  return (code?: string) => (code ? (t.has(code) ? t(code) : t("invalid")) : null);
}

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const t = useTranslations("auth.login");
  const err = useErr();
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-6" noValidate>
      {notice && <Notice tone="success">{notice}</Notice>}
      {state?.error && <Notice tone="error">{err(state.error)}</Notice>}
      <input type="hidden" name="next" value={next} />
      <Field label={t("email")} name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
      <Field label={t("password")} name="password" type="password" autoComplete="current-password" required />
      <div className="flex items-center justify-between gap-4">
        <Link href="/auth/forgot" className="link-underline text-sm text-taupe-700">
          {t("forgot")}
        </Link>
      </div>
      <Button type="submit" loading={pending} className="w-full" size="lg">
        {t("submit")}
      </Button>
      <p className="border-t border-champagne/50 pt-6 text-center text-sm text-taupe-700">
        {t("noAccount")}{" "}
        <Link href={{ pathname: "/auth/register", query: { next } }} className="font-semibold text-espresso link-underline">
          {t("createAccount")}
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const t = useTranslations("auth.register");
  const err = useErr();
  const locale = useLocale();
  const [state, action, pending] = useActionState<FormState, FormData>(registerAction, null);
  const f = state?.fields ?? {};
  return (
    <form action={action} className="space-y-6" noValidate>
      {state?.error && state.error !== "invalid" && <Notice tone="error">{err(state.error)}</Notice>}
      <input type="hidden" name="next" value={next} />
      <Field label={t("displayName")} name="displayName" autoComplete="nickname" required maxLength={40} hint={t("displayNameHint")} error={err(f.displayName)} defaultValue={state?.values?.displayName} />
      <Field label={t("email")} name="email" type="email" autoComplete="email" required error={err(f.email)} defaultValue={state?.values?.email} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label={t("password")} name="password" type="password" autoComplete="new-password" required minLength={10} hint={t("passwordHint")} error={err(f.password)} />
        <Field label={t("confirm")} name="confirm" type="password" autoComplete="new-password" required error={err(f.confirm)} />
      </div>
      <Select label={t("preferredLanguage")} name="preferredLocale" defaultValue={locale}>
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </Select>
      <div className="space-y-4 border-t border-champagne/50 pt-6">
        <Checkbox name="notifyMessages" defaultChecked label={t("notifyMessages")} />
        <Checkbox
          name="terms"
          required
          error={err(f.terms)}
          label={t.rich("terms", {
            terms: (c) => (
              <Link href="/legal/terms" target="_blank" className="underline">
                {c}
              </Link>
            ),
            privacy: (c) => (
              <Link href="/legal/privacy" target="_blank" className="underline">
                {c}
              </Link>
            ),
          })}
        />
        <Checkbox name="adult" required error={f.adult ? t("adultRequired") : null} label={t("adult")} />
      </div>
      <Button type="submit" loading={pending} className="w-full" size="lg">
        {t("submit")}
      </Button>
      <p className="text-center text-sm text-taupe-700">
        {t("haveAccount")}{" "}
        <Link href={{ pathname: "/auth/login", query: { next } }} className="font-semibold text-espresso link-underline">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}

export function ResendForm({ next }: { next: string }) {
  const t = useTranslations("auth.verifyEmail");
  const err = useErr();
  const [state, action, pending] = useActionState<FormState, FormData>(resendVerificationAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state?.notice === "sent" && <Notice tone="success">{t("sent")}</Notice>}
      {state?.error && <Notice tone="error">{err(state.error)}</Notice>}
      <Button type="submit" variant="secondary" loading={pending}>
        {t("resend")}
      </Button>
    </form>
  );
}

export function ForgotForm() {
  const t = useTranslations("auth.forgot");
  const err = useErr();
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, null);
  if (state?.notice === "sent") return <Notice tone="success">{t("sent")}</Notice>;
  return (
    <form action={action} className="space-y-6" noValidate>
      {state?.error && <Notice tone="error">{err(state.error)}</Notice>}
      <Field label={t("email")} name="email" type="email" autoComplete="email" required />
      <Button type="submit" loading={pending} className="w-full" size="lg">
        {t("submit")}
      </Button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const t = useTranslations("auth.reset");
  const err = useErr();
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, null);
  return (
    <form action={action} className="space-y-6" noValidate>
      {state?.error && <Notice tone="error">{err(state.error)}</Notice>}
      <input type="hidden" name="token" value={token} />
      <Field label={t("password")} name="password" type="password" autoComplete="new-password" required minLength={10} error={err(state?.fields?.password)} />
      <Field label={t("confirm")} name="confirm" type="password" autoComplete="new-password" required error={err(state?.fields?.confirm)} />
      <Button type="submit" loading={pending} className="w-full" size="lg">
        {t("submit")}
      </Button>
    </form>
  );
}

export function MfaForm({ next }: { next: string }) {
  const t = useTranslations("auth.mfa");
  const err = useErr();
  const [state, action, pending] = useActionState<FormState, FormData>(mfaAction, null);
  return (
    <form action={action} className="space-y-6">
      {state?.error && <Notice tone="error">{err(state.error)}</Notice>}
      <input type="hidden" name="next" value={next} />
      <Field label={t("code")} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} required autoFocus />
      <Button type="submit" loading={pending} className="w-full" size="lg">
        {t("submit")}
      </Button>
    </form>
  );
}
