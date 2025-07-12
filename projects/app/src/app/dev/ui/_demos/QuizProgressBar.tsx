import { useQuizProgress } from "@/client/hooks/useQuizProgress";
import { QuizProgressBar } from "@/client/ui/QuizProgressBar";
import { RectButton } from "@/client/ui/RectButton";
import { useCallback } from "react";
import { Text, View } from "react-native";

export default () => {
  const quizProgress = useQuizProgress();

  const logCorrect = useCallback(() => {
    quizProgress.recordAnswer(true);
  }, [quizProgress]);

  const logIncorrect = useCallback(() => {
    quizProgress.recordAnswer(false);
  }, [quizProgress]);

  return (
    <View className="w-full gap-2">
      <View className="min-h-[32px]">
        <QuizProgressBar progress={3} />
      </View>
      <View className="min-h-[32px]">
        <QuizProgressBar progress={11} />
      </View>
      <View className="min-h-[32px]">
        <QuizProgressBar progress={quizProgress.progress} />
      </View>
      <View className="flex-row items-start gap-4">
        <View className="flex-row items-center gap-2">
          <Text className="pyly-dev-dt">Answer:</Text>
          <RectButton variant="outline" onPress={logCorrect}>
            Correct
          </RectButton>
          <RectButton variant="outline" onPress={logIncorrect}>
            Incorrect
          </RectButton>
        </View>
      </View>
    </View>
  );
};
