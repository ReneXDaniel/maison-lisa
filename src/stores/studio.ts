"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { RequestSelections } from "@/lib/catalog-options";

/**
 * Personalisation choices made anywhere on the site (Nail Studio, Look
 * Studio, quiz) live here and persist in localStorage. They survive page
 * navigation, language switches and reloads, and pre-fill the Custom Request
 * Builder automatically.
 */
type StudioState = {
  selections: RequestSelections;
  notes: string;
  quizResult: string | null;
  set: (patch: Partial<RequestSelections>) => void;
  setNotes: (notes: string) => void;
  setQuizResult: (slug: string | null) => void;
  reset: () => void;
};

export const useStudio = create<StudioState>()(
  persist(
    (set) => ({
      selections: {},
      notes: "",
      quizResult: null,
      set: (patch) => set((s) => ({ selections: { ...s.selections, ...patch } })),
      setNotes: (notes) => set({ notes: notes.slice(0, 2000) }),
      setQuizResult: (quizResult) => set({ quizResult }),
      reset: () => set({ selections: {}, notes: "" }),
    }),
    { name: "ml-studio", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
