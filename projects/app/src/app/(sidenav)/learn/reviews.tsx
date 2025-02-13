import { questionsForReview2 } from "@/client/query";
import { ErrorBoundary } from "@/client/ui/ErrorBoundary";
import { QuizDeck } from "@/client/ui/QuizDeck";
import { RectButton2 } from "@/client/ui/RectButton2";
import { useReplicache } from "@/client/ui/ReplicacheContext";
import { generateQuestionForSkillOrThrow } from "@/data/generator";
import { useQuery } from "@tanstack/react-query";
import { formatDuration } from "date-fns/formatDuration";
import { interval } from "date-fns/interval";
import { intervalToDuration } from "date-fns/intervalToDuration";
import { Link } from "expo-router";
import { useCallback, useId, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTimeout } from "usehooks-ts";

export default function ReviewsPage() {
  const r = useReplicache();
  const id = useId();

  const [visible, setVisible] = useState(false);

  const show = useCallback(() => {
    setVisible(true);
  }, []);

  useTimeout(show, 2000);

  const questions2 = useQuery({
    queryKey: [ReviewsPage.name, `hsk1SkillReview`],
    queryFn: async () => {
      return await questionsForReview2(r, { limit: 10 });
    },
    staleTime: Infinity, // Don't regenerate the quiz after re-focusing the page.
  });

  const nextNotYetDueSkillState = useQuery({
    queryKey: [ReviewsPage.name, `nextNotYetDueSkillState`, id],
    queryFn: async () => {
      const now = new Date();
      for await (const [
        { skill },
        skillState,
      ] of r.queryPaged.skillState.byDue()) {
        if (skillState.due <= now) {
          continue;
        }

        try {
          await generateQuestionForSkillOrThrow(skill);
        } catch {
          continue;
        }

        return skillState;
      }
    },
  });

  return (
    <View className="flex-1 items-center bg-background pt-safe-offset-[20px]">
      {questions2.isLoading || !visible ? (
        <Animated.View entering={FadeIn} className="my-auto">
          <Text className="hhh-text-body">Loading…</Text>
        </Animated.View>
      ) : questions2.error || questions2.data == null ? (
        <Text className="hhh-text-body">Oops something broken</Text>
      ) : questions2.data.length > 0 ? (
        <ErrorBoundary>
          <QuizDeck questions={questions2.data} className="h-full w-full" />
        </ErrorBoundary>
      ) : (
        <View
          style={{
            flex: 1,
            gap: 16,
            alignItems: `center`,
            justifyContent: `center`,
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          <Text className="hhh-text-title">
            👏 You’re all caught up on your reviews!
          </Text>
          {nextNotYetDueSkillState.isLoading ||
          nextNotYetDueSkillState.data === undefined ? null : (
            <Text className="hhh-text-caption">
              Next review in{` `}
              {formatDuration(
                intervalToDuration(
                  interval(new Date(), nextNotYetDueSkillState.data.due),
                ),
              )}
            </Text>
          )}
          <Link dismissTo href="/learn" asChild>
            <RectButton2>Back</RectButton2>
          </Link>
        </View>
      )}
    </View>
  );
}
