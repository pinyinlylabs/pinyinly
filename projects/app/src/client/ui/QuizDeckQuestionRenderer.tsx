import type { MistakeType, Question, UnsavedSkillRating } from "@/data/model";
import { QuestionKind } from "@/data/model";
import { QuizDeckHanziCharacterWritingQuestion } from "./QuizDeckHanziCharacterWritingQuestion";
import { QuizDeckHanziWordToGlossTypedQuestion } from "./QuizDeckHanziWordToGlossTypedQuestion";
import { QuizDeckHanziWordToPinyinTypedQuestion } from "./QuizDeckHanziWordToPinyinTypedQuestion";
import { QuizDeckOneCorrectPairQuestion } from "./QuizDeckOneCorrectPairQuestion";

type QuizDeckQuestionRendererProps = {
  question: Question;
  onNext: () => void;
  onRating: (
    ratings: readonly UnsavedSkillRating[],
    mistakes: readonly MistakeType[],
  ) => void;
  onChangeAnswer: () => void;
};

export function QuizDeckQuestionRenderer({
  question,
  ...handlers
}: QuizDeckQuestionRendererProps) {
  switch (question.kind) {
    case QuestionKind.HanziWordToGlossTyped:
      return (
        <QuizDeckHanziWordToGlossTypedQuestion
          {...handlers}
          question={question}
        />
      );
    case QuestionKind.HanziWordToPinyinTyped:
      return (
        <QuizDeckHanziWordToPinyinTypedQuestion
          {...handlers}
          question={question}
        />
      );
    case QuestionKind.OneCorrectPair:
      return (
        <QuizDeckOneCorrectPairQuestion {...handlers} question={question} />
      );
    case QuestionKind.HanziCharacterWriting:
      return (
        <QuizDeckHanziCharacterWritingQuestion
          {...handlers}
          question={question}
        />
      );
  }
}
