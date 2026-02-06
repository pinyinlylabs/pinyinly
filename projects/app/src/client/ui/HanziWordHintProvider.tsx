import { useReplicache } from "@/client/hooks/useReplicache";
import { useRizzleQuery } from "@/client/hooks/useRizzleQuery";
import type { HanziWord } from "@/data/model";
import type { v10 } from "@/data/rizzleSchema";
import { nanoid } from "@/util/nanoid";
import type { RizzleReplicache } from "@/util/rizzle";
import type { PropsWithChildren } from "react";
import { createContext, useState } from "react";

export interface CustomHint {
  customHintId: string;
  hint: string;
  explanation?: string;
  assetIds?: readonly string[];
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
   * Add a new custom hint for a hanziword.
   */
  addCustomHint: (
    hanziWord: HanziWord,
    hint: string,
    explanation?: string,
    assetIds?: string[],
  ) => Promise<void>;

  /**
   * Update an existing custom hint.
   */
  updateCustomHint: (
    customHintId: string,
    hanziWord: HanziWord,
    hint: string,
    explanation?: string,
    assetIds?: string[],
  ) => Promise<void>;

  /**
   * Remove a custom hint.
   */
  removeCustomHint: (
    customHintId: string,
    hanziWord: HanziWord,
  ) => Promise<void>;
}

const Context = createContext<HanziWordHintContextValue | null>(null);

/**
 * Provides hint management with persistence via Replicache.
 * Custom hints are stored in the database and synced across devices.
 *
 * Use the `useCustomHints(hanziWord)` hook to query custom hints for a word.
 */
type RizzleV10 = RizzleReplicache<typeof v10>;

export const HanziWordHintProvider = Object.assign(
  function HanziWordHintProvider({ children }: PropsWithChildren) {
    "use memo"; // Object.assign(…) wrapped components aren't inferred.
    const rep = useReplicache() as RizzleV10;
    const [hints, setHints] = useState<Map<HanziWord, string>>(() => new Map());

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

    const addCustomHint = async (
      hanziWord: HanziWord,
      hint: string,
      explanation?: string,
      assetIds?: string[],
    ): Promise<void> => {
      const customHintId = nanoid();
      await rep.mutate.createCustomHint({
        customHintId,
        hanziWord,
        hint,
        explanation: explanation ?? null,
        assetIds: assetIds ?? null,
        now: new Date(),
      });
    };

    const updateCustomHint = async (
      customHintId: string,
      hanziWord: HanziWord,
      hint: string,
      explanation?: string,
      assetIds?: string[],
    ): Promise<void> => {
      await rep.mutate.updateCustomHint({
        customHintId,
        hanziWord,
        hint,
        explanation: explanation ?? null,
        assetIds: assetIds ?? null,
        now: new Date(),
      });
    };

    const removeCustomHint = async (
      customHintId: string,
      hanziWord: HanziWord,
    ): Promise<void> => {
      await rep.mutate.deleteCustomHint({
        customHintId,
        hanziWord,
      });
    };

    return (
      <Context.Provider
        value={{
          getHint,
          setHint,
          clearHint,
          addCustomHint,
          updateCustomHint,
          removeCustomHint,
        }}
      >
        {children}
      </Context.Provider>
    );
  },
  {
    Context,
  },
);

/**
 * Hook to query custom hints for a specific HanziWord.
 * Queries Replicache and returns an array of custom hints.
 */
// oxlint-disable typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-call, typescript-eslint/no-unsafe-member-access, typescript-eslint/no-unsafe-return
export function useCustomHints(hanziWord: HanziWord): CustomHint[] {
  const result = useRizzleQuery<CustomHint[]>(
    [`customHints`, hanziWord],
    async (r, tx) => {
      const r10 = r as RizzleV10;
      const customHintQuery = r10.query.customHint;
      const entries = await customHintQuery
        .scan(tx, { hanziWord })

        .toArray();

      return entries.map(([, value]) => ({
        customHintId: value.customHintId,
        hint: value.hint,
        explanation: value.explanation ?? undefined,
        assetIds: value.assetIds ?? undefined,
      }));
    },
  );

  return result.data ?? [];
}
// oxlint-enable typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-call, typescript-eslint/no-unsafe-member-access, typescript-eslint/no-unsafe-return
