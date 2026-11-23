"use client";
import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";
import { IconShield } from "@/components/ui/icons";
import { startVerificationAction } from "@/app/actions/verification";

export function StartVerificationForm({ next, label }: { next: string; label: string }) {
  const e = useTranslations("errors");
  const [state, action, pending] = useActionState(startVerificationAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state?.error && <Notice tone="error">{e.has(state.error) ? e(state.error) : e("server")}</Notice>}
      <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto" data-testid="start-verification">
        <IconShield size={16} />
        {label}
      </Button>
    </form>
  );
}

/** Polls for the provider decision after the customer returns from the hosted flow. */
export function VerificationReturn({ next, initial }: { next: string; initial: string }) {
  const t = useTranslations("verify");
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (status !== "pending" || tries > 40) return;
    const id = setTimeout(async () => {
      const r = await fetch("/api/me/verification", { cache: "no-store" });
      if (r.ok) setStatus(((await r.json()) as { status: string }).status);
      setTries((n) => n + 1);
    }, 1500);
    return () => clearTimeout(id);
  }, [status, tries]);

  useEffect(() => {
    if (status === "verified") router.refresh();
  }, [status, router]);

  return (
    <div className="space-y-8" data-testid="verification-status" data-status={status}>
      <div className="border border-champagne/60 bg-ivory-50 p-7">
        <p className="eyebrow text-taupe-700">{t("statusLabel")}</p>
        <p className="font-display mt-3 text-3xl text-espresso">{t(`status.${status}.title`)}</p>
        <p className="mt-3 text-sm leading-relaxed text-taupe-700">{t(`status.${status}.body`)}</p>
        {status === "pending" && (
          <div className="mt-5 flex items-center gap-3 text-sm text-taupe-700">
            <span className="size-3 animate-spin rounded-full border border-espresso border-t-transparent" />
            {t("checking")}
          </div>
        )}
      </div>
      {status === "verified" && (
        <ButtonLink href={next} size="lg" data-testid="verification-continue">
          {t("continue")}
        </ButtonLink>
      )}
      {(status === "failed" || status === "not_verified" || status === "expired") && (
        <ButtonLink href={{ pathname: "/verify", query: { next } }} variant="secondary">
          {t("retry")}
        </ButtonLink>
      )}
    </div>
  );
}
