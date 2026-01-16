import type { Skill } from "@/data/model";
import { Platform, Text, View } from "react-native";
import Reanimated, { Easing, Keyframe } from "react-native-reanimated";
import { IconImage } from "./IconImage";
import { SkillAnswerText } from "./SkillAnswerText";
import { Suspense } from "./Suspense";

export function QuizDeckResultToast({
  skill,
  isCorrect,
}: {
  skill: Skill;
  isCorrect: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <View className="absolute inset-x-0 bottom-0">
        <Reanimated.View entering={entering.duration(150)}>
          <View
            className={`
              flex-1 gap-[12px] overflow-hidden bg-bg px-4 pt-3 pb-safe-offset-[84px]

              lg:mb-2 lg:rounded-xl

              ${isCorrect ? `theme-success-panel` : `theme-danger-panel`}
            `}
          >
            {isCorrect ? (
              <View className="flex-row items-center gap-[8px]">
                <IconImage
                  size={32}
                  source={require(`@/assets/icons/check-circled-filled.svg`)}
                />
                <Text className="text-2xl font-bold text-fg">Nice!</Text>
              </View>
            ) : (
              <>
                <View className="flex-row items-center gap-[8px]">
                  <IconImage
                    size={32}
                    source={require(`@/assets/icons/close-circled-filled.svg`)}
                  />
                  <Text className="text-2xl font-bold text-fg">Incorrect</Text>
                </View>
                <Text className="text-xl/none font-medium text-fg">
                  Correct answer:
                </Text>

                <Text className="text-fg">
                  <SkillAnswerText skill={skill} />
                </Text>
              </>
            )}
          </View>
        </Reanimated.View>
      </View>
    </Suspense>
  );
}

const easing = Easing.quad;
const entering = Platform.select({
  // On web the `bottom: <percent>%` approach doesn't work when the
  // parent is `position: absolute`. But using `translateY: <percent>%`
  // DOES work (but this doesn't work on mobile native because only
  // pixel values are accepted).
  web: new Keyframe({
    0: {
      transform: [{ translateY: `100%` }],
    },
    100: {
      transform: [{ translateY: `0%` }],
      easing,
    },
  }),
  default: new Keyframe({
    0: {
      position: `relative`,
      bottom: `-100%`,
    },
    100: {
      position: `relative`,
      bottom: 0,
      easing,
    },
  }),
});
