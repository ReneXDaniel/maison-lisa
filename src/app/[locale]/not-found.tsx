import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { brand } from "@/config/brand";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ivory-100 px-6 text-center">
      <p className="font-display text-2xl tracking-[0.4em] text-espresso">{brand.name}</p>
      <div className="hairline my-10 w-32" />
      <h1 className="text-5xl text-espresso">{t("notFoundTitle")}</h1>
      <p className="mt-4 max-w-md text-taupe-700">{t("notFoundBody")}</p>
      <ButtonLink href="/" className="mt-10">{t("backHome")}</ButtonLink>
    </div>
  );
}
