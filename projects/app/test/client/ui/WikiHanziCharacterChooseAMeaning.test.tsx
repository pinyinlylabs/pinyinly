// @vitest-environment happy-dom

import { SrsKind } from "#data/model.ts";
import type {
  HanziCharacter,
  HanziWord,
  PinyinText,
  Skill,
  SrsStateType,
} from "#data/model.ts";
import type { Rizzle } from "#data/rizzleSchema.ts";
import { DbProvider } from "#client/ui/DbProvider.tsx";
import { TrpcProvider } from "#client/ui/TrpcProvider.tsx";
import { RizzleProvider } from "#client/ui/RizzleProvider.tsx";
import { useNewQueryClient } from "#client/ui/hooks/useNewQueryClient.ts";
import { testWithRizzle } from "#test/util/rizzleHelpers.ts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { afterEach, beforeEach, expect, vi } from "vitest";
import { WikiHanziCharacterChooseAMeaning } from "#client/ui/WikiHanziCharacterChooseAMeaning.tsx";
import { WikiHanziMeaningsPanel } from "#client/ui/WikiHanziMeaningsPanel.tsx";
import { WikiHanziProgressLozenge } from "#client/ui/WikiHanziProgressLozenge.tsx";
import { getHanziWordsProgress } from "#client/ui/wikiHanziProgress.ts";
import { WikiHanziBookmarkMenu } from "#client/ui/WikiHanziBookmarkMenu.tsx";
import type { UseUserHanziMeaningOptions } from "#client/ui/hooks/useUserHanziMeaning.ts";

const { useLiveQueryMock, useBookmarkToggleMock } = vi.hoisted(() => ({
  useLiveQueryMock: vi.fn(),
  useBookmarkToggleMock: vi.fn(),
}));

vi.mock(import(`@tanstack/react-db`), async (importOriginal) => ({
  ...(await importOriginal()),
  useLiveQuery: useLiveQueryMock,
}));

vi.mock(`react-native-screens`, () => ({
  FullWindowOverlay: ({ children }: PropsWithChildren) => <>{children}</>,
}));

vi.mock(import(`#client/ui/hooks/useBookmarkToggle.ts`), () => ({
  useBookmarkToggle: useBookmarkToggleMock,
}));

vi.mock(import(`#client/ui/hooks/useUserHanziMeaning.ts`), () => ({
  useUserHanziMeaning: ({ hanzi, meaningKey }: UseUserHanziMeaningOptions) => ({
    value: {
      hanzi,
      meaningKey,
      gloss: `my custom meaning`,
      pinyin: `jǐ` as PinyinText,
    },
    isLoading: false,
    set: vi.fn(),
    remove: vi.fn(),
    meaningKey,
  }),
}));

vi.mock(
  import(`#client/ui/WikiHanziBookmarkMenu.tsx`),
  async (importOriginal) => ({
    ...(await importOriginal()),
    WikiHanziBookmarkMenu: ({ hanziWord }: { hanziWord: HanziWord | null }) => (
      <button type="button" disabled={hanziWord == null}>
        {hanziWord == null ? `Bookmark` : `Bookmark ${hanziWord}`}
      </button>
    ),
  }),
);

const test = testWithRizzle;

