// @vitest-environment happy-dom

import { DbProvider } from "#client/ui/DbProvider.tsx";
import { useNewQueryClient } from "#client/ui/hooks/useNewQueryClient.ts";
import { RizzleProvider } from "#client/ui/RizzleProvider.tsx";
import { SkillWordRows } from "#client/ui/SkillWordRows.tsx";
import { StudyList } from "#client/ui/StudyList.tsx";
import type { Rizzle } from "#data/rizzleSchema.ts";
import {
  getStudyWordKeyParams,
  studyWordItemSetting,
} from "#data/userSettings.ts";
import { rizzleFixture } from "#test/util/rizzleHelpers.ts";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import { format } from "date-fns/format";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, test as baseTest, expect, vi } from "vitest";

vi.mock(import(`#client/ui/Icon.tsx`), () => ({
  Icon: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));
vi.mock(`expo-router`, () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href }: PropsWithChildren<{ href: string }>) => (
    <a href={href}>{children}</a>
  ),
}));

const test = baseTest.extend(rizzleFixture);

beforeEach(() => {
  vi.useFakeTimers({ toFake: [`Date`] });
  vi.setSystemTime(new Date(2026, 9, 3, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

function providers(rizzle: Rizzle) {
  return function Wrapper({ children }: PropsWithChildren) {
    const queryClient = useNewQueryClient();
    return (
      <QueryClientProvider client={queryClient}>
        <RizzleProvider.Context.Provider value={rizzle}>
          <DbProvider>{children}</DbProvider>
        </RizzleProvider.Context.Provider>
      </QueryClientProvider>
    );
  };
}

test(`uses shared HSK rows in dated groups without notes or removal buttons`, async ({
  rizzle,
}) => {
  const newest = new Date(2026, 9, 3, 12);
  const older = new Date(2026, 9, 2, 12);
  for (const [word, createdAt] of [
    [`你好:hello`, newest],
    [`好:good`, older],
  ] as const) {
    const keyParams = getStudyWordKeyParams(word);
    await rizzle.mutate.setSetting({
      key: studyWordItemSetting.entity.marshalKey(keyParams),
      value: studyWordItemSetting.encodeStoredValue(keyParams, {
        ...keyParams,
        createdAt,
      }),
      now: new Date(),
      skipHistory: true,
    });
  }
  const rendered = render(<StudyList />, { wrapper: providers(rizzle) });
  await waitFor(() => {
    expect(rendered.getByText(`Study (2)`)).toBeTruthy();
    expect(rendered.getByText(`hello`)).toBeTruthy();
    expect(rendered.getByText(`hǎo`)).toBeTruthy();
    expect(rendered.getByText(`Today`)).toBeTruthy();
    expect(rendered.getByText(`Yesterday`)).toBeTruthy();
  });
  expect(
    rendered
      .getByText(`Today`)
      .compareDocumentPosition(rendered.getByText(`Yesterday`)) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).not.toBe(0);
  expect(
    rendered.container.querySelectorAll(`[data-icon="close"]`),
  ).toHaveLength(0);
  expect(
    rendered.container.querySelectorAll(`[data-icon="chevron-right"]`),
  ).toHaveLength(2);
  expect(rendered.container.textContent).not.toContain(`Note`);
  expect(rendered.container.querySelectorAll(`a`)).toHaveLength(2);

  const shared = render(
    <SkillWordRows hanziWords={[`你好:hello`]} showHskLozenges={false} />,
    {
      wrapper: providers(rizzle),
    },
  );
  await waitFor(() => {
    expect(shared.getByText(`hello`)).toBeTruthy();
  });
  const studyRow = rendered.container.querySelector(`a`);
  const hskRow = shared.container.querySelector(`a`);
  expect(studyRow?.textContent).toBe(hskRow?.textContent);
  expect(studyRow?.querySelectorAll(`[style*="left"]`)).toHaveLength(3);

  await act(async () => {
    await rizzle.mutate.setSetting({
      key: studyWordItemSetting.entity.marshalKey({ hanziWord: `你好:hello` }),
      value: null,
      now: new Date(),
      skipHistory: true,
    });
  });
  await waitFor(() => {
    expect(rendered.queryByText(`Today`)).toBeNull();
    expect(rendered.getByText(`Study (1)`)).toBeTruthy();
  });
  shared.unmount();
  rendered.unmount();
});

test(`shows HSK labels beside words without a leading indentation column`, async ({
  rizzle,
}) => {
  const keyParams = getStudyWordKeyParams(`一:one`);
  await rizzle.mutate.setSetting({
    key: studyWordItemSetting.entity.marshalKey(keyParams),
    value: studyWordItemSetting.encodeStoredValue(keyParams, {
      ...keyParams,
      createdAt: new Date(),
    }),
    now: new Date(),
    skipHistory: true,
  });
  const rendered = render(<StudyList />, { wrapper: providers(rizzle) });
  await waitFor(() => {
    expect(rendered.getByText(`one`)).toBeTruthy();
    expect(rendered.getByText(`HSK`)).toBeTruthy();
  });
  const hskLabel = rendered.getByText(`HSK`);
  expect(rendered.getByText(`一`).parentElement?.contains(hskLabel)).toBe(true);
  const row = rendered.container.querySelector(`a`)?.firstElementChild;
  expect(row?.firstElementChild).toBe(rendered.getByText(`一`).parentElement);
  rendered.unmount();
});

test(`shows older dates without the Added prefix`, async ({ rizzle }) => {
  const createdAt = new Date(2026, 8, 30, 23, 59);
  const keyParams = getStudyWordKeyParams(`你好:hello`);
  await rizzle.mutate.setSetting({
    key: studyWordItemSetting.entity.marshalKey(keyParams),
    value: studyWordItemSetting.encodeStoredValue(keyParams, {
      ...keyParams,
      createdAt,
    }),
    now: new Date(),
    skipHistory: true,
  });
  const rendered = render(<StudyList />, { wrapper: providers(rizzle) });
  await waitFor(() => {
    expect(rendered.getByText(format(createdAt, `MMM d, yyyy`))).toBeTruthy();
  });
  expect(rendered.queryByText(/^Added /u)).toBeNull();
  rendered.unmount();
});
