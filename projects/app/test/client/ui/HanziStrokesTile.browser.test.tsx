import { HanziStrokesTile } from "#client/ui/HanziStrokesTile.tsx";
import { hanziCharacterSchema, strokeSpecStringSchema } from "#data/model.ts";
import { render } from "vitest-browser-react";
import type { PropsWithChildren } from "react";
import { assert, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { skipToken } from "@tanstack/react-query";

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}));

vi.mock(import(`@tanstack/react-query`), async (importOriginal) => ({
  ...(await importOriginal()),
  useQuery: useQueryMock,
}));

vi.mock(import(`#client/ui/HanziLink.tsx`), () => ({
  HanziLink: ({ children }: PropsWithChildren) => <>{children}</>,
}));

vi.mock(import(`#client/ui/Icon.tsx`), () => ({
  Icon: () => <span />,
}));

const hanzi = hanziCharacterSchema.parse(`木`);
const strokeSpec = strokeSpecStringSchema.parse(`0`);

test.each([
  { data: undefined, isLoading: true },
  { data: null, isLoading: false },
  { data: undefined, isLoading: false },
  { data: { strokes: [] }, isLoading: false },
  { data: { strokes: [`M 0 0 L 10 10`] }, isLoading: false },
])(`keeps the tile and label rendered for query state %j`, async (state) => {
  useQueryMock.mockReturnValue(state);
  await render(
    <div data-testid="tile">
      <HanziStrokesTile
        hanzi={hanzi}
        componentHanzi={null}
        componentStrokeSpec={
          state.data?.strokes.length === 0 ? null : strokeSpec
        }
        label="Wood"
      />
    </div>,
  );

  await expect.element(page.getByText(`Wood`)).toBeInTheDocument();
  const slot = page.getByTestId(`tile`).element()
    .firstElementChild?.firstElementChild;
  assert(slot != null);
  expect(slot.getBoundingClientRect().width).toBe(48);
  expect(slot.getBoundingClientRect().height).toBe(48);
  if (!state.isLoading && (state.data?.strokes.length ?? 0) === 0) {
    await expect
      .element(page.getByRole(`img`, { name: `Character graphic unavailable` }))
      .toBeInTheDocument();
  }
});

test(`uses the character fallback when the SVG query is disabled`, async () => {
  useQueryMock.mockClear();
  useQueryMock.mockReturnValue({ data: undefined, isLoading: false });
  await render(
    <div data-testid="tile">
      <HanziStrokesTile
        hanzi={null}
        componentHanzi={hanzi}
        componentStrokeSpec={null}
        label="Wood"
      />
    </div>,
  );

  await expect.element(page.getByText(hanzi)).toBeInTheDocument();
  await expect.element(page.getByText(`Wood`)).toBeInTheDocument();
  expect(useQueryMock).toHaveBeenCalledWith(
    expect.objectContaining({
      queryKey: [`skipQuery`],
      queryFn: skipToken,
    }),
  );
  const slot = page.getByTestId(`tile`).element()
    .firstElementChild?.firstElementChild;
  assert(slot != null);
  expect(slot.getBoundingClientRect().width).toBe(48);
  expect(slot.getBoundingClientRect().height).toBe(48);
});
