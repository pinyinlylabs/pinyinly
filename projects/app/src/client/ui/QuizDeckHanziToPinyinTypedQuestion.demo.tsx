import { QuizDeckHanziToPinyinTypedQuestion } from "@/client/ui/QuizDeckHanziToPinyinTypedQuestion";
import { Use } from "@/client/ui/Use";
import { QuestionFlagKind } from "@/data/model";
import { hanziWordToPinyinTypedQuestionOrThrow } from "@/data/questions/hanziWordToPinyinTyped";
import { hanziWordToPinyinTyped } from "@/data/skills";
import { hanziFromHanziWord, loadDictionary } from "@/dictionary";
import { use } from "react";
import { View } from "react-native";
import { DemoHanziWordKnob, useDemoHanziWordKnob } from "./demo/helpers";

export default () => {
  const { hanziWord } = useDemoHanziWordKnob(`你好:hello`);
  const skill = hanziWordToPinyinTyped(hanziWord);
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
      : null;
  const questionPromise = hanziWordToPinyinTypedQuestionOrThrow(skill, flag);

  return (
    <View className="gap-4">
      <DemoHanziWordKnob hanziWords={[`你好:hello`, `几:table`]} />
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
    </View>
  );
};
