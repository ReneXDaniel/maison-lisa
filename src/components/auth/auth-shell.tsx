import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { brand } from "@/config/brand";

/** Split-screen editorial frame for authentication and verification screens. */
export async function AuthShell({ title, subtitle, children, aside }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode; aside?: "benefits" | "verification" }) {
  const t = await getTranslations("auth.shell");
  const items = aside === "verification" ? (["v1", "v2", "v3"] as const) : (["b1", "b2", "b3", "b4"] as const);
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="dark-surface paper-grain relative hidden overflow-hidden bg-espresso text-ivory-50 lg:block">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(120% 80% at 20% 10%, rgb(201 178 153 / 0.35), transparent 60%), radial-gradient(90% 70% at 90% 90%, rgb(151 129 113 / 0.35), transparent 60%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-14 pt-36">
          <div>
            <p className="eyebrow text-champagne">{t(aside === "verification" ? "verificationEyebrow" : "eyebrow")}</p>
            <p className="font-display mt-6 max-w-md text-5xl leading-[1.05]">{t(aside === "verification" ? "verificationTitle" : "title")}</p>
          </div>
          <ul className="space-y-5">
            {items.map((k) => (
              <li key={k} className="flex gap-4 text-sm leading-relaxed text-champagne-200">
                <span className="mt-2 h-px w-6 shrink-0 bg-champagne" />
                {t(k, { creator: brand.creatorName })}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <section className="flex items-start justify-center px-5 pb-20 pt-32 sm:px-10 lg:items-center lg:pt-28">
        <div className="w-full max-w-md">
          <h1 className="text-4xl leading-tight text-espresso sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-4 text-[15px] leading-relaxed text-taupe-700">{subtitle}</p>}
          <div className="mt-10">{children}</div>
        </div>
      </section>
    </div>
  );
}
