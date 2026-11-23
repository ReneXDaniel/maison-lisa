import clsx from "clsx";
import type { ReactNode } from "react";

export function AdminPage({ title, eyebrow, actions, children }: { title: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-5 pb-20 pt-8 sm:px-8 lg:px-12 lg:pt-12">
      <header className="mb-10 flex flex-col gap-4 border-b border-champagne/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && <p className="eyebrow text-taupe-700">{eyebrow}</p>}
          <h1 className="mt-2 text-4xl text-espresso sm:text-5xl">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

/** KPI tile: label, hero value, optional context line. */
export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="border border-champagne/50 bg-ivory-50 p-5">
      <p className="eyebrow text-taupe-700">{label}</p>
      <p className="font-display mt-3 text-4xl leading-none text-espresso">{value}</p>
      {sub && <p className="mt-2 text-xs text-taupe-700">{sub}</p>}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={clsx("border border-champagne/50 bg-ivory-50", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-champagne/40 px-5 py-4">
          <h2 className="font-display text-2xl text-espresso">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-champagne/50 bg-ivory-50">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-champagne/50 text-[10px] uppercase tracking-[0.16em] text-taupe-700">
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-champagne/30">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={clsx("px-4 py-3 align-middle", className)}>{children}</td>;
