import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartCount } from "@/lib/cart";
import { unreadConversations, unreadNotifications } from "@/lib/counts";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AgeNotice } from "@/components/layout/age-notice";
import { AGE_NOTICE_COOKIE } from "@/lib/constants";
import { CountsInit, RealtimeClient } from "@/components/providers/realtime-client";
import { DevBanner } from "@/components/layout/dev-banner";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const [cartCount, unreadMessages, unreadNotifs, jar] = await Promise.all([
    getCartCount(user),
    user ? unreadConversations(user) : 0,
    user ? unreadNotifications(user.id) : 0,
    cookies(),
  ]);

  return (
    <>
      <DevBanner />
      <Header />
      <main id="main" className="min-h-[70vh]">
        {children}
      </main>
      <Footer />
      <AgeNotice acknowledged={jar.get(AGE_NOTICE_COOKIE)?.value === "1"} />
      {user ? <RealtimeClient initial={{ cartCount, unreadMessages, unreadNotifications: unreadNotifs }} /> : <CountsInit cartCount={cartCount} />}
    </>
  );
}
