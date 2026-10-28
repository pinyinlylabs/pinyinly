import type { HanziWord, Skill, SrsStateType } from "@/data/model";
import { hanziFromHanziWord, meaningKeyFromHanziWord } from "@/dictionary";
import { and, eq, useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./hooks/useDb";
import { SkillProgressBar } from "./SkillProgressBar";
import { Text } from "./Text";
import { View } from "./View";
import { WikiTitledBox } from "./WikiTitledBox";
import { getHanziWordSkillBreakdown } from "./wikiHanziProgress";

export function WikiHanziSkillLevelBreakdownBox({
  hanziWord,
  skillSrsStates,
}: {
  hanziWord: HanziWord;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
}) {
  const db = useDb();
  const hanzi = hanziFromHanziWord(hanziWord);
  const meaningKey = meaningKeyFromHanziWord(hanziWord);
  const { data: builtInMeaning } = useLiveQuery({
    query: (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => eq(entry.hanziWord, hanziWord))
        .findOne(),
  });
  const { data: userMeaning } = useLiveQuery({
    query: (q) =>
      q
        .from({ dictionary: db.userDictionary })
        .where(({ dictionary }) =>
          and(
            eq(dictionary.hanzi, hanzi),
            eq(dictionary.meaningKey, meaningKey),
          ),
        )
        .findOne(),
  });
  const hasPinyin =
    builtInMeaning?.pinyin?.[0] != null || userMeaning?.pinyin != null;

  return (
    <WikiTitledBox
      title="Skill level details"
      bottomCaption="Each bar shows progress toward that skill's stability goal. The word level combines the skills marked below."
    >
      <WikiHanziSkillLevelBreakdownContent
        hanziWord={hanziWord}
        skillSrsStates={skillSrsStates}
        hasPinyin={hasPinyin}
      />
    </WikiTitledBox>
  );
}

export function WikiHanziSkillLevelBreakdownContent({
  hanziWord,
  skillSrsStates,
  hasPinyin,
}: {
  hanziWord: HanziWord;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
  hasPinyin: boolean;
}) {
  const breakdown = getHanziWordSkillBreakdown({
    hanziWord,
    skillSrsStates,
    hasPinyin,
  });

  return (
    <View className="gap-3 p-3">
      {breakdown.map((item) => (
        <View className="gap-1" key={item.skill}>
          <View className="flex-row items-center justify-between gap-2">
            <Text className="font-sans text-sm text-fg">{item.label}</Text>
            <Text className="font-sans text-xs text-muted-fg">
              {item.stabilityDays == null
                ? item.status
                : `${item.status} · ${Math.round(item.stabilityDays)}/${item.targetStabilityDays} days`}
            </Text>
          </View>
          <SkillProgressBar
            progress={item.progress}
            color="blue"
            accessibilityLabel={`${item.label} stability`}
          />
          {item.contributesToWordLevel ? null : (
            <Text className="pyly-body-caption text-muted-fg">
              Tracked separately; does not affect the word level.
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
