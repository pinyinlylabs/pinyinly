// @vitest-environment happy-dom

import { DbProvider } from "#client/ui/DbProvider.tsx";
import { useNewQueryClient } from "#client/ui/hooks/useNewQueryClient.js";
import { useSkillQueue } from "#client/ui/hooks/useSkillQueue.ts";
import { RizzleProvider } from "#client/ui/RizzleProvider.tsx";
import { SkillQueueProvider } from "#client/ui/SkillQueueProvider.tsx";
import { QuestionFlagKind } from "#data/model.js";
import type { Rizzle } from "#data/rizzleSchema.ts";
import { prettyQueue } from "#test/data/helpers.ts";
import { rizzleFixture } from "#test/util/rizzleHelpers.ts";
import { sleep } from "#util/devtools.js";
import { invariant } from "@pinyinly/lib/invariant";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { act } from "react";
import { afterEach, test as baseTest, expect, vi } from "vitest";

const test = baseTest.extend(rizzleFixture);

afterEach(() => {
  vi.resetAllMocks();
});

test(`throws when used outside of SkillQueueProvider`, () => {
  expect(() => renderHook(useSkillQueue)).toThrow(
    `useSkillQueue must be used within a SkillQueueProvider`,
  );
});

const testContextProviders = (opts: { rizzle: Rizzle }) =>
  function TestWrapper({ children }: PropsWithChildren) {
    const queryClient = useNewQueryClient();

    return (
      <QueryClientProvider client={queryClient}>
        <RizzleProvider.Context.Provider value={opts.rizzle}>
          <DbProvider>
            <SkillQueueProvider>{children}</SkillQueueProvider>
          </DbProvider>
        </RizzleProvider.Context.Provider>
      </QueryClientProvider>
    );
  };

test(`returns loading state from context`, async ({ rizzle }) => {
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

test(`new users are taught the simplest words first`, async ({ rizzle }) => {
  // Increase the number of queue items to 10 so we can check more than one.
  vi.spyOn(SkillQueueProvider.mockable, `getMaxQueueItems`).mockReturnValue(
    Infinity,
  );

  const { result, unmount } = renderHook(useSkillQueue, {
    wrapper: testContextProviders({ rizzle }),
  });

  // Wait a little bit so to skip past initial "loading false" state.
  await act(async () => sleep(5));
  await waitFor(
    () => {
      expect(result.current.loading).toBe(false);
    },
    { timeout: 5000 },
  );

  invariant(!result.current.loading, `expected skill queue to be loaded`);

  const queue = result.current.reviewQueue;
  expect(prettyQueue(queue).slice(0, 10)).toMatchInlineSnapshot(`
    [
      "he:人:person (🌱 NEW SKILL)",
      "he:一:one (🌱 NEW SKILL)",
      "he:口:mouth (🌱 NEW SKILL)",
      "he:八:eight (🌱 NEW SKILL)",
      "he:乙:second (🌱 NEW SKILL)",
      "he:又:again (🌱 NEW SKILL)",
      "he:冖:cover (🌱 NEW SKILL)",
      "he:厂:cliff (🌱 NEW SKILL)",
      "he:凵:box (🌱 NEW SKILL)",
      "he:亻:person (🌱 NEW SKILL)",
    ]
  `);

  const blockedQueue = {
    items: queue.items.filter(
      ({ flag }) => flag?.kind === QuestionFlagKind.Blocked,
    ),
  };

  expect(prettyQueue(blockedQueue).slice(0, 10)).toMatchInlineSnapshot(`
    [
      "he:𠂇:hand (🟥 BLOCKED)",
      "he:𠂉:knife (🟥 BLOCKED)",
      "he:𭕄:radical (🟥 BLOCKED)",
      "he:𠂊:hands (🟥 BLOCKED)",
      "he:亅:hook (🟥 BLOCKED)",
      "he:𠃌:radical (🟥 BLOCKED)",
      "he:丶:dot (🟥 BLOCKED)",
      "he:丿:slash (🟥 BLOCKED)",
      "he:乚:hidden (🟥 BLOCKED)",
      "he:丨:line (🟥 BLOCKED)",
    ]
  `);

  unmount();
});
