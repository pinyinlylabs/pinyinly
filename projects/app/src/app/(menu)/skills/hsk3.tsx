import { GroupedHanziWords } from "@/client/ui/GroupedHanziWords";
import { useDb } from "@/client/ui/hooks/useDb";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Text, View } from "react-native";

export default function SkillsHsk3Page() {
  const db = useDb();
  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hsk, `3`))
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({ hanziWord: entry.hanziWord }))
        .distinct(),
    [db.dictionarySearch],
  );
  const hanziWords = dictionarySearchEntries.map((entry) => entry.hanziWord);

  return (
    <View className="gap-5">
      <View>
        <Text className="pyly-body-title">HSK 3</Text>
      </View>

      <GroupedHanziWords hanziWords={hanziWords} />
    </View>
  );
}
