import clsx from "clsx";
import type { ReactNode } from "react";

export function Container({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={clsx("mx-auto w-full px-5 sm:px-8", wide ? "max-w-[1440px]" : "max-w-6xl", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx("eyebrow text-taupe-700", className)}>{children}</p>;
}

export function PageHeader({ eyebrow, title, intro, className }: { eyebrow?: ReactNode; title: ReactNode; intro?: ReactNode; className?: string }) {
  return (
    <header className={clsx("mx-auto max-w-3xl pb-10 pt-32 text-center sm:pt-40", className)}>
      {eyebrow && <Eyebrow className="mb-5">{eyebrow}</Eyebrow>}
      <h1 className="text-5xl leading-[1.02] text-espresso sm:text-6xl md:text-7xl">{title}</h1>
      {intro && <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-taupe-700">{intro}</p>}
      <div className="hairline mx-auto mt-10 w-40" />
    </header>
  );
}

type Tone = "info" | "success" | "warning" | "error" | "dev";

export function Notice({ tone = "info", title, children, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "border-l-2 px-5 py-4 text-sm leading-relaxed",
        {
          info: "border-champagne-400 bg-ivory-50 text-charcoal",
          success: "border-success bg-[#eef0e6] text-[#2f3826]",
          warning: "border-[#a07a3c] bg-[#f6eedf] text-[#4a3a1f]",
          error: "border-danger bg-[#f6e6e1] text-[#5b2219]",
          dev: "border-dashed border-[#6b5a8a] bg-[#efeaf5] text-[#352a4a]",
        }[tone],
        className,
      )}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "dark" | "champagne" | "success" | "warning" | "danger"; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
        {
          neutral: "bg-ivory-200 text-taupe-700",
          dark: "bg-espresso text-champagne",
          champagne: "bg-champagne/70 text-espresso",
          success: "bg-[#e3e7d8] text-[#3c4730]",
          warning: "bg-[#efe2c8] text-[#5a4420]",
          danger: "bg-[#f0d9d2] text-danger",
        }[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("border border-champagne/50 bg-ivory-50 shadow-card", className)}>{children}</div>;
}

export function EmptyState({ title, body, action }: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 border border-dashed border-champagne px-6 py-16 text-center">
      <p className="font-display text-3xl text-espresso">{title}</p>
      {body && <p className="max-w-md text-sm text-taupe-700">{body}</p>}
      {action}
    </div>
  );
}

/** Small visible label marking development-only simulated functionality. */
export function DevLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 border border-dashed border-[#6b5a8a] bg-[#efeaf5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#352a4a]">
      {children}
    </span>
  );
}
