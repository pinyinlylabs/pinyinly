import { QuizDeckHanziToGlossTypedQuestion } from "@/client/ui/QuizDeckHanziToGlossTypedQuestion";
import { Use } from "@/client/ui/Use";
import { hanziWordToGlossTypedQuestionOrThrow } from "@/data/questions/hanziWordToGlossTyped";
import { hanziWordToGlossTyped } from "@/data/skills";
import { View } from "react-native";
import { DemoHanziWordKnob, useDemoHanziWordKnob } from "./demo/helpers";

export default () => {
  const { hanziWord } = useDemoHanziWordKnob(`你好:hello`);
  const skill = hanziWordToGlossTyped(hanziWord);
  const questionPromise = hanziWordToGlossTypedQuestionOrThrow(skill);

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
