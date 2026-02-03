import type { HanziWord } from "@/data/model";
import type { PropsWithChildren } from "react";
import { createContext, useState } from "react";

export interface HanziWordHintContextValue {
  /**
   * Get the currently selected hint for a hanziword.
   * Returns undefined if no hint has been set.
   */
  getHint: (hanziWord: HanziWord) => string | undefined;

  /**
   * Set a hint for a hanziword.
   */
  setHint: (hanziWord: HanziWord, hint: string) => void;

  /**
   * Clear the hint for a hanziword, removing any custom selection.
   */
  clearHint: (hanziWord: HanziWord) => void;
}

const Context = createContext<HanziWordHintContextValue | null>(null);

/**
 * Provides in-memory storage for user-selected hints per HanziWord.
 * This is a prototype implementation that does not persist across sessions.
 */
export const HanziWordHintProvider = Object.assign(
  function HanziWordHintProvider({ children }: PropsWithChildren) {
    "use memo"; // Object.assign(…) wrapped components aren't inferred.

    const [hints, setHints] = useState<Map<HanziWord, string>>(() => new Map());

    const getHint = (hanziWord: HanziWord): string | undefined => {
      return hints.get(hanziWord);
    };

    const setHint = (hanziWord: HanziWord, hint: string): void => {
      setHints((prev) => {
        const next = new Map(prev);
        next.set(hanziWord, hint);
        return next;
      });
    };

    const clearHint = (hanziWord: HanziWord): void => {
      setHints((prev) => {
        const next = new Map(prev);
        next.delete(hanziWord);
        return next;
      });
    };

    return (
      <Context.Provider value={{ getHint, setHint, clearHint }}>
        {children}
      </Context.Provider>
    );
  },
  { Context },
);
