import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePage } from "@/lib/auth/guards";
import { authorizeConversation } from "@/lib/chat";
import { ChatShell } from "@/components/chat/chat-shell";
import { ConversationView } from "@/components/chat/conversation-view";
import { ConversationPanel } from "@/components/admin/conversation-panel";

export default async function AdminConversationPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const admin = await requirePage(locale, "admin", `/admin/messages/${id}`);
  let conversation;
  try {
    conversation = await authorizeConversation(admin, id);
  } catch {
    notFound();
  }
  return (
    <ChatShell role="admin" basePath="/admin/messages" activeId={id} topOffset="pt-14 lg:pt-0" aside={<ConversationPanel conversationId={conversation.id} locale={locale} />}>
      <ConversationView id={id} role="admin" basePath="/admin/messages" />
    </ChatShell>
  );
}