beforeEach(() => {
  useBookmarkToggleMock.mockReturnValue({
    isBookmarked: false,
    isLoading: false,
    toggle: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  });
  vi.stubGlobal(
    `fetch`,
    vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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
    <>
      <WikiHanziCharacterChooseAMeaning
        hanzi={hanzi}
        hanziWord={hanziWord}
        onHanziWordChanged={setHanziWord}
        skillSrsStates={new Map()}
      />
      <WikiHanziBookmarkMenu hanzi={hanzi} hanziWord={hanziWord} />
    </>
  );
}

function providers(rizzle: Rizzle) {
  return function Wrapper({ children }: PropsWithChildren) {
    const queryClient = useNewQueryClient();

    return (
      <TrpcProvider
        queryClient={queryClient}
        getServerSessionId={async () => null}
      >
        <QueryClientProvider client={queryClient}>
          <RizzleProvider.Context.Provider value={rizzle}>
            <DbProvider>{children}</DbProvider>
          </RizzleProvider.Context.Provider>
        </QueryClientProvider>
      </TrpcProvider>
    );
  };
}

test(`scopes the page study action to the selected meaning`, ({ rizzle }) => {
  useLiveQueryMock.mockReturnValue({ data: meanings });

  render(<TestChooser />, { wrapper: providers(rizzle) });

  expect(screen.getByRole(`button`, { name: `Bookmark` })).toBeDisabled();

  fireEvent.click(screen.getByText(`how many, a few`));

  expect(screen.getByRole(`radio`, { name: `how many, a few` })).toBeChecked();
  expect(screen.getByRole(`radio`, { name: `small table` })).not.toBeChecked();
  expect(
    screen.getByRole(`button`, { name: `Bookmark 几:howMany` }),
  ).toBeEnabled();
  expect(
    screen.queryByRole(`button`, { name: `Bookmark 几:smallTable` }),
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByText(`small table`));

  expect(screen.getByRole(`radio`, { name: `small table` })).toBeChecked();
  expect(
    screen.getByRole(`button`, { name: `Bookmark 几:smallTable` }),
  ).toBeEnabled();
  expect(
    screen.queryByRole(`button`, { name: `Bookmark 几:howMany` }),
  ).not.toBeInTheDocument();
});

test(`shows the example sentence for its character meaning`, async ({
  rizzle,
}) => {
  useLiveQueryMock.mockReturnValue({ data: meanings });
  vi.mocked(globalThis.fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        curriculumMeaningExamples: [
          {
            id: meanings[0]!.hanziWord,
            exampleSentence: {
              hanzi: `这张桌子很小。`,
              pinyin: `zhè zhāng zhuōzi hěn xiǎo`,
              translation: `This table is small.`,
            },
          },
        ],
      }),
    ),
  );

  render(<TestChooser />, { wrapper: providers(rizzle) });

  expect(await screen.findByText(`This table is small.`)).toBeInTheDocument();
  expect(screen.getByText(`这张桌子很小。`)).toBeInTheDocument();
});

test(`shows descriptions beside their character meanings`, async ({
  rizzle,
}) => {
  const builtInMeanings = meanings.map((meaning) => ({
    sourceKind: `builtIn`,
    id: meaning.hanziWord,
    hanzi: meaning.hanzi,
    hanziWord: meaning.hanziWord,
    gloss: meaning.gloss,
    pinyin: meaning.pinyin,
    note: null,
  }));
  let queryCount = 0;
  useLiveQueryMock.mockReset();
  useLiveQueryMock.mockImplementation(() => ({
    data: queryCount++ % 2 === 0 ? builtInMeanings : [],
  }));
  vi.mocked(globalThis.fetch).mockResolvedValue(
    new Response(
      JSON.stringify({
        curriculumMeanings: [
          {
            id: meanings[0]!.hanziWord,
            gloss: `how many`,
            pinyin: `jǐ`,
            description: `Used to ask about a small number.`,
          },
          {
            id: meanings[1]!.hanziWord,
            gloss: `small table`,
            pinyin: `jī`,
            description: `A low table used indoors.`,
          },
        ],
      }),
    ),
  );

  render(<WikiHanziMeaningsPanel hanzi={hanzi} skillSrsStates={new Map()} />, {
    wrapper: providers(rizzle),
  });

  expect(
    await screen.findByText(`Used to ask about a small number.`),
  ).toBeInTheDocument();
  expect(screen.getByText(`A low table used indoors.`)).toBeInTheDocument();
});

test(`selects a sole word meaning for the page study action by default`, ({
  rizzle,
}) => {
  useLiveQueryMock
    .mockReturnValueOnce({
      data: [
        {
          sourceKind: `builtIn`,
          id: `几:howMany`,
          hanzi,
          hanziWord: meanings[0]!.hanziWord,
          gloss: meanings[0]!.gloss,
          pinyin: meanings[0]!.pinyin,
          note: null,
        },
      ],
    })
    .mockReturnValueOnce({ data: [] });
  const onHanziWordSelected = vi.fn();

  render(
    <WikiHanziMeaningsPanel
      hanzi={hanzi}
      selectedHanziWord={null}
      onHanziWordSelected={onHanziWordSelected}
      skillSrsStates={new Map()}
    />,
    { wrapper: providers(rizzle) },
  );

  expect(onHanziWordSelected).toHaveBeenCalledExactlyOnceWith(
    meanings[0]!.hanziWord,
  );
  expect(screen.queryByRole(`radio`)).not.toBeInTheDocument();
});

