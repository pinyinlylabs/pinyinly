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
      <View className="flex-row items-center justify-between gap-3">
        <View className="gap-1">
          <Text className="text-[15px] font-semibold text-fg-loud">
            Meanings
          </Text>
          <Text className="text-[13px] text-fg-dim">
            Built-in definitions stay read-only. Your meanings can be edited.
          </Text>
        </View>
        <AddMeaningButton
          hanzi={hanzi}
          onAddMeaning={(meaningKey) => {
            setEditingMeaningKey(meaningKey);
          }}
        />
      </View>

      {builtInMeanings.length === 0 && userMeanings.length === 0 ? (
        <Text className="text-[14px] text-fg-dim">No meanings yet.</Text>
      ) : (
        <View className="gap-3">
          {builtInMeanings.map((meaning, index) => (
            <DictionaryMeaningListItem
              key={`${meaning.sourceKind}:${meaning.id}`}
              index={index + 1}
              meaning={meaning}
            />
          ))}

          {userMeanings.map((meaning, index) => (
            <EditableUserMeaningListItem
              key={meaning.meaningKey}
              hanzi={hanzi}
              meaning={meaning}
              index={builtInMeanings.length + index + 1}
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
      variant="bare"
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
  index,
  meaning,
}: {
  index: number;
  meaning: DictionarySearchEntry;
}) {
  const primaryGloss = meaning.gloss[0] ?? ``;
  const secondaryGlosses = meaning.gloss.slice(1);
  const primaryPinyin = meaning.pinyin?.[0];
  const secondaryPinyins = meaning.pinyin?.slice(1) ?? [];

  return (
    <MeaningListItemFrame index={index}>
      <View className="gap-3 rounded-xl border border-fg/10 bg-bg p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="text-[16px] font-semibold text-fg-loud">
              {primaryGloss}
            </Text>
            {primaryPinyin == null ? null : (
              <Text className="text-[13px] text-fg-dim">{primaryPinyin}</Text>
            )}
          </View>

          <View className="rounded-full bg-fg/5 px-2 py-1">
            <Text className="text-[11px] font-medium uppercase tracking-[0.4px] text-fg-dim">
              Built-in
            </Text>
          </View>
        </View>

        {secondaryGlosses.length === 0 ? null : (
          <LabeledText label="Also">{secondaryGlosses.join(`; `)}</LabeledText>
        )}

        {secondaryPinyins.length === 0 ? null : (
          <LabeledText label="Other pinyin">
            {secondaryPinyins.join(`; `)}
          </LabeledText>
        )}

        {meaning.note == null || meaning.note.length === 0 ? null : (
          <LabeledText label="Note">{meaning.note}</LabeledText>
        )}
      </View>
    </MeaningListItemFrame>
  );
}

function EditableUserMeaningListItem({
  hanzi,
  meaning,
  index,
  isEditing,
  onDoneEditing,
  onEdit,
  onRemoved,
}: {
  hanzi: HanziText;
  meaning: UserDictionaryEntry;
  index: number;
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

  return (
    <MeaningListItemFrame index={index}>
      <View className="gap-3 rounded-xl border border-fg/10 bg-bg p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-[16px] font-semibold text-fg-loud">
                {value.gloss}
              </Text>
              <View className="rounded-full bg-cyan/10 px-2 py-1">
                <Text className="text-[11px] font-medium uppercase tracking-[0.4px] text-cyan">
                  Yours
                </Text>
              </View>
            </View>

            {value.pinyin == null || value.pinyin.length === 0 ? null : (
              <Text className="text-[13px] text-fg-dim">{value.pinyin}</Text>
            )}

            {value.note == null || value.note.length === 0 ? null : (
              <Text className="text-[13px] leading-5 text-fg-dim">
                {value.note}
              </Text>
            )}
          </View>

          <View className="flex-row items-center gap-1">
            <RectButton
              variant="bare2"
              iconStart="pencil"
              iconSize={16}
              onPress={isEditing ? onDoneEditing : onEdit}
            >
              {isEditing ? `Done` : `Edit`}
            </RectButton>
            <RectButton
              variant="bare"
              iconStart="close"
              iconSize={16}
              className="text-fg-dim"
              onPress={() => {
                onRemoved();
                remove();
              }}
            />
          </View>
        </View>

        {isEditing ? (
          <View className="gap-3 border-t border-fg/10 pt-3">
            <EditableField label="Meaning">
              <InlineEditableSettingText
                variant="body"
                setting={userHanziMeaningGlossSetting}
                settingKey={keyParams}
                placeholder="Enter meaning..."
                multiline
              />
            </EditableField>

            <EditableField label="Pinyin">
              <InlineEditableSettingText
                variant="body"
                setting={userHanziMeaningPinyinSetting}
                settingKey={keyParams}
                placeholder="Add pinyin (optional)"
              />
            </EditableField>

            <EditableField label="Note">
              <InlineEditableSettingText
                variant="body"
                setting={userHanziMeaningNoteSetting}
                settingKey={keyParams}
                placeholder="Add a note (optional)"
                multiline
              />
            </EditableField>
          </View>
        ) : null}
      </View>
    </MeaningListItemFrame>
  );
}

function MeaningListItemFrame({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="w-6 items-center pt-4">
        <Text className="text-[13px] font-semibold text-fg-dim">{index}.</Text>
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
}

function EditableField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <View className="gap-1">
      <Text className="text-[12px] font-medium uppercase text-fg-dim">
        {label}
      </Text>
      {children}
    </View>
  );
}

function LabeledText({ children, label }: { children: string; label: string }) {
  return (
    <View className="gap-1">
      <Text className="text-[12px] font-medium uppercase text-fg-dim">
        {label}
      </Text>
      <Text className="text-[13px] leading-5 text-fg-dim">{children}</Text>
    </View>
  );
}
