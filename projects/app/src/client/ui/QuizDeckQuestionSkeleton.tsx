import type { Skill } from "@/data/model";
import type { Rating } from "@/util/fsrs";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QuizDeckResultToast } from "./QuizDeckResultToast";
import { QuizSubmitButton } from "./QuizSubmitButton";
import { RectButton } from "./RectButton";

interface QuizDeckQuestionSkeletonGrade {
  rating: Rating;
}

export function QuizDeckQuestionSkeleton({
  children,
  grade,
  isUserAnswerProvided,
  onSubmit,
  onUndo,
  showIdkButton = false,
  skill,
}: {
  children: ReactNode;
  grade?: QuizDeckQuestionSkeletonGrade;
  isUserAnswerProvided: boolean;
  onSubmit: () => void;
  onUndo: () => void;
  showIdkButton?: boolean;
  skill: Skill;
}) {
  const insets = useSafeAreaInsets();
  const submitButtonHeight = 44;
  const idkButtonHeight = showIdkButton ? 28 : 0;
  const idkButtonGap = showIdkButton ? 8 : 0;
  const submitButtonInsetBottom = insets.bottom + 20;

  return (
    <>
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
          onUndo={onUndo}
        />
      )}
      {showIdkButton ? (
        <View
          className="absolute inset-x-4 items-center"
          style={{
            bottom: submitButtonInsetBottom + submitButtonHeight + idkButtonGap,
            height: idkButtonHeight,
          }}
        >
          <RectButton
            variant="bareDim"
            disabled={grade != null}
            onPress={onSubmit}
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
          isUserAnswerProvided={isUserAnswerProvided}
          rating={grade?.rating}
          onPress={onSubmit}
        />
      </View>
    </>
  );
}
