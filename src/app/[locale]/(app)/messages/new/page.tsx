import { setRequestLocale } from "next-intl/server";
import { requirePage } from "@/lib/auth/guards";
import { ChatShell } from "@/components/chat/chat-shell";
import { ConversationView } from "@/components/chat/conversation-view";
import { getSetting } from "@/lib/settings";

/** "Message Lisa" lands here. Logged-out visitors are sent through sign-in and verification, then returned. */
export default async function NewConversationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePage(locale, "adult", "/messages/new");
  return (
    <ChatShell role="customer" basePath="/messages">
      <ConversationView role="customer" basePath="/messages" maxMb={await getSetting("maxAttachmentMb")} />
    </ChatShell>
  );
}
