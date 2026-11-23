"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { IconClose, IconTrash } from "@/components/ui/icons";
import { useUI } from "@/stores/ui";
import { applyCodeAction, removeCodeAction, removeFromCartAction } from "@/app/actions/cart";

export function RemoveItemButton({ itemId, label }: { itemId: string; label: string }) {
  const router = useRouter();
  const setCartCount = useUI((s) => s.setCartCount);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await removeFromCartAction(itemId);
          if (r.ok) setCartCount(r.data.cartCount);
          router.refresh();
        })
      }
      className="eyebrow flex items-center gap-1.5 text-taupe-700 transition hover:text-danger disabled:opacity-50"
      data-testid="remove-item"
    >
      <IconTrash size={14} />
      {label}
    </button>
  );
}

export function DiscountCodeForm({ applied, error }: { applied: string | null; error: { code: string; values: Record<string, string> } | null }) {
  const t = useTranslations("cart");
  const e = useTranslations("errors");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const showError = msg ?? (error ? (e.has(error.code) ? e(error.code, error.values) : e("discount_invalid")) : null);

  if (applied)
    return (
      <div className="flex items-center justify-between gap-3 border border-dashed border-champagne-400 bg-ivory-50 px-4 py-3" data-testid="code-applied">
        <span className="text-sm">
          <span className="eyebrow text-taupe-700">{t("codeApplied")}</span> <span className="ml-1 font-semibold tracking-[0.12em] text-espresso">{applied}</span>
        </span>
        <button
          onClick={() =>
            start(async () => {
              await removeCodeAction();
              router.refresh();
            })
          }
          aria-label={t("removeCode")}
          className="text-taupe-700 hover:text-espresso"
        >
          <IconClose size={16} />
        </button>
      </div>
    );

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!code.trim()) return;
        start(async () => {
          const r = await applyCodeAction(code);
          if (!r.ok) setMsg(e.has(r.error) ? e(r.error, r.fields ?? {}) : e("discount_invalid"));
          else {
            setMsg(null);
            setCode("");
          }
          router.refresh();
        });
      }}
      className="space-y-2"
    >
      <label htmlFor="code" className="eyebrow text-taupe-700">
        {t("codeLabel")}
      </label>
      <div className="flex gap-2">
        <input
          id="code"
          value={code}
          onChange={(ev) => setCode(ev.target.value.toUpperCase())}
          placeholder={t("codePlaceholder")}
          autoComplete="off"
          className="h-11 min-w-0 flex-1 border border-taupe/40 bg-ivory-50 px-3 text-sm uppercase tracking-[0.12em] outline-none focus:border-espresso"
          data-testid="code-input"
        />
        <Button type="submit" variant="secondary" size="sm" className="h-11" loading={pending} data-testid="code-apply">
          {t("applyCode")}
        </Button>
      </div>
      {showError && (
        <p role="alert" className="text-xs text-danger" data-testid="code-error">
          {showError}
        </p>
      )}
    </form>
  );
}