test(`requires a choice when a word has multiple meanings`, ({ rizzle }) => {
  useLiveQueryMock
    .mockReturnValueOnce({
      data: meanings.map((meaning) => ({
        sourceKind: `builtIn`,
        id: meaning.hanziWord,
        hanzi,
        hanziWord: meaning.hanziWord,
        gloss: meaning.gloss,
        pinyin: meaning.pinyin,
        note: null,
      })),
    })
    .mockReturnValueOnce({ data: [] });
  const onHanziWordSelected = vi.fn();

  render(
    <WikiHanziMeaningsPanel
      hanzi={hanzi}
      selectedHanziWord={null}
      onHanziWordSelected={onHanziWordSelected}
      skillSrsStates={new Map()}
    />,
    { wrapper: providers(rizzle) },
  );

  expect(onHanziWordSelected).not.toHaveBeenCalled();
  expect(screen.getAllByRole(`radio`)).toHaveLength(2);
  expect(
    screen.getAllByRole(`button`, {
      name: `Not Started. Bookmark and proficiency details`,
    }),
  ).toHaveLength(2);
  for (const gloss of [`how many, a few`, `small table`]) {
    const glossRow = screen.getByRole(`radio`, { name: gloss }).parentElement;
    expect(glossRow).not.toBeNull();
    expect(within(glossRow!).getByRole(`button`)).toHaveTextContent(
      `Not Started`,
    );
  }

  fireEvent.click(screen.getByText(`how many, a few`));

  expect(onHanziWordSelected).toHaveBeenCalledExactlyOnceWith(
    meanings[0]!.hanziWord,
  );
});

test(`shows a meaning-local lozenge for every character choice`, ({
  rizzle,
}) => {
  useLiveQueryMock.mockReturnValue({ data: meanings });
  render(<TestChooser />, { wrapper: providers(rizzle) });
  expect(
    screen.getAllByRole(`button`, {
      name: `Not Started. Bookmark and proficiency details`,
    })[0],
  ).toBeInTheDocument();
});

test(`shows Queued instead of Not Started for a bookmarked meaning`, ({
  rizzle,
}) => {
  useLiveQueryMock.mockReturnValue({ data: meanings });
  useBookmarkToggleMock.mockReturnValue({
    isBookmarked: true,
    isLoading: false,
    toggle: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  });
  render(<TestChooser />, { wrapper: providers(rizzle) });
  expect(
    screen.getAllByRole(`button`, {
      name: `Queued. Bookmark and proficiency details`,
    }).length,
  ).toBeGreaterThan(0);
});

test(`shows no status lozenge when there are no meanings`, ({ rizzle }) => {
  useLiveQueryMock.mockReturnValue({ data: [] });
  render(<WikiHanziMeaningsPanel hanzi={hanzi} skillSrsStates={new Map()} />, {
    wrapper: providers(rizzle),
  });
  expect(screen.getByText(`No definitions at the moment.`)).toBeInTheDocument();
  expect(screen.queryByRole(`button`)).not.toBeInTheDocument();
});

test(`shows a meaning-local lozenge beside a custom meaning`, ({ rizzle }) => {
  useLiveQueryMock.mockReturnValueOnce({ data: [] }).mockReturnValueOnce({
    data: [{ hanzi, meaningKey: `custom` }],
  });
  render(<WikiHanziMeaningsPanel hanzi={hanzi} skillSrsStates={new Map()} />, {
    wrapper: providers(rizzle),
  });
  const glossRow =
    screen.getByText(`my custom meaning`).parentElement?.parentElement;
  expect(glossRow).not.toBeNull();
  expect(within(glossRow!).getByRole(`button`)).toHaveTextContent(
    `Not Started`,
  );
  expect(screen.getByText(`Custom`)).toBeInTheDocument();
});

test(`shows progress lozenge when the word has no progress`, ({ rizzle }) => {
  useLiveQueryMock
    .mockReturnValueOnce({ data: [] })
    .mockReturnValueOnce({ data: [] });

  render(
    <WikiHanziProgressLozenge
      hanziWord={meanings[0]!.hanziWord}
      hasPinyin
      skillSrsStates={new Map<Skill, SrsStateType>()}
    />,
    { wrapper: providers(rizzle) },
  );

  expect(screen.getByText(`Not Started`)).toBeInTheDocument();
});

