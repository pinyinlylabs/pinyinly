import { QuizDeckHanziToPinyinQuestion } from "@/client/ui/QuizDeckHanziToPinyinQuestion";
import { Use } from "@/client/ui/Use";
import { hanziWordToPinyinQuestionOrThrow } from "@/data/questions/hanziWordToPinyin";
import { hanziWordToPinyinTyped } from "@/data/skills";
import { buildHanziWord } from "@/dictionary/dictionary";

export default () => {
  const skill = hanziWordToPinyinTyped(buildHanziWord(`你好`, `hello`));
  const questionPromise = hanziWordToPinyinQuestionOrThrow(skill);

  return (
    <Use
      promise={questionPromise}
      render={(question) => (
        <QuizDeckHanziToPinyinQuestion
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
