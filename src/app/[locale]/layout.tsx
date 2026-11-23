import "../globals.css";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing, localeTags, type Locale } from "@/i18n/routing";
import { CLIENT_NAMESPACES } from "@/i18n/messages";
import { pick } from "@/lib/deep-merge";
import { getCurrentUser } from "@/lib/auth/session";
import { SessionProvider, type ClientUser } from "@/components/providers/session-provider";
import { Toaster } from "@/components/providers/toaster";
import { brand } from "@/config/brand";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    applicationName: brand.name,
    ...pageMetadata({ locale, path: "/", tagline: t("meta.title"), description: t("hero.support") }),
    icons: { icon: "/favicon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#2C1F18",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [messages, user] = await Promise.all([getMessages(), getCurrentUser()]);
  const clientUser: ClientUser | null = user
    ? {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
        isAdultVerified: user.isAdultVerified,
        ageStatus: user.ageStatus,
      }
    : null;

  return (
    <html lang={localeTags[locale as Locale]} className="scroll-smooth">
      <body className="min-h-dvh">
        <NextIntlClientProvider messages={pick(messages, CLIENT_NAMESPACES)}>
          <SessionProvider user={clientUser}>
            {children}
            <Toaster />
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
