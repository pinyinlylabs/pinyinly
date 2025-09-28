// @vitest-environment happy-dom

import { useNewQueryClient } from "#client/hooks/useNewQueryClient.js";
import { useSkillQueue } from "#client/hooks/useSkillQueue.ts";
import { DbProvider } from "#client/ui/DbProvider.tsx";
import { ReplicacheProvider } from "#client/ui/ReplicacheProvider.tsx";
import { SkillQueueProvider } from "#client/ui/SkillQueueProvider.tsx";
import { QuestionFlagKind } from "#data/model.js";
import type { Rizzle } from "#data/rizzleSchema.ts";
import { sleep } from "#util/devtools.js";
import { invariant } from "@pinyinly/lib/invariant";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { act } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { prettyQueue } from "../../data/helpers.ts";
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

rizzleTest(`returns loading state from context`, async ({ rizzle }) => {
  const { result, unmount } = renderHook(useSkillQueue, {
    wrapper: testContextProviders({ rizzle }),
  });

  expect(result.current).toEqual({ loading: true });

  await waitFor(
    () => {
      expect(result.current.loading).toBe(false);
    },
    { timeout: 5000 },
  );

  unmount();
});

rizzleTest(
  `new users are taught the simplest words first`,
  async ({ rizzle }) => {
    // Increase the number of queue items to 10 so we can check more than one.
    vi.spyOn(SkillQueueProvider.mockable, `getMaxQueueItems`).mockReturnValue(
      Infinity,
    );

    const { result, unmount } = renderHook(useSkillQueue, {
      wrapper: testContextProviders({ rizzle }),
    });

    // Wait a little bit so to skip past initial "loading false" state.
    await act(() => sleep(5));
    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 2000 },
    );

    invariant(!result.current.loading, `expected skill queue to be loaded`);

    const queue = result.current.reviewQueue;
    expect(prettyQueue(queue).slice(0, 10)).toMatchInlineSnapshot(`
      [
        "he:一:one (🌱 NEW SKILL)",
        "he:人:person (🌱 NEW SKILL)",
        "he:十:ten (🌱 NEW SKILL)",
        "he:又:again (🌱 NEW SKILL)",
        "he:八:eight (🌱 NEW SKILL)",
        "he:口:mouth (🌱 NEW SKILL)",
        "he:头:head (🌱 NEW SKILL)",
        "he:肉:meat (🌱 NEW SKILL)",
        "he:艮:stopping (🌱 NEW SKILL)",
        "he:爪:claw (🌱 NEW SKILL)",
      ]
    `);

    const blockedQueue = {
      items: queue.items.filter(
        ({ flag }) => flag?.kind === QuestionFlagKind.Blocked,
      ),
    };

    expect(prettyQueue(blockedQueue).slice(0, 5)).toMatchInlineSnapshot(`
      [
        "he:𠂇:hand (🟥 BLOCKED)",
        "he:𠂉:knife (🟥 BLOCKED)",
        "he:乚:hidden (🟥 BLOCKED)",
        "he:𠂊:hands (🟥 BLOCKED)",
        "he:𭕄:radical (🟥 BLOCKED)",
      ]
    `);

    unmount();
  },
);
