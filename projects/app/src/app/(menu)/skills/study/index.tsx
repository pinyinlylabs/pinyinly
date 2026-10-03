import { StudyList } from "@/client/ui/StudyList";
import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { RectButton } from "@/client/ui/RectButton";
import { useDb } from "@/client/ui/hooks/useDb";
import { useLiveQuery } from "@tanstack/react-db";
import { View } from "@/client/ui/View";

export default function StudyWordsPage() {
  const db = useDb();
  const { data: words, isLoading } = useLiveQuery(
    (q) => q.from({ word: db.studyHanziWordsCollection }),
    [db.studyHanziWordsCollection],
  );

  return (
    <View className="gap-5">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/skills">Skills</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/skills/study">Study</Breadcrumbs.Item>
      </Breadcrumbs>

      <HeaderTitleProvider.ScrollTrigger title="Study" />
      <View className="items-end">
        <RectButton
          href="/learn/study"
          iconStart="chevron-right"
          disabled={isLoading || words.length === 0}
        >
          Practice
        </RectButton>
      </View>
      <StudyList />
    </View>
  );
}
