import { TutorialDialogBox } from "@/client/ui/TutorialDialogBox";
import { nonNullable } from "@pinyinly/lib/invariant";
import { Image } from "expo-image";
import { View } from "react-native";
import { tv } from "tailwind-variants";

const screenClass = tv({
  base: `h-[200px] w-[400px]`,
});

export const NewWordIntro = ({ onNext: next }: { onNext: () => void }) => {
  const learnedDependencies = [] as string[] | null;
  return (
    <View className={screenClass({ class: `` })}>
      <View className="mt-auto flex-row items-end gap-4">
        <Image
          source={require(`@/assets/illustrations/tutor.svg`)}
          className="h-[94px] w-[80px] animate-fadein"
        />

        <View className="flex-1 pb-9">
          {learnedDependencies == null || learnedDependencies.length === 0 ? (
            <TutorialDialogBox
              onContinue={next}
              text="…you know **辶** means **walk or movement**, and **力** means **strength**… "
            />
          ) : learnedDependencies.length === 1 ? (
            <TutorialDialogBox
              onContinue={next}
              text={`Since you know ${nonNullable(learnedDependencies[0])}, you’re ready for your next
          lesson.`}
            />
          ) : learnedDependencies.length === 2 ? (
            <TutorialDialogBox
              onContinue={next}
              text={`Since you know ${nonNullable(learnedDependencies[0])} and ${nonNullable(learnedDependencies[1])},
          you’re ready for your next lesson.`}
            />
          ) : (
            <TutorialDialogBox
              onContinue={next}
              text={`Since you know ${nonNullable(learnedDependencies[0])}, ${nonNullable(learnedDependencies[1])} and ${nonNullable(learnedDependencies[2])}, you’re ready for your next lesson.`}
            />
          )}
        </View>
      </View>
    </View>
  );
};
