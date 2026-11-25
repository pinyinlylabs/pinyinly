import type { Skill } from "@/data/model";
import { invariant } from "@pinyinly/lib/invariant";
import { useRef } from "react";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { Easing, Keyframe } from "react-native-reanimated";
import { DropdownMenu2 } from "./DropdownMenu2";
import { Icon } from "./Icon";
import { NativeOnlyAnimatedView } from "./NativeOnlyAnimatedView";
import { RectButton } from "./RectButton";
import { SkillAnswerText } from "./SkillAnswerText";
import { Suspense } from "./Suspense";
import { RatingReason } from "./QuizDeckRatingReason";

export function QuizDeckResultToast({
  skill,
  ratingReason,
  disableAnimation = false,
  onChangeAnswer,
  onReportWrongRating,
}: {
  skill: Skill;
  ratingReason: RatingReason;
  /**
   * Disable the enter animation for the toast, useful for demo purposes and visual snapshotting.
   */
  disableAnimation?: boolean;
  onChangeAnswer: () => void;
  onReportWrongRating?: () => void;
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
            <View
              className={`
                w-full gap-3 overflow-hidden bg-bg px-4 pt-3 pb-safe-offset-21

                sm:mb-2 sm:rounded-xl
              `}
            >
              {ratingReason === RatingReason.Perfect ? (
                <View className="flex-row items-center gap-2">
                  <Icon size={32} icon="check-circled-filled" />
                  <Text className="font-sans text-2xl font-bold">Perfect!</Text>
                  <QuizResultDropdown
                    onChangeAnswer={onChangeAnswer}
                    onReportWrongRating={onReportWrongRating}
                  />
                </View>
              ) : ratingReason === RatingReason.Good ? (
                <View className="flex-row items-center gap-2">
                  <Icon size={32} icon="check-circled-filled" />
                  <Text className="font-sans text-2xl font-bold">Nice!</Text>
                  <QuizResultDropdown
                    onChangeAnswer={onChangeAnswer}
                    onReportWrongRating={onReportWrongRating}
                  />
                </View>
              ) : ratingReason === RatingReason.Slow ? (
                <>
                  <View className="w-full flex-row items-center gap-2 self-stretch">
                    <Icon size={32} icon="meh-circled" />
                    <Text className="font-sans text-2xl font-bold">
                      Too slow
                    </Text>
                    <QuizResultDropdown
                      onChangeAnswer={onChangeAnswer}
                      onReportWrongRating={onReportWrongRating}
                    />
                  </View>
                  <Text className="font-sans text-lg/none">
                    Keep practicing and you’ll get faster!
                  </Text>
                </>
              ) : (
                (invariant(
                  ratingReason satisfies typeof RatingReason.Incorrect,
                ),
                (
                  <>
                    <View className="w-full flex-row items-center gap-2 self-stretch">
                      <Icon size={32} icon="close-circled-filled" />
                      <Text className="font-sans text-2xl font-bold">
                        Incorrect
                      </Text>
                      <QuizResultDropdown
                        onChangeAnswer={onChangeAnswer}
                        onReportWrongRating={onReportWrongRating}
                      />
                    </View>
                    <Text className="font-sans text-xl/none font-medium">
                      Correct answer:
                    </Text>

                    <Text className="font-sans">
                      <SkillAnswerText skill={skill} />
                    </Text>
                  </>
                ))
              )}
            </View>
          </View>
        </NativeOnlyAnimatedView>
      </View>
    </Suspense>
  );
}

function QuizResultDropdown({
  onChangeAnswer,
  onReportWrongRating,
}: {
  onChangeAnswer?: () => void;
  onReportWrongRating?: () => void;
}) {
  if (onChangeAnswer == null && onReportWrongRating == null) {
    return null;
  }

  return (
    <View className="ml-auto">
      <DropdownMenu2>
        <DropdownMenu2.Trigger asChild>
          <RectButton
            variant="bare"
            iconStart={onReportWrongRating == null ? `more-horizontal` : `flag`}
            accessibilityLabel={
              onReportWrongRating == null ? `More options` : `Report a problem`
            }
          />
        </DropdownMenu2.Trigger>
        <DropdownMenu2.Content align="end">
          {onChangeAnswer == null ? null : (
            <DropdownMenu2.Item onPress={onChangeAnswer}>
              <Text>Change answer</Text>
            </DropdownMenu2.Item>
          )}
          {onReportWrongRating == null ? null : (
            <DropdownMenu2.Sub>
              <DropdownMenu2.SubTrigger>
                <Text>Report a problem</Text>
              </DropdownMenu2.SubTrigger>
              <DropdownMenu2.SubContent>
                <DropdownMenu2.Item onPress={onReportWrongRating}>
                  <Text>Wrong rating</Text>
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
