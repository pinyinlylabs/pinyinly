import { QuizDeckHanziToGlossTypedQuestion } from "@/client/ui/QuizDeckHanziToGlossTypedQuestion";
import { Use } from "@/client/ui/Use";
import { hanziWordToGlossTypedQuestionOrThrow } from "@/data/questions/hanziWordToGlossTyped";
import { hanziWordToGloss } from "@/data/skills";
import { buildHanziWord } from "@/dictionary/dictionary";

export default () => {
  const skill = hanziWordToGloss(buildHanziWord(`你好`, `hello`));
  const questionPromise = hanziWordToGlossTypedQuestionOrThrow(skill);

  return (
    <Use
      promise={questionPromise}
      render={(question) => (
        <QuizDeckHanziToGlossTypedQuestion
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
