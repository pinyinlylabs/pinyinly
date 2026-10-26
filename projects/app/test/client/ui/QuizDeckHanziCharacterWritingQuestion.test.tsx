// @vitest-environment happy-dom

import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import {
  hanziCharacterSchema,
  pinyinTextSchema,
  QuestionKind,
} from "#data/model.ts";
import type { HanziCharacterWritingQuestion } from "#data/model.ts";
import { hanziCharacterToWriting } from "#data/skills.ts";
import { expect, test, vi } from "vitest";
import { QuizDeckHanziCharacterWritingQuestion } from "#client/ui/QuizDeckHanziCharacterWritingQuestion.tsx";

vi.mock(`#client/ui/hooks/useSoundEffect.tsx`, () => ({
  useSoundEffect: () => () => {},
}));
vi.mock(`#client/ui/hooks/useQuizTimer.ts`, () => ({
  quizTimerIdleGraceMs: 1000,
  useQuizTimer: () => ({
    getDurationMs: () => 0,
    pause: () => {},
    resumeAfter: () => {},
  }),
}));
vi.mock(`#client/ui/QuizDeckQuestionSkeleton.tsx`, async () => {
  const { jsx } = await import(`react/jsx-runtime`);

  return {
    QuizDeckQuestionSkeleton: ({
      children,
      isUserAnswerProvided,
    }: {
      children: React.ReactNode;
      isUserAnswerProvided: boolean;
    }) =>
      jsx(`div`, {
        "data-testid": `quiz-question`,
        "data-answer-ready": isUserAnswerProvided,
        children,
      }),
  };
});
vi.mock(`#client/ui/HanziWritingCanvas.tsx`, async () => {
  const { jsx } = await import(`react/jsx-runtime`);

  return {
    HanziWritingCanvas: ({ disabled }: { disabled: boolean }) =>
      jsx(`div`, {
        "data-testid": `writing-canvas`,
        "data-disabled": disabled,
      }),
  };
});
vi.mock(`#data/pinyinSoundAudio.ts`, () => ({
  getAudioSourcesByPinyinMap: () => new Map(),
}));

const hanzi = hanziCharacterSchema.parse(`好`);
const question: HanziCharacterWritingQuestion = {
  kind: QuestionKind.HanziCharacterWriting,
  skill: hanziCharacterToWriting(hanzi),
  hanzi,
  gloss: `good`,
  pinyin: pinyinTextSchema.parse(`hǎo`),
  flag: null,
};

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
