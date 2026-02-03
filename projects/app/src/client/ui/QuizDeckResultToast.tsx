import type { Skill } from "@/data/model";
import { Rating } from "@/util/fsrs";
import { invariant } from "@pinyinly/lib/invariant";
import { Platform, Text, View } from "react-native";
import Reanimated, { Easing, Keyframe } from "react-native-reanimated";
import type { FloatingMenuModalMenuProps } from "./FloatingMenuModal";
import { FloatingMenuModal } from "./FloatingMenuModal";
import { IconImage } from "./IconImage";
import { RectButton } from "./RectButton";
import { SkillAnswerText } from "./SkillAnswerText";
import { Suspense } from "./Suspense";

export function QuizDeckResultToast({
  skill,
  rating,
  disableAnimation = false,
  onUndo,
}: {
  skill: Skill;
  rating: Rating;
  /**
   * Disable the enter animation for the toast, useful for demo purposes and visual snapshotting.
   */
  disableAnimation?: boolean;
  onUndo: () => void;
}) {
  return (
    <Suspense fallback={null}>
      <View className="absolute inset-x-0 bottom-0">
        <Reanimated.View
          entering={disableAnimation ? undefined : entering.duration(150)}
        >
          <View
            className={`
              flex-1 gap-[12px] overflow-hidden bg-bg px-4 pt-3 pb-safe-offset-[84px]

              lg:mb-2 lg:rounded-xl

              ${ratingToThemeClass(rating)}
            `}
          >
            {rating === Rating.Easy ? (
              <View className="flex-row items-center gap-[8px]">
                <IconImage
                  size={32}
                  source={require(
                    `../../assets/icons/check-circled-filled.svg`,
                  )}
                />
                <Text className="text-2xl font-bold text-fg">Perfect!</Text>
              </View>
            ) : rating === Rating.Good ? (
              <View className="flex-row items-center gap-[8px]">
                <IconImage
                  size={32}
                  source={require(
                    `../../assets/icons/check-circled-filled.svg`,
                  )}
                />
                <Text className="text-2xl font-bold text-fg">Nice!</Text>
              </View>
            ) : rating === Rating.Hard ? (
              <>
                <View className="flex-row items-center gap-[8px]">
                  <IconImage
                    size={32}
                    source={require(`../../assets/icons/meh-circled.svg`)}
                  />
                  <FloatingMenuModal menu={<UndoAnswerMenu onUndo={onUndo} />}>
                    <Text className="pyly-ref pyly-ref-2xl text-2xl font-bold text-fg">
                      Too slow
                    </Text>
                  </FloatingMenuModal>
                </View>
                <Text className="text-lg/none text-fg">
                  Keep practicing and you’ll get faster!
                </Text>
              </>
            ) : (
              (invariant(rating satisfies typeof Rating.Again),
              (
                <>
                  <View className="flex-row items-center gap-[8px]">
                    <IconImage
                      size={32}
                      source={require(
                        `@/assets/icons/close-circled-filled.svg`,
                      )}
                    />
                    <FloatingMenuModal
                      menu={<UndoAnswerMenu onUndo={onUndo} />}
                    >
                      <Text className="pyly-ref pyly-ref-2xl text-2xl font-bold text-fg">
                        Incorrect
                      </Text>
                    </FloatingMenuModal>
                  </View>
                  <Text className="text-xl/none font-medium text-fg">
                    Correct answer:
                  </Text>

                  <Text className="text-fg">
                    <SkillAnswerText skill={skill} />
                  </Text>
                </>
              ))
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

export function ratingToThemeClass(rating: Rating) {
  switch (rating) {
    case Rating.Easy:
    case Rating.Good: {
      return `theme-success-panel`;
    }
    case Rating.Hard: {
      return `theme-warning-panel`;
    }
    case Rating.Again: {
      return `theme-danger-panel`;
    }
  }
}

function UndoAnswerMenu({
  onUndo,
  onRequestClose,
}: {
  onUndo: () => void;
} & FloatingMenuModalMenuProps) {
  const handleUndo = () => {
    onUndo();
    onRequestClose?.();
  };

  return (
    <View className="rounded-xl bg-bg-high px-4 py-3">
      <RectButton variant="bare" onPress={handleUndo}>
        Undo answer
      </RectButton>
    </View>
  );
}
