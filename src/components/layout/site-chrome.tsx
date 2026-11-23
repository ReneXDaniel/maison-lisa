import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { getCartCount } from "@/lib/cart";
import { unreadConversations, unreadNotifications } from "@/lib/counts";
import { Header } from "./header";
import { Footer } from "./footer";
import { AgeNotice } from "./age-notice";
import { DevBanner } from "./dev-banner";
import { CountsInit, RealtimeClient } from "@/components/providers/realtime-client";
import { AGE_NOTICE_COOKIE } from "@/lib/constants";

/** Header, footer, age notice and realtime wiring shared by all public layouts. */
export async function SiteChrome({ children, footer = true }: { children: React.ReactNode; footer?: boolean }) {
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
      <main id="main" className={footer ? "min-h-[70vh]" : undefined}>
        {children}
      </main>
      {footer && <Footer />}
      <AgeNotice acknowledged={jar.get(AGE_NOTICE_COOKIE)?.value === "1"} />
      {user ? <RealtimeClient initial={{ cartCount, unreadMessages, unreadNotifications: unreadNotifs }} /> : <CountsInit cartCount={cartCount} />}
    </>
  );
}
