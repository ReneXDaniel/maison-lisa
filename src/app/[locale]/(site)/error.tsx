"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 pt-24 text-center">
      <h1 className="text-5xl text-espresso">{t("errorTitle")}</h1>
      <p className="mt-4 max-w-md text-taupe-700">{t("errorBody")}</p>
      <Button className="mt-10" onClick={reset}>{t("tryAgain")}</Button>
    </div>
  );
}
