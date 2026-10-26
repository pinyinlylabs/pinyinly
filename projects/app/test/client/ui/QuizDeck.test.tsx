// @vitest-environment happy-dom

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { hanziWordToGlossTyped } from "#data/skills.ts";
import type { Skill } from "#data/model.ts";
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
    recordAnswer: () => {},
  }),
}));
vi.mock(`#client/ui/hooks/useRizzle.ts`, () => ({
  useRizzle: () => ({ mutate: {} }),
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
    }: {
      question: { answer: { skill: Skill } };
      onNext: () => void;
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
      return jsx(`button`, {
        "data-testid": `current-question`,
        "data-skill": question.answer.skill,
        onClick: onNext,
        children: `Continue`,
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
