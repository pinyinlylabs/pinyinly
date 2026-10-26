// @vitest-environment happy-dom

import { useVisuallySimilarCharacterReferences } from "#client/ui/hooks/useVisuallySimilarCharacterReferences.ts";
import { hanziCharacterSchema } from "#data/model.ts";
import type { HanziCharacter } from "#data/model.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { expect, test, vi } from "vitest";

test(`does not fetch until a character is provided and pauses again when cleared`, async () => {
  const character = hanziCharacterSchema.parse(`好`);
  const similarCharacter = hanziCharacterSchema.parse(`子`);
  const fetch = vi
    .spyOn(globalThis, `fetch`)
    .mockResolvedValueOnce(
      Response.json({ visuallySimilar: [similarCharacter] }),
    )
    .mockResolvedValueOnce(
      Response.json({ strokes: [], medians: [`M0 0 L10 10`] }),
    );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const { result, rerender, unmount } = renderHook(
    ({ character }: { character: HanziCharacter | null }) =>
      useVisuallySimilarCharacterReferences(character),
    {
      initialProps: { character: null as HanziCharacter | null },
      wrapper: ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    },
  );

  try {
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.references).toEqual([]);

    rerender({ character });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.references).toHaveLength(1);
    });
    expect(fetch).toHaveBeenCalledTimes(2);

    rerender({ character: null });
    expect(result.current.references).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  } finally {
    unmount();
    queryClient.clear();
    fetch.mockRestore();
  }
});
