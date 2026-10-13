import type { Skill } from "@/data/model";
import { Rating } from "@/util/fsrs";
import { invariant } from "@pinyinly/lib/invariant";
import { Platform } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import Reanimated, { Easing, Keyframe } from "react-native-reanimated";
import { DropdownMenu2 } from "./DropdownMenu2";
import { Icon } from "./Icon";
import { ratingToThemeName } from "./QuizDeckResultToast.utils";
import { RectButton } from "./RectButton";
import { SkillAnswerText } from "./SkillAnswerText";
import { Suspense } from "./Suspense";
import { Theme } from "./Theme";

export function QuizDeckResultToast({
  skill,
  rating,
  disableAnimation = false,
  onRepeatQuestion,
}: {
  skill: Skill;
  rating: Rating;
  /**
   * Disable the enter animation for the toast, useful for demo purposes and visual snapshotting.
   */
  disableAnimation?: boolean;
  onRepeatQuestion: () => void;
}) {
  return (
    <Suspense fallback={null}>
      <View className="absolute inset-x-0 bottom-0">
        <Reanimated.View
          entering={disableAnimation ? undefined : entering.duration(150)}
        >
          <Theme theme={ratingToThemeName(rating)}>
            <View
              className={`
                flex-1 gap-3 overflow-hidden bg-bg px-4 pt-3 pb-safe-offset-21

                sm:mb-2 sm:rounded-xl
              `}
            >
              {rating === Rating.Easy ? (
                <View className="flex-row items-center gap-2">
                  <Icon size={32} icon="check-circled-filled" />
                  <Text className="font-sans text-2xl font-bold text-fg">
                    Perfect!
                  </Text>
                </View>
              ) : rating === Rating.Good ? (
                <View className="flex-row items-center gap-2">
                  <Icon size={32} icon="check-circled-filled" />
                  <Text className="font-sans text-2xl font-bold text-fg">
                    Nice!
                  </Text>
                </View>
              ) : rating === Rating.Hard ? (
                <>
                  <View className="w-full flex-row items-center gap-2 self-stretch">
                    <Icon size={32} icon="meh-circled" />
                    <Text className="font-sans text-2xl font-bold text-fg">
                      Too slow
                    </Text>
                    <UndoAnswerDropdown onRepeatQuestion={onRepeatQuestion} />
                  </View>
                  <Text className="font-sans text-lg/none text-fg">
                    Keep practicing and you’ll get faster!
                  </Text>
                </>
              ) : (
                (invariant(rating satisfies typeof Rating.Again),
                (
                  <>
                    <View className="w-full flex-row items-center gap-2 self-stretch">
                      <Icon size={32} icon="close-circled-filled" />
                      <Text className="font-sans text-2xl font-bold text-fg">
                        Incorrect
                      </Text>
                      <UndoAnswerDropdown onRepeatQuestion={onRepeatQuestion} />
                    </View>
                    <Text className="font-sans text-xl/none font-medium text-fg">
                      Correct answer:
                    </Text>

                    <Text className="font-sans text-fg">
                      <SkillAnswerText skill={skill} />
                    </Text>
                  </>
                ))
              )}
            </View>
          </Theme>
        </Reanimated.View>
      </View>
    </Suspense>
  );
}

function UndoAnswerDropdown({
  onRepeatQuestion,
}: {
  onRepeatQuestion: () => void;
}) {
  return (
    <View className="ml-auto">
      <DropdownMenu2>
        <DropdownMenu2.Trigger asChild>
          <RectButton
            variant="bareDim"
            iconStart="more-horizontal"
            iconSize={20}
          />
        </DropdownMenu2.Trigger>
        <DropdownMenu2.Content align="end">
          <DropdownMenu2.Item onPress={onRepeatQuestion}>
            <Text>Repeat question</Text>
          </DropdownMenu2.Item>
        </DropdownMenu2.Content>
      </DropdownMenu2>
    </View>
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
