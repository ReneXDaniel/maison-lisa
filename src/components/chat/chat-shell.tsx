import clsx from "clsx";
import type { ReactNode } from "react";
import { ConversationList } from "./conversation-list";

/**
 * Desktop: conversation sidebar + main panel. Mobile: the list and the
 * conversation are separate screens; an open conversation is full-screen.
 */
export function ChatShell({ role, activeId, basePath, children, placeholder, aside, topOffset = "pt-16 lg:pt-20" }: { role: "customer" | "admin"; activeId?: string; basePath: string; children?: ReactNode; placeholder?: ReactNode; aside?: ReactNode; topOffset?: string }) {
  const showingConversation = !!children;
  return (
    <div className={clsx("h-dvh", topOffset)}>
      <div className={clsx("mx-auto grid h-full max-w-[1440px] border-champagne/50 lg:border-x", aside ? "lg:grid-cols-[340px_minmax(0,1fr)_340px]" : "lg:grid-cols-[360px_minmax(0,1fr)]")}>
        <aside className={clsx("min-h-0 border-champagne/50 bg-ivory-50 lg:border-r", showingConversation && "hidden lg:block")}>
          <ConversationList role={role} activeId={activeId} basePath={basePath} />
        </aside>
        <section className={clsx("min-h-0", !showingConversation && "hidden lg:block")}>{children ?? placeholder}</section>
        {aside && <aside className="hidden min-h-0 overflow-y-auto border-l border-champagne/50 bg-ivory-50 lg:block">{aside}</aside>}
      </div>
    </div>
  );
}
