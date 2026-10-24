import type { Skill } from "@/data/model";
import { Rating } from "@/util/fsrs";
import { invariant } from "@pinyinly/lib/invariant";
import { useRef } from "react";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { Easing, Keyframe } from "react-native-reanimated";
import { DropdownMenu2 } from "./DropdownMenu2";
import { Icon } from "./Icon";
import { NativeOnlyAnimatedView } from "./NativeOnlyAnimatedView";
import { ratingToThemeName } from "./QuizDeckResultToast.utils";
import { RectButton } from "./RectButton";
import { SkillAnswerText } from "./SkillAnswerText";
import { Suspense } from "./Suspense";
import { Theme } from "./Theme";

export function QuizDeckResultToast({
  skill,
  rating,
  disableAnimation = false,
  onChangeAnswer,
  onReportWrongGrade,
}: {
  skill: Skill;
  rating: Rating;
  /**
   * Disable the enter animation for the toast, useful for demo purposes and visual snapshotting.
   */
  disableAnimation?: boolean;
  onChangeAnswer: () => void;
  onReportWrongGrade?: () => void;
}) {
  const cleanupAnimationRef = useRef<(() => void) | null>(null);

  return (
    <Suspense fallback={null}>
      <View className="absolute inset-x-0 bottom-0">
        <NativeOnlyAnimatedView
          entering={disableAnimation ? undefined : entering.duration(150)}
        >
          <View
            ref={(view) => {
              cleanupAnimationRef.current?.();
              cleanupAnimationRef.current = null;
              if (
                typeof HTMLElement === `undefined` ||
                !(view instanceof HTMLElement)
              ) {
                return;
              }
              // Reanimated reparents outgoing questions, restarting CSS enter animations.
              const stopAnimation = () => {
                view.style.animationName = `none`;
              };
              const onAnimationEnd = (event: AnimationEvent) => {
                if (event.target === view) {
                  stopAnimation();
                }
              };
              view.addEventListener(`animationend`, onAnimationEnd);
              cleanupAnimationRef.current = () => {
                view.removeEventListener(`animationend`, onAnimationEnd);
                stopAnimation();
              };
            }}
            className={
              disableAnimation
                ? undefined
                : `
                  web:duration-150 web:ease-in web:animate-in web:slide-in-from-bottom-full

                  web:motion-reduce:animate-none
                `
            }
          >
            <Theme theme={ratingToThemeName(rating)}>
              <View
                className={`
                  w-full gap-3 overflow-hidden bg-bg px-4 pt-3 pb-safe-offset-21

                  sm:mb-2 sm:rounded-xl
                `}
              >
                {rating === Rating.Easy ? (
                  <View className="flex-row items-center gap-2">
                    <Icon size={32} icon="check-circled-filled" />
                    <Text className="font-sans text-2xl font-bold text-fg">
                      Perfect!
                    </Text>
                    <QuizResultDropdown
                      onChangeAnswer={onChangeAnswer}
                      onReportWrongGrade={onReportWrongGrade}
                    />
                  </View>
                ) : rating === Rating.Good ? (
                  <View className="flex-row items-center gap-2">
                    <Icon size={32} icon="check-circled-filled" />
                    <Text className="font-sans text-2xl font-bold text-fg">
                      Nice!
                    </Text>
                    <QuizResultDropdown
                      onChangeAnswer={onChangeAnswer}
                      onReportWrongGrade={onReportWrongGrade}
                    />
                  </View>
                ) : rating === Rating.Hard ? (
                  <>
                    <View className="w-full flex-row items-center gap-2 self-stretch">
                      <Icon size={32} icon="meh-circled" />
                      <Text className="font-sans text-2xl font-bold text-fg">
                        Too slow
                      </Text>
                      <QuizResultDropdown
                        onChangeAnswer={onChangeAnswer}
                        onReportWrongGrade={onReportWrongGrade}
                      />
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
                        <QuizResultDropdown
                          onChangeAnswer={onChangeAnswer}
                          onReportWrongGrade={onReportWrongGrade}
                        />
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
          </View>
        </NativeOnlyAnimatedView>
      </View>
    </Suspense>
  );
}

function QuizResultDropdown({
  onChangeAnswer,
  onReportWrongGrade,
}: {
  onChangeAnswer?: () => void;
  onReportWrongGrade?: () => void;
}) {
  if (onChangeAnswer == null && onReportWrongGrade == null) {
    return null;
  }

  return (
    <View className="ml-auto">
      <DropdownMenu2>
        <DropdownMenu2.Trigger asChild>
          <RectButton
            variant="bare"
            iconStart={onReportWrongGrade == null ? `more-horizontal` : `flag`}
            accessibilityLabel={
              onReportWrongGrade == null ? `More options` : `Report a problem`
            }
          />
        </DropdownMenu2.Trigger>
        <DropdownMenu2.Content align="end">
          {onChangeAnswer == null ? null : (
            <DropdownMenu2.Item onPress={onChangeAnswer}>
              <Text>Change answer</Text>
            </DropdownMenu2.Item>
          )}
          {onReportWrongGrade == null ? null : (
            <DropdownMenu2.Sub>
              <DropdownMenu2.SubTrigger>
                <Text>Report a problem</Text>
              </DropdownMenu2.SubTrigger>
              <DropdownMenu2.SubContent>
                <DropdownMenu2.Item onPress={onReportWrongGrade}>
                  <Text>Wrong grade</Text>
                </DropdownMenu2.Item>
              </DropdownMenu2.SubContent>
            </DropdownMenu2.Sub>
          )}
        </DropdownMenu2.Content>
      </DropdownMenu2>
    </View>
  );
}

const entering = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ translateY: 24 }],
  },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }],
    easing: Easing.quad,
  },
});
