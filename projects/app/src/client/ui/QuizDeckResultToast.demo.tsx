import { DemoHanziWordKnob, ExampleStack } from "@/client/ui/demo/components";
import { useDemoHanziWordKnob } from "@/client/ui/demo/utils";
import { hanziWordToGlossTyped, hanziWordToPinyinTyped } from "@/data/skills";
import { Rating } from "@/util/fsrs";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QuizDeckResultToast } from "./QuizDeckResultToast";
import { QuizSubmitButton } from "./QuizSubmitButton";

export default () => {
  const { hanziWord } = useDemoHanziWordKnob(`你好:hello`);
  const insets = useSafeAreaInsets();
  const submitButtonHeight = 44;
  const submitButtonInsetBottom = insets.bottom + 20;

  const skills = [
    hanziWordToGlossTyped(hanziWord),
    hanziWordToPinyinTyped(hanziWord),
  ];

  return (
    <View className="flex-1 gap-4">
      <DemoHanziWordKnob hanziWords={[`你好:hello`, `长:grow`]} />

      {skills.map((skill) => (
        <ExampleStack
          title={skill}
          key={skill}
          showFrame
          childrenClassName={`px-2 py-1 gap-1 self-stretch`}
        >
          {(
            [
              [`Correct (Easy)`, `h-[150px]`, Rating.Easy],
              [`Correct (Good)`, `h-[150px]`, Rating.Good],
              [`Correct (Hard)`, `h-[200px]`, Rating.Hard],
              [`Incorrect`, `h-[250px]`, Rating.Again],
            ] as const
          ).map(([label, css, rating]) => (
            <View
              className={`flex-row items-center gap-2 self-stretch`}
              key={label}
            >
              <Text className="pyly-dev-dt w-[100px]">{label}</Text>
              <View
                className={`
                  flex-1 self-stretch

                  ${css}
                `}
              >
                <QuizDeckResultToast
                  skill={skill}
                  rating={rating}
                  disableAnimation
                  onUndo={() => {
                    console.log(`onUndo`);
                  }}
                />
                <View
                  className="absolute inset-x-4 flex-row items-stretch"
                  style={{
                    bottom: submitButtonInsetBottom,
                    height: submitButtonHeight,
                  }}
                >
                  <QuizSubmitButton rating={rating} disabled={false} />
                </View>
              </View>
            </View>
          ))}
        </ExampleStack>
      ))}
    </View>
  );
};
