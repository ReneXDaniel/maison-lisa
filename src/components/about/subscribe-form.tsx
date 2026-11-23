"use client";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { Notice } from "@/components/ui/misc";
import { subscribeAction } from "@/app/actions/subscribe";

export function SubscribeForm() {
  const t = useTranslations("nextChapter");
  const e = useTranslations("errors");
  const [state, action, pending] = useActionState(subscribeAction, null);
  if (state?.ok) return <Notice tone="success">{t("subscribed")}</Notice>;
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Notice tone="error">{e(state.error)}</Notice>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="sub-email" className="sr-only">{t("email")}</label>
        <input id="sub-email" name="email" type="email" required placeholder={t("email")} autoComplete="email" className="h-12 flex-1 border border-champagne/50 bg-transparent px-4 text-ivory-50 outline-none placeholder:text-champagne-200/60 focus:border-champagne" />
        <Button type="submit" variant="champagne" loading={pending}>{t("subscribe")}</Button>
      </div>
      <Checkbox name="consent" required label={<span className="text-champagne-200">{t("consent")}</span>} />
    </form>
  );
}
