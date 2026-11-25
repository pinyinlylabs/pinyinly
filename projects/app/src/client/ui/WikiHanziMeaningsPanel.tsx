import type {
  DictionaryCollectionEntry,
  UserDictionaryEntry,
} from "@/client/db";
import type {
  CharacterExampleSentence,
  HanziText,
  HanziWord,
  Hsk30Level,
  Skill,
  SrsStateType,
} from "@/data/model";
import { wikiPayloadQuery } from "@/client/query";
import { buildHanziWord } from "@/dictionary";
import { and, eq, useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Pressable } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { useDb } from "./hooks/useDb";
import { useUserHanziMeaning } from "./hooks/useUserHanziMeaning";
import { WikiExampleSentence } from "./WikiExampleSentence";
import { WikiHanziProgressLozenge } from "./WikiHanziProgressLozenge";
import { HskLozengeWithTooltip } from "./HskLozengeWithTooltip";

interface WikiHanziMeaningsPanelProps {
  hanzi: HanziText;
  selectedHanziWord?: HanziWord | null;
  onHanziWordSelected?: (hanziWord: HanziWord) => void;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
}

export function WikiHanziMeaningsPanel({
  hanzi,
  selectedHanziWord,
  onHanziWordSelected,
  skillSrsStates,
}: WikiHanziMeaningsPanelProps) {
  const db = useDb();

  const { data: builtInMeanings } = useLiveQuery({
    query: (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) =>
          and(eq(entry.hanzi, hanzi), eq(entry.sourceKind, `builtIn`)),
        ),
  });

  const { data: userMeanings } = useLiveQuery({
    query: (q) =>
      q
        .from({ dictionary: db.userDictionary })
        .where(({ dictionary }) => eq(dictionary.hanzi, hanzi)),
  });

  const { data: wikiPayload } = useQuery(wikiPayloadQuery(hanzi));

  const isMeaningPicker = builtInMeanings.length + userMeanings.length > 1;

  useEffect(() => {
    if (
      selectedHanziWord != null ||
      onHanziWordSelected == null ||
      builtInMeanings.length + userMeanings.length !== 1
    ) {
      return;
    }

    const builtInMeaning = builtInMeanings[0];
    const userMeaning = userMeanings[0];
    if (builtInMeaning != null) {
      onHanziWordSelected(builtInMeaning.hanziWord);
    } else if (userMeaning != null) {
      onHanziWordSelected(buildHanziWord(hanzi, userMeaning.meaningKey));
    }
  }, [
    builtInMeanings,
    hanzi,
    onHanziWordSelected,
    selectedHanziWord,
    userMeanings,
  ]);

  return (
    <View className="gap-4">
      {builtInMeanings.length === 0 && userMeanings.length === 0 ? (
        <Text className="font-sans text-base text-muted-fg">
          No definitions at the moment.
        </Text>
      ) : (
        <View className="gap-3">
          {builtInMeanings.map((meaning) => (
            <DictionaryMeaningListItem
              key={`${meaning.sourceKind}:${meaning.id}`}
              meaning={meaning}
              description={
                wikiPayload?.curriculumMeanings?.find(
                  ({ id }) => id === meaning.hanziWord,
                )?.description
              }
              exampleSentence={
                wikiPayload?.curriculumMeaningExamples?.find(
                  ({ id }) => id === meaning.hanziWord,
                )?.exampleSentence
              }
              selected={
                isMeaningPicker && selectedHanziWord === meaning.hanziWord
              }
              onSelect={isMeaningPicker ? onHanziWordSelected : undefined}
              skillSrsStates={skillSrsStates}
            />
          ))}

          {userMeanings.map((meaning) => (
            <UserMeaningListItem
              key={meaning.meaningKey}
              hanzi={hanzi}
              meaning={meaning}
              selected={
                isMeaningPicker &&
                selectedHanziWord === buildHanziWord(hanzi, meaning.meaningKey)
              }
              onSelect={isMeaningPicker ? onHanziWordSelected : undefined}
              skillSrsStates={skillSrsStates}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function DictionaryMeaningListItem({
  meaning,
  description,
  exampleSentence,
  selected,
  onSelect,
  skillSrsStates,
}: {
  meaning: DictionaryCollectionEntry;
  description?: string;
  exampleSentence?: CharacterExampleSentence;
  selected: boolean;
  onSelect?: (hanziWord: HanziWord) => void;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
}) {
  const primaryPinyin = meaning.pinyin?.[0];
  const secondaryPinyins = meaning.pinyin?.slice(1) ?? [];

  return (
    <MeaningSelection
      hanziWord={meaning.hanziWord}
      selected={selected}
      onSelect={onSelect}
      className="gap-3"
    >
      <MeaningCoreText
        pinyin={primaryPinyin}
        glosses={meaning.gloss}
        hsk={meaning.hsk}
        hskFirstAppearance={meaning.hskFirstAppearance}
        hanziWord={meaning.hanziWord}
        skillSrsStates={skillSrsStates}
        selected={selected}
        onSelect={onSelect}
      />

      {description == null || description.length === 0 ? null : (
        <LabeledText label="Description">{description}</LabeledText>
      )}

      {exampleSentence == null ? null : (
        <WikiExampleSentence exampleSentence={exampleSentence} />
      )}

      {secondaryPinyins.length === 0 ? null : (
        <LabeledText label="Other pinyin">
          {secondaryPinyins.join(`; `)}
        </LabeledText>
      )}

      {meaning.note == null || meaning.note.length === 0 ? null : (
        <LabeledText label="Note">{meaning.note}</LabeledText>
      )}
    </MeaningSelection>
  );
}

function UserMeaningListItem({
  hanzi,
  meaning,
  selected,
  onSelect,
  skillSrsStates,
}: {
  hanzi: HanziText;
  meaning: UserDictionaryEntry;
  selected: boolean;
  onSelect?: (hanziWord: HanziWord) => void;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
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
    <MeaningSelection
      hanziWord={buildHanziWord(hanzi, meaning.meaningKey)}
      selected={selected}
      onSelect={onSelect}
      className="gap-3"
    >
      <View className="gap-2">
        <MeaningCoreText
          pinyin={value.pinyin}
          glosses={[value.gloss]}
          trailingBadge={customBadge}
          hanziWord={buildHanziWord(hanzi, meaning.meaningKey)}
          skillSrsStates={skillSrsStates}
          selected={selected}
          onSelect={onSelect}
        />
        {value.note == null || value.note.length === 0 ? null : (
          <LabeledText label="Note">{value.note}</LabeledText>
        )}
      </View>
    </MeaningSelection>
  );
}

function MeaningSelection({
  hanziWord,
  selected,
  onSelect,
  className,
  children,
}: {
  hanziWord: HanziWord;
  selected: boolean;
  onSelect?: (hanziWord: HanziWord) => void;
  className: string;
  children: React.ReactNode;
}) {
  if (onSelect == null) {
    return <View className={className}>{children}</View>;
  }

  return (
    <Pressable
      accessible={false}
      focusable={false}
      className={`
        rounded-lg border p-3

        ${selected ? `border-blue bg-blue/10` : `border-fg/10 bg-muted`}
        ${className}
      `}
      onPress={() => {
        onSelect(hanziWord);
      }}
    >
      {children}
    </Pressable>
  );
}

function MeaningCoreText({
  glosses,
  pinyin,
  hsk,
  hskFirstAppearance,
  trailingBadge,
  hanziWord,
  skillSrsStates,
  selected,
  onSelect,
}: {
  glosses: string[];
  pinyin?: string;
  hsk?: Hsk30Level;
  hskFirstAppearance?: Hsk30Level;
  trailingBadge?: React.ReactNode;
  hanziWord: HanziWord;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
  selected: boolean;
  onSelect?: (hanziWord: HanziWord) => void;
}) {
  const primaryGloss = glosses[0] ?? ``;
  const secondaryGlosses = glosses.slice(1);
  const gloss = (
    <Text className="min-w-0 shrink font-sans text-base leading-6">
      <Text className="text-fg-loud">{primaryGloss}</Text>
      {secondaryGlosses.length === 0 ? null : (
        <Text className="text-fg">{`; ${secondaryGlosses.join(`; `)}`}</Text>
      )}
    </Text>
  );

  return (
    <View className="gap-1">
      {pinyin == null || pinyin.length === 0 ? null : (
        <View className="flex-row flex-wrap items-baseline gap-4">
          <Text className="font-sans text-base text-muted-fg">{pinyin}</Text>
          {trailingBadge}
        </View>
      )}
      <View className="ml-4 flex-row flex-wrap items-center gap-x-2 gap-y-1">
        {onSelect == null ? (
          gloss
        ) : (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            className="min-w-0 shrink"
            onPress={(event) => {
              event.stopPropagation();
              onSelect(hanziWord);
            }}
          >
            {gloss}
          </Pressable>
        )}
        {hsk == null && hskFirstAppearance == null ? null : (
          <HskLozengeWithTooltip
            entries={[{ hsk, hskFirstAppearance }]}
            size="md"
          />
        )}
        <WikiHanziProgressLozenge
          hanziWord={hanziWord}
          skillSrsStates={skillSrsStates}
          hasPinyin={pinyin != null && pinyin.length > 0}
        />
      </View>
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
