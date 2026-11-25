import type { Skill } from "@/data/model";
import type { ReactNode } from "react";
import { View } from "@/client/ui/View";
import { useLockFn } from "@/client/ui/hooks/useLockFn";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QuizDeckResultToast } from "./QuizDeckResultToast";
import { QuizSubmitButton } from "./QuizSubmitButton";
import { RectButton } from "./RectButton";
import { useState } from "react";
import type { RatingReason } from "./QuizDeckRatingReason";
import { ratingReasonToThemeName } from "./QuizDeckResultToast.utils";
import { Theme } from "./Theme";

export function QuizDeckQuestionSkeleton({
  children,
  ratingReason,
  isUserAnswerProvided,
  onSubmit,
  onChangeAnswer,
  onReportWrongRating,
  showIdkButton = false,
  skill,
}: {
  children: ReactNode;
  ratingReason: RatingReason | null;
  isUserAnswerProvided: boolean;
  onSubmit: () => Promise<void> | void;
  onChangeAnswer: () => void;
  onReportWrongRating?: () => void;
  showIdkButton?: boolean;
  skill: Skill;
}) {
  const [isChecking, setIsChecking] = useState(false);
  const submit = useLockFn(async () => {
    const result = onSubmit();
    if (result == null) {
      return;
    }

    setIsChecking(true);
    try {
      await result;
    } finally {
      setIsChecking(false);
    }
  });
  const insets = useSafeAreaInsets();
  const submitButtonHeight = 44;
  const idkButtonHeight = showIdkButton ? 28 : 0;
  const idkButtonGap = showIdkButton ? 16 : 0;
  const submitButtonInsetBottom = insets.bottom + 20;
  const submitDisabled = ratingReason == null && !isUserAnswerProvided;
  const resultTheme = submitDisabled
    ? undefined
    : ratingReason == null
      ? `success-panel`
      : ratingReasonToThemeName(ratingReason);

  return (
    <View className="flex-1">
      <View
        className="flex-1 px-4"
        style={{ paddingBottom: submitButtonInsetBottom }}
      >
        {children}
        <View
          // Placeholder to reserve space for the absolute-positioned action rows.
          className="mt-[5px]"
          style={{
            height: submitButtonHeight + idkButtonHeight + idkButtonGap,
          }}
        />
      </View>
      {showIdkButton ? (
        <View
          className="absolute inset-x-4 items-center"
          style={{
            bottom: submitButtonInsetBottom + submitButtonHeight + idkButtonGap,
            height: idkButtonHeight,
            visibility: ratingReason == null ? `visible` : `hidden`,
          }}
        >
          <RectButton
            variant="bareDim"
            disabled={isChecking}
            onPress={() => {
              void submit();
            }}
            className="text-base text-muted-fg/50"
          >
            I don&apos;t know
          </RectButton>
        </View>
      ) : null}
      <Theme theme={resultTheme}>
        {ratingReason == null ? null : (
          <QuizDeckResultToast
            skill={skill}
            ratingReason={ratingReason}
            onChangeAnswer={onChangeAnswer}
            onReportWrongRating={onReportWrongRating}
          />
        )}
        <View
          className="absolute inset-x-4 flex-row items-stretch"
          style={{
            bottom: submitButtonInsetBottom,
            height: submitButtonHeight,
          }}
        >
          <QuizSubmitButton
            autoFocus={showIdkButton && ratingReason != null}
            isChecking={isChecking}
            isUserAnswerProvided={isUserAnswerProvided}
            ratingReason={ratingReason}
            onPress={() => {
              void submit();
            }}
          />
        </View>
      </Theme>
    </View>
  );
}
