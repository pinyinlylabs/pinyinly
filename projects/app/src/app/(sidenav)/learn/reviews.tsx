import { ErrorBoundary } from "@/client/ui/ErrorBoundary";
import { QuizDeck } from "@/client/ui/QuizDeck";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTimeout } from "usehooks-ts";

export default function ReviewsPage() {
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => {
    setVisible(true);
  }, []);

  useTimeout(show, 500);

  return (
    <View className="flex-1 items-center bg-background pt-safe-offset-[20px]">
      {visible ? (
        <ErrorBoundary>
          <QuizDeck className="h-full w-full" />
        </ErrorBoundary>
      ) : (
        <Animated.View entering={FadeIn} className="my-auto">
          <Text className="font-karla text-lg text-primary-10">Loading</Text>
        </Animated.View>
      )}
    </View>
  );
}
