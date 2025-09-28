// @vitest-environment happy-dom

import { useNewQueryClient } from "#client/hooks/useNewQueryClient.js";
import { useSkillQueue } from "#client/hooks/useSkillQueue.ts";
import { DbProvider } from "#client/ui/DbProvider.tsx";
import { ReplicacheProvider } from "#client/ui/ReplicacheProvider.tsx";
import { SkillQueueProvider } from "#client/ui/SkillQueueProvider.tsx";
import type { Rizzle } from "#data/rizzleSchema.ts";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { rizzleTest } from "../../util/rizzleHelpers.ts";

afterEach(() => {
  vi.resetAllMocks();
});

test(`throws when used outside of SkillQueueProvider`, () => {
  expect(() => renderHook(useSkillQueue)).toThrowError(
    `useSkillQueue must be used within a SkillQueueProvider`,
  );
});

const testContextProviders = (opts: { rizzle: Rizzle }) =>
  function TestWrapper({ children }: PropsWithChildren) {
    const queryClient = useNewQueryClient();

    return (
      <QueryClientProvider client={queryClient}>
        <ReplicacheProvider.Context.Provider value={opts.rizzle}>
          <DbProvider>
            <SkillQueueProvider>{children}</SkillQueueProvider>
          </DbProvider>
        </ReplicacheProvider.Context.Provider>
      </QueryClientProvider>
    );
  };

rizzleTest(`returns loading state from context`, ({ rizzle }) => {
  const { result, unmount } = renderHook(useSkillQueue, {
    wrapper: testContextProviders({ rizzle }),
  });

  expect(result.current).toEqual({ loading: true });

  unmount();
});

rizzleTest(
  `new users are taught the simplest words first`,
  async ({ rizzle }) => {
    // Increase the number of queue items to 10 so we can check more than one.
    vi.spyOn(SkillQueueProvider.mockable, `getMaxQueueItems`).mockReturnValue(
      10,
    );

    const { result, unmount } = renderHook(useSkillQueue, {
      wrapper: testContextProviders({ rizzle }),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    if (result.current.loading) {
      throw new Error(`expected skill queue to be loaded`);
    }

    const { items, blockedItems } = result.current.reviewQueue;

    const itemSkills = items.map(({ skill }) => skill);
    expect(itemSkills).toMatchInlineSnapshot(`
      [
        "he:一:one",
        "he:人:person",
        "he:十:ten",
        "he:又:again",
        "he:八:eight",
        "he:口:mouth",
        "he:头:head",
        "he:肉:meat",
        "he:艮:stopping",
        "he:爪:claw",
      ]
    `);

    expect(blockedItems.slice(0, 5)).toEqual([
      `he:𠂇:hand`,
      `he:𠂉:knife`,
      `he:乚:hidden`,
      `he:𠂊:hands`,
      `he:𭕄:radical`,
    ]);

    unmount();
  },
);
