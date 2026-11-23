import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { brand } from "@/config/brand";
import { LanguageSwitcher } from "./language-switcher";

export async function Footer() {
  const t = await getTranslations("footer");
  const n = await getTranslations("nav");
  const year = new Date().getFullYear();
  const cols = [
    {
      title: t("boutique"),
      links: [
        ["/collections", n("collections")],
        ["/shop", n("shop")],
        ["/nail-studio", n("nailStudio")],
        ["/look-studio", n("lookStudio")],
        ["/quiz", n("quiz")],
        ["/next-chapter", n("nextChapter")],
      ],
    },
    {
      title: t("maison"),
      links: [
        ["/about", n("about")],
        ["/custom-requests", n("customRequests")],
        ["/messages", n("messages")],
        ["/account", n("account")],
        ["/cart", n("cart")],
      ],
    },
    {
      title: t("legal"),
      links: [
        ["/legal/imprint", t("imprint")],
        ["/legal/privacy", t("privacy")],
        ["/legal/terms", t("terms")],
        ["/legal/withdrawal", t("withdrawal")],
        ["/legal/youth-protection", t("youthProtection")],
      ],
    },
  ] as const;

  return (
    <footer className="dark-surface paper-grain bg-espresso text-ivory-100">
      <div className="mx-auto max-w-[1440px] px-5 pb-10 pt-20 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <p className="font-display text-3xl tracking-[0.38em] text-ivory-50">{brand.name}</p>
            <p className="font-display mt-4 text-2xl italic text-champagne">{t("tagline")}</p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-champagne-200/85">{t("about", { creator: brand.creatorName })}</p>
            <div className="mt-8">
              <LanguageSwitcher tone="light" align="left" />
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="eyebrow mb-5 text-champagne">{c.title}</p>
              <ul className="space-y-3">
                {c.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="link-underline text-sm text-ivory-100/90 hover:text-ivory-50">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 h-px bg-champagne/20" />
        <div className="mt-6 flex flex-col gap-3 text-xs text-champagne-200/75 md:flex-row md:items-center md:justify-between">
          <p>{t("adultsOnly")}</p>
          <p>
            © {year} {brand.name}. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
