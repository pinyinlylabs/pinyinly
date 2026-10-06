import type {
  DictionaryCollectionEntry,
  UserDictionaryEntry,
} from "@/client/query";
import type { HanziText } from "@/data/model";
import { buildHanziWord } from "@/dictionary";
import { StudyButton } from "./StudyButton";
import { and, eq, useLiveQuery } from "@tanstack/react-db";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { useDb } from "./hooks/useDb";
import { useUserHanziMeaning } from "./hooks/useUserHanziMeaning";

interface WikiHanziMeaningsPanelProps {
  hanzi: HanziText;
}

export function WikiHanziMeaningsPanel({ hanzi }: WikiHanziMeaningsPanelProps) {
  const db = useDb();

  const { data: builtInMeanings } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) =>
          and(eq(entry.hanzi, hanzi), eq(entry.sourceKind, `builtIn`)),
        ),
    [db.dictionaryCollection, hanzi],
  );

  const { data: userMeanings } = useLiveQuery(
    (q) =>
      q
        .from({ dictionary: db.userDictionary })
        .where(({ dictionary }) => eq(dictionary.hanzi, hanzi)),
    [db.userDictionary, hanzi],
  );

  return (
    <View className="gap-4">
      {builtInMeanings.length === 0 && userMeanings.length === 0 ? (
        <Text className="font-sans text-base text-muted-fg">
          No meanings yet.
        </Text>
      ) : (
        <View className="gap-3">
          {builtInMeanings.map((meaning) => (
            <DictionaryMeaningListItem
              key={`${meaning.sourceKind}:${meaning.id}`}
              meaning={meaning}
            />
          ))}

          {userMeanings.map((meaning) => (
            <UserMeaningListItem
              key={meaning.meaningKey}
              hanzi={hanzi}
              meaning={meaning}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function DictionaryMeaningListItem({
  meaning,
}: {
  meaning: DictionaryCollectionEntry;
}) {
  const primaryPinyin = meaning.pinyin?.[0];
  const secondaryPinyins = meaning.pinyin?.slice(1) ?? [];

  return (
    <View className="gap-3">
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <MeaningCoreText
            hanzi={meaning.hanzi}
            pinyin={primaryPinyin}
            glosses={meaning.gloss}
          />
        </View>
        <StudyButton hanziWord={meaning.hanziWord} />
      </View>

      {secondaryPinyins.length === 0 ? null : (
        <LabeledText label="Other pinyin">
          {secondaryPinyins.join(`; `)}
        </LabeledText>
      )}

      {meaning.note == null || meaning.note.length === 0 ? null : (
        <LabeledText label="Note">{meaning.note}</LabeledText>
      )}
    </View>
  );
}

function UserMeaningListItem({
  hanzi,
  meaning,
}: {
  hanzi: HanziText;
  meaning: UserDictionaryEntry;
}) {
  const { value } = useUserHanziMeaning({
    hanzi,
    meaningKey: meaning.meaningKey,
  });

  if (value == null) {
    return null;
  }

  const customBadge = (
    <View className="self-center rounded-full bg-cyan/10 px-2 py-1">
      <Text
        className={`font-sans text-[11px] font-medium tracking-[0.4px] text-cyan uppercase`}
      >
        Custom
      </Text>
    </View>
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-2">
          <MeaningCoreText
            hanzi={meaning.hanzi}
            pinyin={value.pinyin}
            glosses={[value.gloss]}
            trailingBadge={customBadge}
          />
          {value.note == null || value.note.length === 0 ? null : (
            <LabeledText label="Note">{value.note}</LabeledText>
          )}
        </View>

        <StudyButton hanziWord={buildHanziWord(hanzi, meaning.meaningKey)} />
      </View>
    </View>
  );
}

function MeaningCoreText({
  glosses,
  hanzi,
  pinyin,
  trailingBadge,
}: {
  glosses: string[];
  hanzi: HanziText;
  pinyin?: string;
  trailingBadge?: React.ReactNode;
}) {
  const primaryGloss = glosses[0] ?? ``;
  const secondaryGlosses = glosses.slice(1);

  return (
    <View className="gap-1">
      <View className="flex-row flex-wrap items-baseline gap-4">
        <Text className="font-sans text-base font-normal text-fg-loud">
          {hanzi}
        </Text>
        {pinyin == null || pinyin.length === 0 ? null : (
          <Text className="font-sans text-base text-muted-fg">{pinyin}</Text>
        )}
        {trailingBadge}
      </View>
      <Text className="ml-4 font-sans text-base leading-6">
        <Text className="text-fg-loud">{primaryGloss}</Text>
        {secondaryGlosses.length === 0 ? null : (
          <Text className="text-fg">{`; ${secondaryGlosses.join(`; `)}`}</Text>
        )}
      </Text>
    </View>
  );
}

function LabeledText({ children, label }: { children: string; label: string }) {
  return (
    <View className="gap-1">
      <Text className="font-sans text-base font-medium text-muted-fg uppercase">
        {label}
      </Text>
      <Text className="font-sans text-base leading-6 text-muted-fg">
        {children}
      </Text>
    </View>
  );
}
