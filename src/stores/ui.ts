"use client";
import { create } from "zustand";

export type Toast = { id: number; tone: "info" | "success" | "error"; title: string; body?: string; href?: string };

type UIState = {
  cartCount: number;
  unreadMessages: number;
  unreadNotifications: number;
  toasts: Toast[];
  setCartCount: (n: number) => void;
  setCounts: (c: { unreadMessages?: number; unreadNotifications?: number; cartCount?: number }) => void;
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
};

let seq = 1;

export const useUI = create<UIState>((set) => ({
  cartCount: 0,
  unreadMessages: 0,
  unreadNotifications: 0,
  toasts: [],
  setCartCount: (cartCount) => set({ cartCount }),
  setCounts: (c) => set((s) => ({ ...s, ...Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === "number")) })),
  toast: (t) => {
    const id = seq++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 6000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
