import clsx from "clsx";
import type { ButtonHTMLAttributes, ComponentProps, Ref } from "react";
import { Link } from "@/i18n/navigation";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "champagne" | "light" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return clsx(
    "group relative inline-flex items-center justify-center gap-2.5 select-none max-w-full text-center text-balance",
    "font-sans font-semibold uppercase tracking-[0.22em] transition-all duration-500 ease-[var(--ease-luxe)]",
    "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    {
      sm: "min-h-9 px-4 py-2 text-[10px] leading-tight",
      md: "min-h-12 px-7 py-3 text-[11px] leading-tight",
      lg: "min-h-14 px-9 py-3.5 text-[12px] leading-tight",
    }[size],
    {
      primary: "bg-espresso text-ivory-50 hover:bg-espresso-700 shadow-[0_14px_30px_-18px_rgb(44_31_24/0.7)]",
      secondary: "border border-espresso/70 text-espresso hover:bg-espresso hover:text-ivory-50",
      ghost: "text-espresso hover:bg-espresso/5",
      champagne: "bg-champagne text-espresso hover:bg-champagne-200",
      light: "border border-ivory/60 text-ivory-50 hover:bg-ivory-50 hover:text-espresso",
      danger: "border border-danger/60 text-danger hover:bg-danger hover:text-ivory-50",
    }[variant],
    className,
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; ref?: Ref<HTMLButtonElement> };

export function Button({ variant, size, loading, className, children, disabled, type = "button", ...rest }: BtnProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="size-3.5 animate-spin rounded-full border border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

type LinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant, size, className, ...rest }: LinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
