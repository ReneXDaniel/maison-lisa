import { SiteChrome } from "@/components/layout/site-chrome";

/** Full-height application screens (private messaging) — header without footer. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome footer={false}>{children}</SiteChrome>;
}
