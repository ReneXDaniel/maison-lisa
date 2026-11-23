"use client";
import { createContext, useContext, type ReactNode } from "react";

/** Non-sensitive view of the signed-in user for UI hints. Authorization is always enforced server-side. */
export type ClientUser = {
  id: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
  emailVerified: boolean;
  isAdultVerified: boolean;
  ageStatus: string;
};

const Ctx = createContext<ClientUser | null>(null);

export function SessionProvider({ user, children }: { user: ClientUser | null; children: ReactNode }) {
  return <Ctx.Provider value={user}>{children}</Ctx.Provider>;
}

export const useSessionUser = () => useContext(Ctx);
