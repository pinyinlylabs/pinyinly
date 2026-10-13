import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import type { HanziText } from "@/data/model";
import { buildHanziWord } from "@/dictionary";
import { arrayFilterUnique } from "@pinyinly/lib/collections";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { WikiHanziHskLozenges } from "./WikiHanziHskLozenges";
import { WikiHanziMeaningsPanel } from "./WikiHanziMeaningsPanel";
import { WikiHanziStudyMenu } from "./WikiHanziStudyMenu";
import { WikiHanziStudyStatusLozenge } from "./WikiHanziStudyStatusLozenge";
import { useDb } from "./hooks/useDb";

export function WikiHanziWordHeaderOverview({
  hanzi,
  ...rest
}: {
  hanzi: HanziText;
}) {
  true satisfies IsExhaustedRest<typeof rest>;

  const db = useDb();
  const { data: dictionaryEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => eq(entry.hanzi, hanzi)),
    [db.dictionaryCollection, hanzi],
  );
  const { data: userMeanings } = useLiveQuery(
    (q) =>
      q
        .from({ dictionary: db.userDictionary })
        .where(({ dictionary }) => eq(dictionary.hanzi, hanzi)),
    [db.userDictionary, hanzi],
  );
  const hanziWords = [
    ...dictionaryEntries
      .filter((entry) => entry.sourceKind === `builtIn`)
      .map((entry) => entry.hanziWord),
    ...userMeanings.map((meaning) => buildHanziWord(hanzi, meaning.meaningKey)),
  ].filter(arrayFilterUnique());
  const studyHanziWord =
    hanziWords.length === 1 ? (hanziWords[0] ?? null) : null;

  return (
    <View className="gap-[10px]">
      <View className="flex-row items-center gap-1">
        <View className="flex-1 flex-row gap-1">
          <WikiHanziHskLozenges hanzi={hanzi} />
          <WikiHanziStudyStatusLozenge hanziWord={studyHanziWord} />
        </View>
        <WikiHanziStudyMenu hanziWord={studyHanziWord} />
      </View>
      <View>
        <HeaderTitleProvider.ScrollTrigger title={hanzi} />
        <Text className="font-sans text-[48px] font-semibold text-fg-loud">
          {hanzi}
        </Text>
      </View>
      <WikiHanziMeaningsPanel hanzi={hanzi} />
    </View>
  );
}
