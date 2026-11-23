import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePage } from "@/lib/auth/guards";
import { ChatShell } from "@/components/chat/chat-shell";
import { ButtonLink } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "chat" });
  return pageMetadata({ locale, path: "/messages", title: t("title"), noindex: true });
}

export default async function MessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "adult", "/messages");
  const t = await getTranslations("chat");
  return (
    <ChatShell
      role="customer"
      basePath="/messages"
      placeholder={
        <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
          <p className="eyebrow text-taupe-700">{t("private")}</p>
          <p className="font-display max-w-md text-4xl text-espresso">{t("selectPrompt", { creator: brand.creatorName })}</p>
          <ButtonLink href="/messages/new" data-testid="message-lisa">{t("newConversation")}</ButtonLink>
        </div>
      }
    />
  );
}
