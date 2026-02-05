import type { HanziWord } from "@/data/model";
import type { PropsWithChildren } from "react";
import { createContext, useState } from "react";

export interface CustomHint {
  hint: string;
  explanation?: string;
}

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

  /**
   * Get all custom hints created by the user for a hanziword.
   */
  getCustomHints: (hanziWord: HanziWord) => CustomHint[];

  /**
   * Add a new custom hint for a hanziword.
   */
  addCustomHint: (
    hanziWord: HanziWord,
    hint: string,
    explanation?: string,
  ) => void;

  /**
   * Update an existing custom hint at the given index.
   */
  updateCustomHint: (
    hanziWord: HanziWord,
    index: number,
    hint: string,
    explanation?: string,
  ) => void;

  /**
   * Remove a custom hint at the given index.
   */
  removeCustomHint: (hanziWord: HanziWord, index: number) => void;
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
    const [customHints, setCustomHints] = useState<
      Map<HanziWord, CustomHint[]>
    >(() => new Map());

    const getHint = (hanziWord: HanziWord): string | undefined => {
      return hints.get(hanziWord);
    };

    const setHint = (hanziWord: HanziWord, hint: string): void => {
      setHints((prev) => {
        const next = new Map(prev);
        // oxlint-disable-next-line unicorn/no-immediate-mutation
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

    const getCustomHints = (hanziWord: HanziWord): CustomHint[] => {
      return customHints.get(hanziWord) ?? [];
    };

    const addCustomHint = (
      hanziWord: HanziWord,
      hint: string,
      explanation?: string,
    ): void => {
      setCustomHints((prev) => {
        const next = new Map(prev);
        const existing = next.get(hanziWord) ?? [];
        next.set(hanziWord, [...existing, { hint, explanation }]);
        return next;
      });
    };

    const updateCustomHint = (
      hanziWord: HanziWord,
      index: number,
      hint: string,
      explanation?: string,
    ): void => {
      setCustomHints((prev) => {
        const next = new Map(prev);
        const existing = next.get(hanziWord) ?? [];
        if (index >= 0 && index < existing.length) {
          const updated = [...existing];
          updated[index] = { hint, explanation };
          next.set(hanziWord, updated);
        }
        return next;
      });
    };

    const removeCustomHint = (hanziWord: HanziWord, index: number): void => {
      setCustomHints((prev) => {
        const next = new Map(prev);
        const existing = next.get(hanziWord) ?? [];
        if (index >= 0 && index < existing.length) {
          const updated = existing.filter((_, i) => i !== index);
          if (updated.length === 0) {
            next.delete(hanziWord);
          } else {
            next.set(hanziWord, updated);
          }
        }
        return next;
      });
    };

    return (
      <Context.Provider
        value={{
          getHint,
          setHint,
          clearHint,
          getCustomHints,
          addCustomHint,
          updateCustomHint,
          removeCustomHint,
        }}
      >
        {children}
      </Context.Provider>
    );
  },
  { Context },
);
