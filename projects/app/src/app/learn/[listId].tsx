import { ErrorBoundary } from "@/client/ui/ErrorBoundary";
import { QuizDeck } from "@/client/ui/QuizDeck";
import { RectButton } from "@/client/ui/RectButton";
import { SkillQueueProvider } from "@/client/ui/SkillQueueProvider";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { parseStudyListId, studyListTitle } from "@/data/studyLists";
import { useLocalSearchParams } from "expo-router";

export default function ListPracticePage() {
  const { listId } = useLocalSearchParams<{ listId?: string }>();
  const parsedListId = parseStudyListId(listId);

  if (parsedListId == null) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-bg">
        <Text className="pyly-body-title">List unavailable</Text>
        <RectButton href="/skills" iconStart="chevron-left">
          Skills
        </RectButton>
      </View>
    );
  }

  const backHref =
    parsedListId === `study`
      ? (`/skills/study` as const)
      : (`/skills/hsk/${parsedListId.slice(4)}` as const);

  return (
    <View
      className="
        flex-1 items-center bg-bg pt-safe-offset-2

        md:pt-safe-offset-5
      "
    >
      <ErrorBoundary>
        <SkillQueueProvider listId={parsedListId} key={parsedListId}>
          <QuizDeck
            className="size-full"
            title={studyListTitle(parsedListId)}
            backHref={backHref}
            emptyMessage="No words to practice in this list."
          />
        </SkillQueueProvider>
      </ErrorBoundary>
    </View>
  );
}
