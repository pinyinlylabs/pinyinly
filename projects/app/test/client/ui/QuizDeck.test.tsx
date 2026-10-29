// @vitest-environment happy-dom

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { hanziWordToGlossTyped } from "#data/skills.ts";
import type { MistakeType, Skill } from "#data/model.ts";
import { Rating } from "#util/fsrs.ts";
import type { ReactNode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { QuizDeck } from "#client/ui/QuizDeck.tsx";

const mocks = vi.hoisted(() => ({
  skillQueue: undefined as unknown,
  generateQuestion: vi.fn(),
  renderQuestion: vi.fn(),
  mountQuestion: vi.fn(),
  pending: null as Promise<undefined> | null,
  pendingSkill: null as Skill | null,
  rateSkill: vi.fn(async (_input: { rating: number; reviewId: string }) => {}),
  undoReview: vi.fn(async () => {}),
  saveHanziGlossMistake: vi.fn(async () => {}),
  saveHanziPinyinMistake: vi.fn(async () => {}),
  recordAnswer: vi.fn(),
  replaceAnswer: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pending = null;
  mocks.pendingSkill = null;
});

vi.mock(`#client/ui/hooks/usePostHog.tsx`, () => ({
  usePostHog: () => ({ capture: () => {} }),
}));
vi.mock(`#client/ui/hooks/usePrefetchImages.ts`, () => ({
  usePrefetchImages: () => {},
}));
vi.mock(`#client/ui/hooks/useQuizProgress.ts`, () => ({
  useQuizProgress: () => ({
    progress: 0,
    undo: () => {},
    recordAnswer: mocks.recordAnswer,
    replaceAnswer: mocks.replaceAnswer,
  }),
}));
vi.mock(`#client/ui/hooks/useRizzle.ts`, () => ({
  useRizzle: () => ({
    mutate: {
      rateSkill: mocks.rateSkill,
      undoReview: mocks.undoReview,
      saveHanziGlossMistake: mocks.saveHanziGlossMistake,
      saveHanziPinyinMistake: mocks.saveHanziPinyinMistake,
    },
  }),
}));
vi.mock(`#client/ui/hooks/useSkillQueue.ts`, () => ({
  useSkillQueue: () => mocks.skillQueue,
}));
vi.mock(`#client/ui/hooks/useSoundEffect.tsx`, () => ({
  useSoundEffect: () => () => {},
}));
vi.mock(import(`#data/questions.ts`), async () => {
  const { QuestionKind } = await import(`#data/model.ts`);

  return {
    generateQuestionForSkillOrThrow: async (skill: Skill) => {
      mocks.generateQuestion(skill, null);
      return {
        kind: QuestionKind.OneCorrectPair,
        prompt: `Pair`,
        answer: { as: [], bs: [], skill },
        groupA: [],
        groupB: [],
        flag: null,
      };
    },
  };
});
vi.mock(`expo-router`, async () => {
  const { jsx } = await import(`react/jsx-runtime`);

  return {
    Link: ({ children }: { children: ReactNode }) => jsx(`div`, { children }),
  };
});
vi.mock(`react-native-reanimated`, async () => {
  const { jsx } = await import(`react/jsx-runtime`);

  return {
    default: {
      View: ({ children }: { children: ReactNode }) => jsx(`div`, { children }),
    },
    FadeIn: {},
    Keyframe: class {
      duration() {
        return this;
      }
    },
  };
});
vi.mock(`#client/ui/QuizDeckHanziWordToGlossTypedQuestion.tsx`, async () => {
  const { jsx } = await import(`react/jsx-runtime`);

  return {
    QuizDeckHanziWordToGlossTypedQuestion: ({
      question,
      onNext,
    }: {
      question: { skill: Skill };
      onNext: () => void;
    }) =>
      jsx(
        `button`,
        {
          "data-testid": `current-question`,
          "data-skill": question.skill,
          onClick: onNext,
          children: `Continue`,
        },
        question.skill,
      ),
  };
});
vi.mock(`#client/ui/QuizDeckHanziWordToPinyinTypedQuestion.tsx`, () => {
  return {
    QuizDeckHanziWordToPinyinTypedQuestion: () => null,
  };
});
vi.mock(`#client/ui/QuizDeckOneCorrectPairQuestion.tsx`, async () => {
  const { jsx } = await import(`react/jsx-runtime`);
  const { use, useEffect } = await import(`react`);

  return {
    QuizDeckOneCorrectPairQuestion: ({
      question,
      onNext,
      onRating,
      onReportWrongRating,
    }: {
      question: { answer: { skill: Skill } };
      onNext: () => void;
      onRating: (
        ratings: readonly {
          skill: Skill;
          rating: number;
          durationMs: number;
        }[],
        mistakes: readonly MistakeType[],
      ) => void;
      onReportWrongRating: (
        ratings: readonly {
          skill: Skill;
          rating: number;
          durationMs: number;
        }[],
        mistakes: readonly MistakeType[],
      ) => void;
    }) => {
      mocks.renderQuestion(question.answer.skill);
      useEffect(() => {
        mocks.mountQuestion(question.answer.skill);
      }, [question.answer.skill]);
      if (
        mocks.pending != null &&
        (mocks.pendingSkill == null ||
          mocks.pendingSkill === question.answer.skill)
      ) {
        use(mocks.pending);
      }
      return jsx(`div`, {
        children: [
          jsx(`button`, {
            "data-testid": `current-question`,
            "data-skill": question.answer.skill,
            onClick: onNext,
            children: `Continue`,
          }),
          jsx(`button`, {
            onClick: () => {
              onRating(
                [
                  {
                    skill: question.answer.skill,
                    rating: Rating.Again,
                    durationMs: 12_000,
                  },
                ],
                [],
              );
            },
            children: `Record incorrect rating`,
          }),
          jsx(`button`, {
            onClick: () => {
              onReportWrongRating(
                [
                  {
                    skill: question.answer.skill,
                    rating: Rating.Hard,
                    durationMs: 12_000,
                  },
                ],
                [],
              );
            },
            children: `Report rating`,
          }),
        ],
      });
    },
  };
});

test(`shows a loading fallback while the current question suspends`, async () => {
  mocks.skillQueue = skillQueue([firstSkill, secondSkill]);
  const pending = Promise.withResolvers<undefined>();
  mocks.pending = pending.promise;
  const view = render(<QuizDeck />);

  await waitFor(() => {
    expect(mocks.generateQuestion).toHaveBeenCalledWith(firstSkill, null);
    expect(screen.getByText(`Loading`)).toBeInTheDocument();
  });
  expect(screen.queryByTestId(`current-question`)).not.toBeInTheDocument();

  await act(async () => {
    mocks.pending = null;
    pending.resolve(undefined);
  });
  expect(
    await screen.findByRole(`button`, { name: `Continue` }),
  ).toHaveAttribute(`data-skill`, firstSkill);
  view.unmount();
});
vi.mock(`#client/ui/QuizDeckHanziCharacterWritingQuestion.tsx`, () => ({
  QuizDeckHanziCharacterWritingQuestion: () => null,
}));
vi.mock(`#client/ui/QuizProgressBar.tsx`, () => ({
  QuizProgressBar: () => null,
}));
vi.mock(`#client/ui/QuizQueueButton.tsx`, () => ({
  QuizQueueButton: () => null,
}));
vi.mock(`#client/ui/RectButton.tsx`, () => ({ RectButton: () => null }));

const firstSkill = hanziWordToGlossTyped(`你好:hello`);
const secondSkill = hanziWordToGlossTyped(`好:good`);
const thirdSkill = hanziWordToGlossTyped(`人:person`);

test(`loads the next question in a hidden Activity without blocking the current question`, async () => {
  mocks.skillQueue = skillQueue([firstSkill, secondSkill]);
  const pending = Promise.withResolvers<undefined>();
  mocks.pending = pending.promise;
  mocks.pendingSkill = secondSkill;
  const view = render(<QuizDeck />);

  await waitFor(() => {
    expect(mocks.renderQuestion).toHaveBeenCalledWith(secondSkill);
  });
  expect(screen.getByRole(`button`, { name: `Continue` })).toHaveAttribute(
    `data-skill`,
    firstSkill,
  );
  expect(screen.queryByText(`Loading`)).not.toBeInTheDocument();
  expect(mocks.mountQuestion).not.toHaveBeenCalledWith(secondSkill);

  await act(async () => {
    mocks.pending = null;
    pending.resolve(undefined);
  });
  expect(mocks.mountQuestion).not.toHaveBeenCalledWith(secondSkill);
  expect(screen.getAllByRole(`button`, { name: `Continue` })).toHaveLength(1);

  fireEvent.click(screen.getByRole(`button`, { name: `Continue` }));
  await waitFor(() => {
    expect(screen.getByRole(`button`, { name: `Continue` })).toHaveAttribute(
      `data-skill`,
      secondSkill,
    );
  });
  view.unmount();
});

function skillQueue(skills: Skill[]) {
  return {
    loading: false,
    reviewQueue: {
      items: skills.map((skill) => ({ skill })),
      blockedCount: 0,
      retryCount: 0,
      dueCount: 0,
      newContentCount: skills.length,
      newDifficultyCount: 0,
      newDueAt: null,
      newOverDueAt: null,
      overDueCount: 0,
    },
  };
}

test(`keeps the reserved next question when the queue reorders`, async () => {
  mocks.skillQueue = skillQueue([firstSkill, secondSkill]);

  const view = render(<QuizDeck />);

  await waitFor(() => {
    expect(screen.getByRole(`button`, { name: `Continue` })).toHaveAttribute(
      `data-skill`,
      firstSkill,
    );
    expect(mocks.generateQuestion).toHaveBeenCalledWith(secondSkill, null);
    expect(mocks.renderQuestion).toHaveBeenCalledWith(secondSkill);
  });
  expect(mocks.mountQuestion).not.toHaveBeenCalledWith(secondSkill);
  expect(screen.getAllByRole(`button`, { name: `Continue` })).toHaveLength(1);

  mocks.skillQueue = skillQueue([thirdSkill, secondSkill]);
  view.rerender(<QuizDeck />);
  fireEvent.click(screen.getByRole(`button`, { name: `Continue` }));

  await waitFor(() => {
    expect(screen.getByRole(`button`, { name: `Continue` })).toHaveAttribute(
      `data-skill`,
      secondSkill,
    );
  });
  expect(mocks.mountQuestion).toHaveBeenCalledWith(secondSkill);
  view.unmount();
});

test(`replaces the reported review and corrects quiz progress`, async () => {
  mocks.skillQueue = skillQueue([firstSkill]);
  const view = render(<QuizDeck />);

  await screen.findByRole(`button`, { name: `Continue` });
  fireEvent.click(
    screen.getByRole(`button`, { name: `Record incorrect rating` }),
  );
  await waitFor(() => {
    expect(mocks.rateSkill).toHaveBeenCalledTimes(1);
  });
  fireEvent.click(screen.getByRole(`button`, { name: `Report rating` }));

  await waitFor(() => {
    expect(mocks.undoReview).toHaveBeenCalledTimes(1);
    expect(mocks.rateSkill).toHaveBeenCalledTimes(2);
  });

  const [originalReview, correctedReview] = mocks.rateSkill.mock.calls.map(
    ([review]) => review,
  );
  expect(originalReview?.rating).toBe(Rating.Again);
  expect(correctedReview?.rating).toBe(Rating.Hard);
  expect(mocks.undoReview).toHaveBeenCalledWith(
    expect.objectContaining({ reviewId: originalReview?.reviewId }),
  );
  expect(correctedReview?.reviewId).not.toBe(originalReview?.reviewId);
  expect(mocks.recordAnswer).toHaveBeenCalledWith(false);
  expect(mocks.replaceAnswer).toHaveBeenCalledWith(true);

  view.unmount();
});
