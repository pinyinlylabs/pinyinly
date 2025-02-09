import { QuizDeck } from "@/client/ui/QuizDeck";
import { RectButton2 } from "@/client/ui/RectButton2";
import { useReplicache } from "@/client/ui/ReplicacheContext";
import { generateQuestionForSkillOrThrow } from "@/data/generator";
import { questionsForReview } from "@/data/query";
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

  const questions = useQuery({
    queryKey: [ReviewsPage.name, `quiz`, id],
    queryFn: async () => {
      const result = await questionsForReview(r, {
        limit: 10,
        dueBeforeNow: true,
      });

      return result.map(([, , question]) => question);
    },
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
      {questions.isLoading || !visible ? (
        <Animated.View entering={FadeIn} className="my-auto">
          <Text className="text-text">Loading…</Text>
        </Animated.View>
      ) : questions.error || questions.data == null ? (
        <Text className="text-text">Oops something broken</Text>
      ) : questions.data.length > 0 ? (
        <QuizDeck questions={questions.data} className="h-full w-full" />
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
          <Text style={{ color: `white`, fontSize: 30, textAlign: `center` }}>
            👏 You’re all caught up on your reviews!
          </Text>
          <GoHomeButton />
          {nextNotYetDueSkillState.isLoading ||
          nextNotYetDueSkillState.data === undefined ? null : (
            <Text style={{ color: `#AAA`, textAlign: `center` }}>
              Next review in{` `}
              {formatDuration(
                intervalToDuration(
                  interval(new Date(), nextNotYetDueSkillState.data.due),
                ),
              )}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const GoHomeButton = () => (
  <View style={{ height: 44 }}>
    <Link dismissTo href="/learn" asChild>
      <RectButton2 textClassName="font-bold text-text text-xl">
        Back
      </RectButton2>
    </Link>
  </View>
);
