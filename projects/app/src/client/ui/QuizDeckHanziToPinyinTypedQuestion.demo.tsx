import { QuizDeckHanziToPinyinTypedQuestion } from "@/client/ui/QuizDeckHanziToPinyinTypedQuestion";
import { Use } from "@/client/ui/Use";
import { hanziWordToPinyinTypedQuestionOrThrow } from "@/data/questions/hanziWordToPinyinTyped";
import { hanziWordToPinyinTyped } from "@/data/skills";
import { buildHanziWord } from "@/dictionary/dictionary";

export default () => {
  const skill = hanziWordToPinyinTyped(buildHanziWord(`你好`, `hello`));
  const questionPromise = hanziWordToPinyinTypedQuestionOrThrow(skill);

  return (
    <Use
      promise={questionPromise}
      render={(question) => (
        <QuizDeckHanziToPinyinTypedQuestion
          noAutoFocus
          onNext={() => {
            console.log(`onNext()`);
          }}
          onRating={() => {
            console.log(`onRating()`);
          }}
          question={question}
        />
      )}
    />
  );
};
