import { QuizDeckHanziToGlossTypedQuestion } from "@/client/ui/QuizDeckHanziToGlossTypedQuestion";
import { Use } from "@/client/ui/Use";
import { QuestionFlagKind } from "@/data/model";
import { hanziWordToGlossTypedQuestionOrThrow } from "@/data/questions/hanziWordToGlossTyped";
import { hanziWordToGlossTyped } from "@/data/skills";
import { hanziFromHanziWord, loadDictionary } from "@/dictionary/dictionary";
import { use } from "react";
import { View } from "react-native";
import { DemoHanziWordKnob, useDemoHanziWordKnob } from "./demo/helpers";

export default () => {
  const { hanziWord } = useDemoHanziWordKnob(`你好:hello`);
  const skill = hanziWordToGlossTyped(hanziWord);
  const dictionary = use(loadDictionary());
  const meanings = dictionary.lookupHanzi(hanziFromHanziWord(hanziWord));
  const flag =
    meanings.length > 1
      ? {
          kind: QuestionFlagKind.OtherMeaning,
          previousHanziWords: meanings
            .map(([h]) => h)
            .filter((h) => h !== hanziWord),
        }
      : undefined;
  const questionPromise = hanziWordToGlossTypedQuestionOrThrow(skill, flag);

  return (
    <View className="gap-4">
      <DemoHanziWordKnob hanziWords={[`你好:hello`, `长:grow`]} />
      <Use
        key={skill}
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
    </View>
  );
};
