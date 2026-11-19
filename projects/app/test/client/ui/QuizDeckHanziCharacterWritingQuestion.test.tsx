// @vitest-environment happy-dom

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import {
  hanziCharacterSchema,
  pinyinTextSchema,
  QuestionKind,
} from "#data/model.ts";
import type { HanziCharacterWritingQuestion } from "#data/model.ts";
import type { HanziCharacterWritingQuestionRating } from "#data/questions/hanziCharacterWriting.ts";
import { hanziCharacterToWriting } from "#data/skills.ts";
import { beforeEach, expect, test, vi } from "vitest";
import { QuizDeckHanziCharacterWritingQuestion } from "#client/ui/QuizDeckHanziCharacterWritingQuestion.tsx";
import { Rating } from "#util/fsrs.ts";

const mocks = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  rating: undefined as HanziCharacterWritingQuestionRating | undefined,
  durationMs: 0,
  showHanziWritingIssues: false,
  hanziWritingIssuesLoading: false,
}));

vi.mock(`@sentry/react-native`, () => ({
  captureMessage: mocks.captureMessage,
}));
vi.mock(import(`#data/questions/hanziCharacterWriting.ts`), () => ({
  gradeHanziCharacterWritingQuestion: () => {
    if (mocks.rating == null) {
      throw new Error(`expected a handwriting rating fixture`);
    }
    return mocks.rating;
  },
  createHanziCharacterWritingRatingReportJson: () => `report-json`,
}));
vi.mock(`#client/ui/hooks/useSoundEffect.tsx`, () => ({
  useSoundEffect: () => () => {},
}));
vi.mock(`#client/ui/hooks/useQuizTimer.ts`, () => ({
  quizTimerIdleGraceMs: 1000,
  useQuizTimer: () => ({
    getDurationMs: () => mocks.durationMs,
    pause: () => {},
    resumeAfter: () => {},
  }),
}));
vi.mock(`#client/ui/hooks/useUserSettingToggle.ts`, () => ({
  useUserSettingToggle: () => ({
    isLoading: mocks.hanziWritingIssuesLoading,
    isEnabled: mocks.showHanziWritingIssues,
    setEnabled: vi.fn(),
  }),
}));
vi.mock(`#client/ui/QuizDeckQuestionSkeleton.tsx`, () => ({
  QuizDeckQuestionSkeleton: ({
    children,
    rating,
    isUserAnswerProvided,
    onSubmit,
    onReportWrongRating,
  }: {
    children: React.ReactNode;
    rating?: { rating: number };
    isUserAnswerProvided: boolean;
    onSubmit: () => Promise<void>;
    onReportWrongRating?: () => void;
  }) => (
    <div
      data-testid="quiz-question"
      data-answer-ready={isUserAnswerProvided}
      data-rating={rating?.rating}
    >
      {children}
      <button type="button" onClick={() => void onSubmit()}>
        Submit
      </button>
      {rating == null || onReportWrongRating == null ? null : (
        <button type="button" onClick={onReportWrongRating}>
          Report rating
        </button>
      )}
    </div>
  ),
}));
vi.mock(`#client/ui/HanziWritingCanvas.tsx`, () => ({
  HanziWritingCanvas: ({
    disabled,
    onStrokesChange,
    issues,
  }: {
    disabled: boolean;
    onStrokesChange: (strokes: { x: number; y: number }[][]) => void;
    issues?: readonly unknown[];
  }) => (
    <button
      type="button"
      data-testid="writing-canvas"
      data-disabled={disabled}
      data-issues-count={issues?.length ?? 0}
      onClick={() => {
        onStrokesChange([[{ x: 0, y: 0 }]]);
      }}
    />
  ),
}));
vi.mock(`#data/pinyinSoundAudio.ts`, () => ({
  getAudioSourcesByPinyinMap: () => new Map(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rating = undefined;
  mocks.durationMs = 0;
  mocks.showHanziWritingIssues = false;
  mocks.hanziWritingIssuesLoading = false;
});

const hanzi = hanziCharacterSchema.parse(`好`);
const question: HanziCharacterWritingQuestion = {
  kind: QuestionKind.HanziCharacterWriting,
  skill: hanziCharacterToWriting(hanzi),
  hanzi,
  gloss: `good`,
  pinyin: pinyinTextSchema.parse(`hǎo`),
  flag: null,
};

test(`renders grader issues in the writing canvas only when enabled`, async () => {
  mocks.showHanziWritingIssues = true;
  mocks.rating = {
    correct: false,
    rating: Rating.Again,
    skillRatings: [
      { skill: question.skill, rating: Rating.Again, durationMs: 12_000 },
    ],
    failure: `stroke-segmentation`,
    geometry: {
      issues: [
        {
          kind: `missing-stroke`,
          reference: { strokeIndex: 1, start: 0, end: 1 },
        },
      ],
    } as HanziCharacterWritingQuestionRating[`geometry`],
    similarCharacterGrades: [],
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const fetch = vi
    .spyOn(globalThis, `fetch`)
    .mockImplementation(async (url) =>
      url === `/raw/wiki/${encodeURIComponent(hanzi)}.json`
        ? Response.json({ visuallySimilar: [] })
        : Response.json({ strokes: [], medians: [`M 0 0 L 1 1`] }),
    );

  render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading question</div>}>
        <QuizDeckHanziCharacterWritingQuestion
          question={question}
          onNext={() => {}}
          onRating={() => {}}
          onChangeAnswer={() => {}}
        />
      </Suspense>
    </QueryClientProvider>,
  );

  await expect(screen.findByTestId(`writing-canvas`)).resolves.toBeDefined();
  fireEvent.click(screen.getByTestId(`writing-canvas`));
  fireEvent.click(screen.getByRole(`button`, { name: `Submit` }));

  await waitFor(() => {
    expect(screen.getByTestId(`writing-canvas`)).toHaveAttribute(
      `data-issues-count`,
      `1`,
    );
  });
  fetch.mockRestore();
  queryClient.clear();
});

test(`suspends until primary and similar-character grading data is ready`, async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const similarHanzi = hanziCharacterSchema.parse(`子`);
  const primary = Promise.withResolvers<Response>();
  const wiki = Promise.withResolvers<Response>();
  const similar = Promise.withResolvers<Response>();
  const fetch = vi
    .spyOn(globalThis, `fetch`)
    .mockImplementation(async (url) => {
      if (url === `/raw/svgs/${encodeURIComponent(hanzi)}.json`) {
        return primary.promise;
      }
      if (url === `/raw/wiki/${encodeURIComponent(hanzi)}.json`) {
        return wiki.promise;
      }
      return similar.promise;
    });

  render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading question</div>}>
        <QuizDeckHanziCharacterWritingQuestion
          question={question}
          onNext={() => {}}
          onRating={() => {}}
          onChangeAnswer={() => {}}
        />
      </Suspense>
    </QueryClientProvider>,
  );

  expect(screen.getByText(`Loading question`)).toBeInTheDocument();
  expect(screen.queryByTestId(`writing-canvas`)).not.toBeInTheDocument();

  await act(async () => {
    primary.resolve(Response.json({ strokes: [], medians: [] }));
    wiki.resolve(Response.json({ visuallySimilar: [similarHanzi] }));
  });
  expect(screen.getByText(`Loading question`)).toBeInTheDocument();
  expect(screen.queryByTestId(`writing-canvas`)).not.toBeInTheDocument();

  await act(async () => {
    similar.resolve(Response.json({ strokes: [], medians: [] }));
  });
  expect(await screen.findByTestId(`writing-canvas`)).toHaveAttribute(
    `data-disabled`,
    `false`,
  );
  expect(screen.getByTestId(`quiz-question`)).toHaveAttribute(
    `data-answer-ready`,
    `false`,
  );
  fetch.mockRestore();
  queryClient.clear();
});

