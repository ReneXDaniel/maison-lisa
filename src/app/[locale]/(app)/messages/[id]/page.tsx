import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requirePage } from "@/lib/auth/guards";
import { authorizeConversation } from "@/lib/chat";
import { ChatShell } from "@/components/chat/chat-shell";
import { ConversationView } from "@/components/chat/conversation-view";
import { getSetting } from "@/lib/settings";

export default async function ConversationPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requirePage(locale, "adult", `/messages/${id}`);
  try {
    await authorizeConversation(user, id);
  } catch {
    notFound();
  }
  return (
    <ChatShell role="customer" basePath="/messages" activeId={id}>
      <ConversationView id={id} role="customer" basePath="/messages" maxMb={await getSetting("maxAttachmentMb")} />
    </ChatShell>
  );
}
