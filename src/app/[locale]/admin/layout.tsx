import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { requirePage } from "@/lib/auth/guards";
import { AdminNav } from "@/components/admin/admin-nav";
import { RealtimeClient } from "@/components/providers/realtime-client";
import { unreadConversations, unreadNotifications } from "@/lib/counts";
import { CLIENT_NAMESPACES } from "@/i18n/messages";
import { pick } from "@/lib/deep-merge";

export const metadata = { robots: { index: false, follow: false } };

/** Creator administration. Non-admins receive a 404 — the area is never revealed. */
export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePage(locale, "admin", "/admin");
  const [messages, unreadMessages, unreadNotifs] = await Promise.all([getMessages(), unreadConversations(user), unreadNotifications(user.id)]);
  return (
    <NextIntlClientProvider messages={pick(messages, [...CLIENT_NAMESPACES, "admin"])}>
      <div className="min-h-dvh bg-ivory-100 lg:flex">
        <AdminNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <RealtimeClient initial={{ cartCount: 0, unreadMessages, unreadNotifications: unreadNotifs }} />
    </NextIntlClientProvider>
  );
}