test.for([
  {
    wasCorrect: false,
    originalRating: Rating.Again,
    correctedRating: Rating.Hard,
    errorType: `false-negative`,
  },
  {
    wasCorrect: true,
    originalRating: Rating.Easy,
    correctedRating: Rating.Again,
    errorType: `false-positive`,
  },
])(
  `reports a $errorType handwriting rating with a corrected rating`,
  async ({ wasCorrect, originalRating, correctedRating, errorType }) => {
    mocks.durationMs = 12_000;
    mocks.rating = {
      correct: wasCorrect,
      rating: originalRating,
      skillRatings: [
        { skill: question.skill, rating: originalRating, durationMs: 12_000 },
      ],
      failure: wasCorrect ? null : `shape`,
      geometry: {} as HanziCharacterWritingQuestionRating[`geometry`],
      similarCharacterGrades: [],
    };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const fetch = vi
      .spyOn(globalThis, `fetch`)
      .mockImplementation(async (url) =>
        url === `/raw/wiki/${encodeURIComponent(hanzi)}.json`
          ? Response.json({ visuallySimilar: [] })
          : Response.json({ strokes: [], medians: [`M 0 0 L 1 1`] }),
      );
    const onReportWrongRating = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading question</div>}>
          <QuizDeckHanziCharacterWritingQuestion
            question={question}
            onNext={() => {}}
            onRating={() => {}}
            onReportWrongRating={onReportWrongRating}
            onChangeAnswer={() => {}}
          />
        </Suspense>
      </QueryClientProvider>,
    );

    fireEvent.click(await screen.findByTestId(`writing-canvas`));
    fireEvent.click(screen.getByRole(`button`, { name: `Submit` }));
    const reportButton = await screen.findByRole(`button`, {
      name: `Report rating`,
    });
    expect(screen.getByTestId(`quiz-question`)).toHaveAttribute(
      `data-rating`,
      String(originalRating),
    );
    fireEvent.click(reportButton);

    expect(mocks.captureMessage).toHaveBeenCalledWith(
      `User reported a handwriting rating`,
      expect.objectContaining({
        tags: expect.objectContaining({
          [`handwriting-rating-error-type`]: errorType,
        }),
      }),
    );
    expect(onReportWrongRating).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          skill: question.skill,
          rating: correctedRating,
          durationMs: 12_000,
        }),
      ],
      [],
    );
    expect(screen.getByTestId(`quiz-question`)).toHaveAttribute(
      `data-rating`,
      String(correctedRating),
    );

    fetch.mockRestore();
    queryClient.clear();
  },
);
