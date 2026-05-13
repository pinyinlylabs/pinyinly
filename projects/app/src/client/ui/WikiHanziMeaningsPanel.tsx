import type {
  DictionarySearchEntry,
  UserDictionaryEntry,
} from "@/client/query";
import type { HanziText } from "@/data/model";
import {
  getUserHanziMeaningKeyParams,
  userHanziMeaningGlossSetting,
  userHanziMeaningNoteSetting,
  userHanziMeaningPinyinSetting,
} from "@/data/userSettings";
import { nanoid } from "@/util/nanoid";
import { and, eq, useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { Text, View } from "react-native";
import { FloatingMenuModal } from "./FloatingMenuModal";
import { WikiEditButton } from "./WikiEditButton";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { RectButton } from "./RectButton";
import { useDb } from "./hooks/useDb";
import { useUserHanziMeaning } from "./hooks/useUserHanziMeaning";

interface WikiHanziMeaningsPanelProps {
  hanzi: HanziText;
}

export function WikiHanziMeaningsPanel({ hanzi }: WikiHanziMeaningsPanelProps) {
  const db = useDb();
  const [editingMeaningKey, setEditingMeaningKey] = useState<string | null>(
    null,
  );

  const { data: builtInMeanings } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) =>
          and(eq(entry.hanzi, hanzi), eq(entry.sourceKind, `builtIn`)),
        ),
    [db.dictionarySearch, hanzi],
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
        <Text className="font-sans text-base text-fg-dim">
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
            <EditableUserMeaningListItem
              key={meaning.meaningKey}
              hanzi={hanzi}
              meaning={meaning}
              isEditing={editingMeaningKey === meaning.meaningKey}
              onEdit={() => {
                setEditingMeaningKey(meaning.meaningKey);
              }}
              onDoneEditing={() => {
                setEditingMeaningKey((current) =>
                  current === meaning.meaningKey ? null : current,
                );
              }}
              onRemoved={() => {
                setEditingMeaningKey((current) =>
                  current === meaning.meaningKey ? null : current,
                );
              }}
            />
          ))}
        </View>
      )}

      <View className="flex-row justify-start">
        <AddMeaningButton
          hanzi={hanzi}
          onAddMeaning={(meaningKey) => {
            setEditingMeaningKey(meaningKey);
          }}
        />
      </View>
    </View>
  );
}

function AddMeaningButton({
  hanzi,
  onAddMeaning,
}: {
  hanzi: HanziText;
  onAddMeaning: (meaningKey: string) => void;
}) {
  const [meaningKey, setMeaningKey] = useState(() => `u_${nanoid()}`);
  const { set } = useUserHanziMeaning({ hanzi, meaningKey });

  return (
    <RectButton
      variant="bareDim"
      iconStart="add-circled-filled"
      iconSize={16}
      onPress={() => {
        set({ gloss: `New meaning` });
        onAddMeaning(meaningKey);
        setMeaningKey(`u_${nanoid()}`);
      }}
    >
      Add meaning
    </RectButton>
  );
}

function DictionaryMeaningListItem({
  meaning,
}: {
  meaning: DictionarySearchEntry;
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

function EditableUserMeaningListItem({
  hanzi,
  meaning,
  isEditing,
  onDoneEditing,
  onEdit,
  onRemoved,
}: {
  hanzi: HanziText;
  meaning: UserDictionaryEntry;
  isEditing: boolean;
  onDoneEditing: () => void;
  onEdit: () => void;
  onRemoved: () => void;
}) {
  const keyParams = getUserHanziMeaningKeyParams(hanzi, meaning.meaningKey);
  const { remove, value } = useUserHanziMeaning({
    hanzi,
    meaningKey: meaning.meaningKey,
  });

  if (value == null) {
    return null;
  }

  const customBadge = (
    <View className="self-center rounded-full bg-cyan/10 px-2 py-1">
      <Text
        className={`font-sans text-[11px] font-medium uppercase tracking-[0.4px] text-cyan`}
      >
        Custom
      </Text>
    </View>
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-2">
          {isEditing ? (
            <View className="gap-1">
              <View className="flex-row flex-wrap items-baseline gap-4">
                <Text className="font-sans text-base font-normal text-fg-loud">
                  {meaning.hanzi}
                </Text>
                <InlineEditableSettingText
                  variant="body"
                  setting={userHanziMeaningPinyinSetting}
                  settingKey={keyParams}
                  placeholder="Add pinyin (optional)"
                />
                {customBadge}
              </View>
              <View className="ml-4">
                <InlineEditableSettingText
                  variant="body"
                  setting={userHanziMeaningGlossSetting}
                  settingKey={keyParams}
                  placeholder="Enter meaning..."
                  multiline
                />
              </View>
            </View>
          ) : (
            <MeaningCoreText
              hanzi={meaning.hanzi}
              pinyin={value.pinyin}
              glosses={[value.gloss]}
              trailingBadge={customBadge}
            />
          )}

          {isEditing ? (
            <View className="ml-4">
              <InlineEditableSettingText
                variant="body"
                setting={userHanziMeaningNoteSetting}
                settingKey={keyParams}
                placeholder="Add a note (optional)"
                multiline
              />
            </View>
          ) : value.note == null || value.note.length === 0 ? null : (
            <LabeledText label="Note">{value.note}</LabeledText>
          )}
        </View>

        <View className="flex-row items-center gap-1">
          {isEditing ? (
            <FloatingMenuModal
              menu={
                <MeaningOptionsMenu
                  onDelete={() => {
                    onRemoved();
                    remove();
                  }}
                />
              }
            >
              <RectButton
                variant="bareDim"
                iconStart="more-horizontal"
                iconSize={16}
              />
            </FloatingMenuModal>
          ) : null}
          <WikiEditButton
            editing={isEditing}
            onPress={isEditing ? onDoneEditing : onEdit}
          />
        </View>
      </View>
    </View>
  );
}

function MeaningOptionsMenu({
  onDelete,
  onRequestClose,
}: {
  onDelete: () => void;
  onRequestClose?: () => void;
}) {
  return (
    <View className="rounded-xl bg-bg-high px-4 py-3">
      <RectButton
        variant="bare"
        onPress={() => {
          onDelete();
          onRequestClose?.();
        }}
      >
        Delete meaning
      </RectButton>
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
          <Text className="font-sans text-base text-fg-dim">{pinyin}</Text>
        )}
        {trailingBadge}
      </View>
      <Text className="ml-4 font-sans text-base leading-6">
        <Text className="text-fg-loud">{primaryGloss}</Text>
        {secondaryGlosses.length === 0 ? null : (
          <Text className="text-fg-dim">{`; ${secondaryGlosses.join(`; `)}`}</Text>
        )}
      </Text>
    </View>
  );
}

function LabeledText({ children, label }: { children: string; label: string }) {
  return (
    <View className="gap-1">
      <Text className="font-sans text-base font-medium uppercase text-fg-dim">
        {label}
      </Text>
      <Text className="font-sans text-base leading-6 text-fg-dim">
        {children}
      </Text>
    </View>
  );
}
