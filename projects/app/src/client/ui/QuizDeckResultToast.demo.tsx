import { hanziWordToGlossTyped, hanziWordToPinyinTyped } from "@/data/skills";
import { View } from "react-native";
import {
  DemoHanziWordKnob,
  ExampleStack,
  useDemoHanziWordKnob,
} from "./demo/helpers";
import { QuizDeckResultToast } from "./QuizDeckResultToast";

export default () => {
  const { hanziWord } = useDemoHanziWordKnob(`你好:hello`);

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
          <View className="h-[150px] self-stretch">
            <QuizDeckResultToast skill={skill} isCorrect={true} />
          </View>
          <View className="h-[250px] self-stretch">
            <QuizDeckResultToast skill={skill} isCorrect={false} />
          </View>
        </ExampleStack>
      ))}
    </View>
  );
};
