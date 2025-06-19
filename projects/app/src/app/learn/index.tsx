import { ErrorBoundary } from "@/client/ui/ErrorBoundary";
import { QuizDeck } from "@/client/ui/QuizDeck";
import { View } from "react-native";

export default function ReviewsPage() {
  return (
    <View
      className={`
        flex-1 items-center bg-bg pt-safe-offset-2

        md:pt-safe-offset-5
      `}
    >
      <ErrorBoundary>
        <QuizDeck className="size-full" />
      </ErrorBoundary>
    </View>
  );
}
