import type { Skill } from "@/data/model";
import type { Rating } from "@/util/fsrs";
import type { ReactNode } from "react";
import { View } from "@/client/ui/View";
import { useLockFn } from "@/client/ui/hooks/useLockFn";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QuizDeckResultToast } from "./QuizDeckResultToast";
import { QuizSubmitButton } from "./QuizSubmitButton";
import { RectButton } from "./RectButton";
import { useState } from "react";

interface QuizDeckQuestionSkeletonGrade {
  rating: Rating;
}

export function QuizDeckQuestionSkeleton({
  children,
  grade,
  isUserAnswerProvided,
  onSubmit,
  onChangeAnswer,
  onReportWrongGrade,
  showIdkButton = false,
  skill,
}: {
  children: ReactNode;
  grade?: QuizDeckQuestionSkeletonGrade;
  isUserAnswerProvided: boolean;
  onSubmit: () => Promise<void> | void;
  onChangeAnswer: () => void;
  onReportWrongGrade?: () => void;
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
      {grade == null ? null : (
        <QuizDeckResultToast
          skill={skill}
          rating={grade.rating}
          onChangeAnswer={onChangeAnswer}
          onReportWrongGrade={onReportWrongGrade}
        />
      )}
      {showIdkButton ? (
        <View
          className="absolute inset-x-4 items-center"
          style={{
            bottom: submitButtonInsetBottom + submitButtonHeight + idkButtonGap,
            height: idkButtonHeight,
            visibility: grade == null ? `visible` : `hidden`,
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
      <View
        className="absolute inset-x-4 flex-row items-stretch"
        style={{
          bottom: submitButtonInsetBottom,
          height: submitButtonHeight,
        }}
      >
        <QuizSubmitButton
          autoFocus={showIdkButton && grade != null}
          isChecking={isChecking}
          isUserAnswerProvided={isUserAnswerProvided}
          rating={grade?.rating}
          onPress={() => {
            void submit();
          }}
        />
      </View>
    </View>
  );
}