test(`keeps each meaning's proficiency independent`, ({ rizzle }) => {
  const skillSrsStates = new Map<Skill, SrsStateType>(
    [`he:几:howMany`, `hpi:几:howMany`, `hpf:几:howMany`, `hp:几:howMany`].map(
      (skill) => [
        skill as Skill,
        {
          kind: SrsKind.FsrsFourPointFive,
          prevReviewAt: new Date(),
          nextReviewAt: new Date(),
          stability: 1000,
          difficulty: 0,
        },
      ],
    ),
  );
  render(
    <>
      {meanings.map((meaning) => (
        <WikiHanziProgressLozenge
          key={meaning.hanziWord}
          hanziWord={meaning.hanziWord}
          skillSrsStates={skillSrsStates}
          hasPinyin
        />
      ))}
    </>,
    { wrapper: providers(rizzle) },
  );
  expect(
    screen.getByRole(`button`, {
      name: `Master. Bookmark and proficiency details`,
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole(`button`, {
      name: `Not Started. Bookmark and proficiency details`,
    }),
  ).toBeInTheDocument();
});

test(`averages meaning progress until a meaning is selected`, () => {
  const fullyLearnedSkills = [
    `he:几:howMany`,
    `hpi:几:howMany`,
    `hpf:几:howMany`,
    `hp:几:howMany`,
  ] as Skill[];
  const skillSrsStates = new Map<Skill, SrsStateType>(
    fullyLearnedSkills.map((skill) => [
      skill,
      {
        kind: SrsKind.FsrsFourPointFive,
        prevReviewAt: new Date(),
        nextReviewAt: new Date(),
        stability: 1000,
        difficulty: 0,
      },
    ]),
  );

  expect(
    getHanziWordsProgress({
      hanziWords: [meanings[0]!.hanziWord, meanings[1]!.hanziWord],
      skillSrsStates,
    }),
  ).toEqual({ progress: 0.5, rank: 2 });
  expect(
    getHanziWordsProgress({
      hanziWords: [meanings[0]!.hanziWord],
      skillSrsStates,
    }),
  ).toEqual({ progress: 1, rank: 4 });
});

test(`shows progress within the current rank`, () => {
  const rankOneGoalsMet = new Map<Skill, SrsStateType>(
    [`he:几:howMany`, `hpi:几:howMany`].map((skill) => [
      skill as Skill,
      {
        kind: SrsKind.FsrsFourPointFive,
        prevReviewAt: new Date(),
        nextReviewAt: new Date(),
        stability: 30,
        difficulty: 0,
      },
    ]),
  );

  expect(
    getHanziWordsProgress({
      hanziWords: [meanings[0]!.hanziWord],
      skillSrsStates: rankOneGoalsMet,
    }),
  ).toEqual({ progress: 0, rank: 2 });

  rankOneGoalsMet.set(`hpf:几:howMany`, {
    kind: SrsKind.FsrsFourPointFive,
    prevReviewAt: new Date(),
    nextReviewAt: new Date(),
    stability: 15,
    difficulty: 0,
  });

  expect(
    getHanziWordsProgress({
      hanziWords: [meanings[0]!.hanziWord],
      skillSrsStates: rankOneGoalsMet,
    }),
  ).toEqual({ progress: 0.5, rank: 2 });
});

test(`averages current-rank progress across meanings and completes the final rank`, () => {
  const skillSrsStates = new Map<Skill, SrsStateType>(
    [`he:几:howMany`, `hpi:几:howMany`, `hpf:几:howMany`, `hp:几:howMany`].map(
      (skill) => [
        skill as Skill,
        {
          kind: SrsKind.FsrsFourPointFive,
          prevReviewAt: new Date(),
          nextReviewAt: new Date(),
          stability: 30,
          difficulty: 0,
        },
      ],
    ),
  );
  for (const skill of [`he:几:smallTable`, `hpi:几:smallTable`] as Skill[]) {
    skillSrsStates.set(skill, {
      kind: SrsKind.FsrsFourPointFive,
      prevReviewAt: new Date(),
      nextReviewAt: new Date(),
      stability: 15,
      difficulty: 0,
    });
  }

  expect(
    getHanziWordsProgress({
      hanziWords: meanings.map((meaning) => meaning.hanziWord),
      skillSrsStates,
    }),
  ).toEqual({ progress: 0.75, rank: 3 });
});
