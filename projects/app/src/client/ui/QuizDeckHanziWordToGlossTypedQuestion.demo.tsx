import {
  GlossTextInputSingle,
  QuizDeckHanziWordToGlossTypedQuestion,
} from "@/client/ui/QuizDeckHanziWordToGlossTypedQuestion";
import { Use } from "@/client/ui/Use";
import { QuestionFlagKind } from "@/data/model";
import { hanziWordToGlossTypedQuestionOrThrow } from "@/data/questions/hanziWordToGlossTyped";
import { hanziWordToGlossTyped } from "@/data/skills";
import { hanziFromHanziWord, loadDictionary } from "@/dictionary";
import { use } from "react";
import { View } from "react-native";
import {
  DemoHanziWordKnob,
  ExampleStack,
  LittlePrimaryHeader,
  useDemoHanziWordKnob,
} from "./demo/helpers";

export default () => {
  const { hanziWord } = useDemoHanziWordKnob(`你好:hello`);
  const skill = hanziWordToGlossTyped(hanziWord);
  const dictionary = use(loadDictionary());
  const meanings = dictionary.lookupHanzi(hanziFromHanziWord(hanziWord));
  const flag =
    meanings.length > 1
      ? {
          kind: QuestionFlagKind.OtherAnswer,
          previousHanziWords: meanings
            .map(([h]) => h)
            .filter((h) => h !== hanziWord),
        }
      : null;
  const questionPromise = hanziWordToGlossTypedQuestionOrThrow(skill, flag);

  return (
    <View className="flex-1 gap-4">
      <DemoHanziWordKnob hanziWords={[`你好:hello`, `长:grow`]} />
      <Use
        key={skill}
        promise={questionPromise}
        render={(question) => (
          <View>
            <QuizDeckHanziWordToGlossTypedQuestion
              noAutoFocus
              onNext={() => {
                console.log(`onNext()`);
              }}
              onRating={() => {
                console.log(`onRating()`);
              }}
              onUndo={() => {
                console.log(`onUndo()`);
              }}
              question={question}
            />
          </View>
        )}
      />

      <LittlePrimaryHeader title="GlossTextInputSingle" />

      <View className="flex-row flex-wrap">
        <ExampleStack title="Default">
          <GlossTextInputSingle
            autoFocus={false}
            disabled={false}
            onChangeText={(text) => {
              console.log(`onChangeText`, text);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>

        <ExampleStack title="With hint">
          <GlossTextInputSingle
            autoFocus={false}
            disabled={false}
            hintText="This is a hint."
            onChangeText={(text) => {
              console.log(`onChangeText`, text);
            }}
            onSubmit={() => {
              console.log(`onSubmit`);
            }}
          />
        </ExampleStack>
      </View>
    </View>
  );
};
