// @vitest-environment happy-dom

import type { HanziWordToGlossTypedQuestion } from "#data/model.ts";
import { QuestionKind } from "#data/model.ts";
import { hanziWordToGlossTyped } from "#data/skills.ts";
import { QuizDeckHanziWordToGlossTypedQuestion as Question } from "#client/ui/QuizDeckHanziWordToGlossTypedQuestion.tsx";
import { Rating } from "#util/fsrs.ts";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";

const captureMessage = vi.hoisted(() => vi.fn());

vi.mock(`@sentry/react-native`, () => ({ captureMessage }));
vi.mock(`#client/ui/hooks/useQuizTimer.ts`, () => ({
  useQuizTimer: () => ({ getDurationMs: () => 12_000 }),
}));
vi.mock(`#client/ui/Text.tsx`, async () => {
  const { jsx } = await import(`react/jsx-runtime`);
  return {
    Text: ({ children }: { children: ReactNode }) => jsx(`span`, { children }),
  };
});
vi.mock(`#client/ui/View.tsx`, async () => {
  const { jsx } = await import(`react/jsx-runtime`);
  return {
    View: ({ children }: { children: ReactNode }) => jsx(`div`, { children }),
  };
});
vi.mock(`#client/ui/TextAnswerInputSingle.tsx`, async () => {
  const { jsx } = await import(`react/jsx-runtime`);
  return {
    TextAnswerInputSingle: ({
      onChangeValue,
    }: {
      onChangeValue: (value: string) => void;
    }) =>
      jsx(`input`, {
        "aria-label": `Answer`,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          onChangeValue(event.currentTarget.value);
        },
      }),
  };
});
vi.mock(`#client/ui/QuizDeckQuestionSkeleton.tsx`, async () => {
  const { jsx, Fragment } = await import(`react/jsx-runtime`);
  return {
    QuizDeckQuestionSkeleton: ({
      children,
      rating,
      onSubmit,
      onReportWrongRating,
    }: {
      children: ReactNode;
      rating?: { rating: number };
      onSubmit: () => void;
      onReportWrongRating?: () => void;
    }) =>
      jsx(Fragment, {
        children: [
          children,
          jsx(`button`, { onClick: onSubmit, children: `Submit` }),
          rating == null || onReportWrongRating == null
            ? null
            : jsx(`button`, {
                onClick: onReportWrongRating,
                children: `Report rating`,
              }),
        ],
      }),
  };
});

test.for([
  {
    wasCorrect: false,
    gloss: `freezer box`,
    originalRating: Rating.Again,
    correctedRating: Rating.Hard,
    errorType: `false-negative`,
    correctedMistakeCount: 0,
  },
  {
    wasCorrect: true,
    gloss: `freezer`,
    originalRating: Rating.Hard,
    correctedRating: Rating.Again,
    errorType: `false-positive`,
    correctedMistakeCount: 1,
  },
])(
  `reports a $errorType typed-meaning rating and corrects it using elapsed quiz time`,
  ({
    wasCorrect,
    gloss,
    originalRating,
    correctedRating,
    errorType,
    correctedMistakeCount,
  }) => {
    const skill = hanziWordToGlossTyped(`冰箱:freezer`);
    const question: HanziWordToGlossTypedQuestion = {
      kind: QuestionKind.HanziWordToGlossTyped,
      skill,
      answers: [{ skill, glosses: [gloss] }],
      bannedMeaningPrimaryGlossHint: [],
      flag: null,
    };
    const onRating = vi.fn();
    const onReportWrongRating = vi.fn();

    render(
      <Question
        question={question}
        onNext={() => {}}
        onRating={onRating}
        onReportWrongRating={onReportWrongRating}
        onChangeAnswer={() => {}}
      />,
    );

    fireEvent.change(screen.getByRole(`textbox`, { name: `Answer` }), {
      target: { value: `freezer` },
    });
    fireEvent.click(screen.getByRole(`button`, { name: `Submit` }));
    fireEvent.click(screen.getByRole(`button`, { name: `Report rating` }));

    expect(captureMessage).toHaveBeenCalledWith(
      `User reported a meaning rating`,
      expect.objectContaining({
        tags: {
          [`report-kind`]: `meaning-rating`,
          [`meaning-rating-error-type`]: errorType,
        },
        extra: {
          [`meaning-rating-report`]: { hanzi: `冰箱`, answer: `freezer` },
        },
      }),
    );
    expect(onRating).toHaveBeenCalledWith(
      [expect.objectContaining({ rating: originalRating, durationMs: 12_000 })],
      wasCorrect ? [] : [expect.objectContaining({ gloss: `freezer` })],
    );
    expect(onReportWrongRating).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          skill,
          rating: correctedRating,
          durationMs: 12_000,
        }),
      ],
      correctedMistakeCount === 0
        ? []
        : [expect.objectContaining({ gloss: `freezer` })],
    );
  },
);
