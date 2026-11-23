import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChatShell } from "@/components/chat/chat-shell";

export default async function AdminMessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.messages");
  return (
    <ChatShell
      role="admin"
      basePath="/admin/messages"
      topOffset="pt-14 lg:pt-0"
      placeholder={
        <div className="flex h-full items-center justify-center px-8 text-center">
          <p className="font-display max-w-md text-4xl text-espresso">{t("select")}</p>
        </div>
      }
    />
  );
}
