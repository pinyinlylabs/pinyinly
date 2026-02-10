import {
  useUserSetting,
  useUserSettingHistory,
} from "@/client/hooks/useUserSetting";
import type {
  UserSettingEntityInput,
  UserSettingKeyInput,
  UserSettingTextEntity,
} from "@/client/hooks/useUserSetting";
import { formatRelativeTime } from "@/util/date";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { confirmDiscardChanges } from "./confirmDiscardChanges";
import { IconImage } from "./IconImage";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";

interface InlineEditableSettingTextProps<T extends UserSettingTextEntity> {
  setting: T;
  settingKey: UserSettingKeyInput<T>;
  placeholder: string;
  emptyText?: string;
  multiline?: boolean;
  displayClassName?: string;
  emptyClassName?: string;
  inputClassName?: string;
  displayContainerClassName?: string;
  displayHoverClassName?: string;
  renderDisplay?: (value: string) => ReactNode;
  sanitizeValue?: (value: string) => string | null;
}

const defaultSanitizeValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export function InlineEditableSettingText<T extends UserSettingTextEntity>({
  setting,
  settingKey,
  placeholder,
  emptyText = placeholder,
  multiline = false,
  displayClassName,
  emptyClassName,
  inputClassName,
  displayContainerClassName = `px-2 py-1`,
  displayHoverClassName = `rounded-md bg-fg-bg10 px-2 py-1`,
  renderDisplay,
  sanitizeValue = defaultSanitizeValue,
}: InlineEditableSettingTextProps<T>) {
  const { value, setValue } = useUserSetting(setting, settingKey);
  const history = useUserSettingHistory(setting, settingKey);
  const currentValue: string = value?.text ?? ``;

  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [draft, setDraft] = useState(currentValue);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const skipBlurSaveRef = useRef(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(currentValue);
    }
  }, [currentValue, isEditing]);

  const handleSave = () => {
    const sanitized = sanitizeValue(draft);
    setValue(
      sanitized == null
        ? null
        : ({ text: sanitized } as UserSettingEntityInput<T>),
    );
  };

  const cancelEdit = () => {
    const isDirty = draft !== currentValue;
    const discard = () => {
      skipBlurSaveRef.current = true;
      setDraft(currentValue);
      setIsEditing(false);
    };

    if (isDirty) {
      confirmDiscardChanges({ onDiscard: discard });
      return;
    }

    discard();
  };

  const handleBlur = () => {
    if (skipBlurSaveRef.current) {
      skipBlurSaveRef.current = false;
      return;
    }
    setIsEditing(false);
    handleSave();
  };

  const handleKeyPress = (event: {
    nativeEvent: { key: string; shiftKey?: boolean };
    preventDefault: () => void;
  }) => {
    const isShiftPressed = event.nativeEvent.shiftKey === true;

    if (event.nativeEvent.key === `Enter`) {
      if (multiline && isShiftPressed) {
        return;
      }
      event.preventDefault();
      skipBlurSaveRef.current = true;
      setIsEditing(false);
      handleSave();
    }

    if (event.nativeEvent.key === `Escape`) {
      event.preventDefault();
      cancelEdit();
    }
  };

  const displayText = currentValue.length === 0 ? emptyText : currentValue;
  const displayContent =
    currentValue.length === 0
      ? displayText
      : (renderDisplay?.(currentValue) ?? displayText);
  const historyEntries = getHistoryEntries(history.entries, currentValue);
  const showHistoryButton =
    isEditing && draft.trim().length === 0 && historyEntries.length > 0;

  return (
    <View>
      {isEditing ? (
        <View className="flex-row items-start gap-2">
          <TextInput
            ref={inputRef}
            autoFocus
            multiline={multiline}
            value={draft}
            onChangeText={setDraft}
            onBlur={handleBlur}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className={
              inputClassName == null
                ? `flex-1`
                : `
                  flex-1

                  ${inputClassName}
                `
            }
          />
          {showHistoryButton ? (
            <Pressable
              onPressIn={() => {
                skipBlurSaveRef.current = true;
              }}
              onPress={() => {
                setShowHistoryModal(true);
              }}
              className="rounded-full border border-fg/15 bg-fg-bg5 p-2"
            >
              <IconImage
                icon="time-circled"
                size={16}
                className="text-fg-dim"
              />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Pressable
          onPress={() => {
            setIsEditing(true);
          }}
          onHoverIn={() => {
            setIsHovered(true);
          }}
          onHoverOut={() => {
            setIsHovered(false);
          }}
        >
          <View
            className={
              isHovered ? displayHoverClassName : displayContainerClassName
            }
          >
            <Text
              className={
                currentValue.length === 0 ? emptyClassName : displayClassName
              }
            >
              {displayContent}
            </Text>
          </View>
        </Pressable>
      )}
      {showHistoryModal ? (
        <InlineEditableSettingHistoryModal
          entries={historyEntries}
          onDismiss={() => {
            setShowHistoryModal(false);
          }}
          onSelect={(nextValue) => {
            setDraft(nextValue);
            setShowHistoryModal(false);
            inputRef.current?.focus();
          }}
        />
      ) : null}
    </View>
  );
}

type HistoryEntry = {
  id: string;
  value: string;
  createdAt: Date;
};

function getHistoryEntries(
  entries: readonly { id: string; createdAt: Date; value: unknown }[],
  currentValue: string,
): HistoryEntry[] {
  const seenValues = new Set<string>();
  const result: HistoryEntry[] = [];

  for (const entry of entries) {
    const nextValue = (entry.value as { text?: string } | null)?.text ?? null;
    if (nextValue == null) {
      continue;
    }
    const trimmed = nextValue.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (trimmed === currentValue) {
      continue;
    }
    if (seenValues.has(trimmed)) {
      continue;
    }
    seenValues.add(trimmed);
    result.push({ id: entry.id, value: trimmed, createdAt: entry.createdAt });
  }

  return result;
}

function InlineEditableSettingHistoryModal({
  entries,
  onDismiss,
  onSelect,
}: {
  entries: HistoryEntry[];
  onDismiss: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <PageSheetModal onDismiss={onDismiss} suspenseFallback={null}>
      {({ dismiss }) => (
        <View className="flex-1 bg-bg">
          <View className="flex-row items-center justify-between border-b border-fg/10 px-4 py-3">
            <RectButton variant="bare" onPress={dismiss}>
              Cancel
            </RectButton>
            <Text className="text-[17px] font-semibold text-fg-loud">
              History
            </Text>
            <View className="w-[60px]" />
          </View>
          <ScrollView className="flex-1" contentContainerClassName="gap-2 p-4">
            {entries.map((entry) => (
              <Pressable
                key={entry.id}
                onPress={() => {
                  onSelect(entry.value);
                  dismiss();
                }}
              >
                <View className="gap-1 rounded-lg border border-fg/10 bg-fg-bg5 px-3 py-2">
                  <Text className="text-[14px] text-fg">{entry.value}</Text>
                  <Text className="text-[12px] text-fg-dim">
                    {formatRelativeTime(entry.createdAt)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </PageSheetModal>
  );
}
