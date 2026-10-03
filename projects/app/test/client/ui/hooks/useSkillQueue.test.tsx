// @vitest-environment happy-dom

import { DbProvider } from "#client/ui/DbProvider.tsx";
import { useNewQueryClient } from "#client/ui/hooks/useNewQueryClient.js";
import { useSkillQueue } from "#client/ui/hooks/useSkillQueue.ts";
import { useStudyToggle } from "#client/ui/hooks/useStudyToggle.ts";
import { RizzleProvider } from "#client/ui/RizzleProvider.tsx";
import { SkillQueueProvider } from "#client/ui/SkillQueueProvider.tsx";
import { QuestionFlagKind } from "#data/model.js";
import type { HanziWord } from "#data/model.js";
import { hanziWordToGlossTyped, hanziWordToPinyinTyped } from "#data/skills.ts";
import type { StudyListId } from "#data/studyLists.ts";
import { studyWordItemSetting } from "#data/userSettings.ts";
import { Rating } from "#util/fsrs.ts";
import type { Rizzle } from "#data/rizzleSchema.ts";
import { prettyQueue } from "#test/data/helpers.ts";
import { rizzleFixture } from "#test/util/rizzleHelpers.ts";
import { invariant } from "@pinyinly/lib/invariant";
import { sleep } from "@pinyinly/lib/sleep";
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

const testContextProviders = (opts: { rizzle: Rizzle; listId?: StudyListId }) =>
  function TestWrapper({ children }: PropsWithChildren) {
    const queryClient = useNewQueryClient();

    return (
      <QueryClientProvider client={queryClient}>
        <RizzleProvider.Context.Provider value={opts.rizzle}>
          <DbProvider>
            <SkillQueueProvider listId={opts.listId}>
              {children}
            </SkillQueueProvider>
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

test(`Study becomes ready when empty and tracks live membership`, async ({
  rizzle,
}) => {
  const { result, unmount } = renderHook(useSkillQueue, {
    wrapper: testContextProviders({ rizzle, listId: `study` }),
  });
  await waitFor(() => {
    invariant(!result.current.loading);
    expect(result.current.reviewQueue.items).toEqual([]);
  });

  const key = studyWordItemSetting.entity.marshalKey({
    hanziWord: `你好:hello`,
  });
  await act(async () => {
    await rizzle.mutate.setSetting({
      key,
      value: studyWordItemSetting.entity.marshalValue({
        hanziWord: `你好:hello`,
        createdAt: new Date(),
      }),
      now: new Date(),
      skipHistory: false,
      historyId: undefined,
    });
  });
  await waitFor(() => {
    invariant(!result.current.loading);
    expect([...(result.current.targetSkills ?? [])]).toEqual([
      hanziWordToGlossTyped(`你好:hello` as HanziWord),
      hanziWordToPinyinTyped(`你好:hello` as HanziWord),
    ]);
    expect(result.current.reviewQueue.items.length).toBeGreaterThan(0);
    expect(
      result.current.reviewQueue.items.every(
        ({ skill }) =>
          result.current.loading === false &&
          result.current.targetSkills?.has(skill),
      ),
    ).toBe(true);
  });
  await act(async () => {
    await rizzle.mutate.setSetting({
      key,
      value: null,
      now: new Date(),
      skipHistory: false,
      historyId: undefined,
    });
  });
  await waitFor(() => {
    invariant(!result.current.loading);
    expect(result.current.reviewQueue.items).toEqual([]);
  });
  unmount();
});

test(`scoped practice excludes unrelated retries and practices not-due targets`, async ({
  rizzle,
}) => {
  const hanziWord = `你好:hello`;
  await rizzle.mutate.setSetting({
    key: studyWordItemSetting.entity.marshalKey({ hanziWord }),
    value: studyWordItemSetting.entity.marshalValue({
      hanziWord,
      createdAt: new Date(),
    }),
    now: new Date(),
    skipHistory: false,
    historyId: undefined,
  });
  const targetSkills = [
    hanziWordToGlossTyped(hanziWord),
    hanziWordToPinyinTyped(hanziWord),
  ];
  for (const [index, skill] of [
    ...targetSkills,
    hanziWordToGlossTyped(`好:good`),
  ].entries()) {
    await rizzle.mutate.rateSkill({
      id: `scoped-rating-${index}`,
      reviewId: `scoped-review-${index}`,
      skill,
      rating: index === 2 ? Rating.Again : Rating.Good,
      now: Date.now(),
      durationMs: 1000,
    });
  }
  const { result, unmount } = renderHook(useSkillQueue, {
    wrapper: testContextProviders({ rizzle, listId: `study` }),
  });
  await waitFor(() => {
    invariant(!result.current.loading);
    const queue = result.current.reviewQueue;
    expect(queue.items).toHaveLength(1);
    expect(targetSkills).toContain(queue.items[0]?.skill);
    expect(queue.retryCount).toBe(0);
    expect(queue.dueCount).toBe(0);
    expect(queue.overDueCount).toBe(0);
    expect(queue.newContentCount + queue.newDifficultyCount).toBe(0);
  });
  unmount();
});

test(`Study buttons toggle meanings independently`, async ({ rizzle }) => {
  const { result, unmount } = renderHook(
    () => ({
      first: useStudyToggle(`好:good`),
      second: useStudyToggle(`好:like`),
    }),
    { wrapper: testContextProviders({ rizzle }) },
  );
  await waitFor(() => {
    expect(result.current.first.isLoading).toBe(false);
  });
  act(() => {
    result.current.first.toggle();
  });
  await waitFor(() => {
    expect(result.current.first.isStudying).toBe(true);
  });
  expect(result.current.second.isStudying).toBe(false);
  act(() => {
    result.current.second.toggle();
  });
  await waitFor(() => {
    expect(result.current.second.isStudying).toBe(true);
  });
  act(() => {
    result.current.first.toggle();
  });
  await waitFor(() => {
    expect(result.current.first.isStudying).toBe(false);
  });
  expect(result.current.second.isStudying).toBe(true);
  act(() => {
    result.current.first.toggle();
  });
  await waitFor(() => {
    expect(result.current.first.isStudying).toBe(true);
  });
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
      "he:厂:cliff (🌱 NEW SKILL)",
      "he:凵:box (🌱 NEW SKILL)",
      "he:亻:person (🌱 NEW SKILL)",
      "he:氏:clanName (🌱 NEW SKILL)",
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
      "he:冖:cover (🟥 BLOCKED)",
      "he:𭕄:radical (🟥 BLOCKED)",
      "he:𠂊:hands (🟥 BLOCKED)",
      "he:亅:hook (🟥 BLOCKED)",
      "he:𠃌:radical (🟥 BLOCKED)",
      "he:丶:dot (🟥 BLOCKED)",
      "he:丿:slash (🟥 BLOCKED)",
      "he:乚:hidden (🟥 BLOCKED)",
    ]
  `);

  unmount();
});
