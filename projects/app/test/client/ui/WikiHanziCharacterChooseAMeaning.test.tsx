// @vitest-environment happy-dom

import type { HanziCharacter, HanziWord } from "#data/model.ts";
import type { Rizzle } from "#data/rizzleSchema.ts";
import { DbProvider } from "#client/ui/DbProvider.tsx";
import { RizzleProvider } from "#client/ui/RizzleProvider.tsx";
import { useNewQueryClient } from "#client/ui/hooks/useNewQueryClient.ts";
import { rizzleFixture } from "#test/util/rizzleHelpers.ts";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { expect, test as baseTest, vi } from "vitest";
import { WikiHanziCharacterChooseAMeaning } from "#client/ui/WikiHanziCharacterChooseAMeaning.tsx";

const { useLiveQueryMock } = vi.hoisted(() => ({
  useLiveQueryMock: vi.fn(),
}));

vi.mock(import(`@tanstack/react-db`), async (importOriginal) => ({
  ...(await importOriginal()),
  useLiveQuery: useLiveQueryMock,
}));

vi.mock(import(`#client/ui/StudyButton.tsx`), () => ({
  StudyButton: ({ hanziWord }: { hanziWord: HanziWord }) => (
    <button type="button">{`Study ${hanziWord}`}</button>
  ),
}));

const test = baseTest.extend(rizzleFixture);

const hanzi = `几` as HanziCharacter;
const meanings = [
  {
    hanzi,
    hanziWord: `几:howMany` as HanziWord,
    gloss: [`how many, a few`],
    pinyin: [`jǐ`],
  },
  {
    hanzi,
    hanziWord: `几:smallTable` as HanziWord,
    gloss: [`small table`],
    pinyin: [`jī`],
  },
];

function TestChooser() {
  const [hanziWord, setHanziWord] = useState<HanziWord | null>(null);

  return (
    <WikiHanziCharacterChooseAMeaning
      hanzi={hanzi}
      hanziWord={hanziWord}
      onHanziWordChanged={setHanziWord}
    />
  );
}

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

test(`shows a study action for the selected meaning`, ({ rizzle }) => {
  useLiveQueryMock.mockReturnValue({ data: meanings });

  render(<TestChooser />, { wrapper: providers(rizzle) });

  expect(screen.queryByText(`Study 几:howMany`)).not.toBeInTheDocument();
  expect(screen.queryByText(`Study 几:smallTable`)).not.toBeInTheDocument();

  fireEvent.click(screen.getByText(`how many, a few`));

  expect(screen.getByText(`Study 几:howMany`)).toBeInTheDocument();
  expect(screen.queryByText(`Study 几:smallTable`)).not.toBeInTheDocument();

  fireEvent.click(screen.getByText(`small table`));

  expect(screen.getByText(`Study 几:smallTable`)).toBeInTheDocument();
  expect(screen.queryByText(`Study 几:howMany`)).not.toBeInTheDocument();
});
