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
  const containerRef = useRef<View>(null);
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

  const exitEditMode = () => {
    const isDirty = draft !== currentValue;
    if (isDirty) {
      confirmDiscardChanges({
        onDiscard: () => {
          setDraft(currentValue);
          setIsEditing(false);
        },
      });
    } else {
      setIsEditing(false);
      handleSave();
    }
  };

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const isWithinModal = (element: Node): boolean => {
      let current = element as HTMLElement | null;
      while (current) {
        // Check for modal indicators
        // React Native Modal renders with role="dialog" on web
        if (current.getAttribute?.(`role`) === `dialog`) {
          return true;
        }
        // Also check for React Native Web's modal container
        // which typically has very high z-index (9999+)
        const zIndex = window.getComputedStyle(current).zIndex;
        if (zIndex && Number.parseInt(zIndex, 10) >= 9999) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    };

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const container = containerRef.current as unknown as Node | null;

      // Don't exit edit mode if clicking within a modal (different "layer")
      if (isWithinModal(target)) {
        return;
      }

      if (container && !container.contains(target)) {
        exitEditMode();
      }
    };

    // Add slight delay to avoid triggering on the same click that opened edit mode
    const timeoutId = setTimeout(() => {
      document.addEventListener(`mousedown`, handleClickOutside);
      document.addEventListener(`touchstart`, handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener(`mousedown`, handleClickOutside);
      document.removeEventListener(`touchstart`, handleClickOutside);
    };
  }, [isEditing]);

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
      setIsEditing(false);
      handleSave();
    }

    if (event.nativeEvent.key === `Escape`) {
      event.preventDefault();
      setDraft(currentValue);
      setIsEditing(false);
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
        <View ref={containerRef} className="relative">
          <TextInput
            ref={inputRef}
            autoFocus
            multiline={multiline}
            value={draft}
            onChangeText={setDraft}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className={
              inputClassName == null
                ? ``
                : `
                  ${inputClassName}
                `
            }
            style={showHistoryButton ? { paddingRight: 32 } : undefined}
          />
          {showHistoryButton ? (
            <View className="absolute right-2 top-2">
              <RectButton
                variant="bare"
                onPress={() => {
                  setShowHistoryModal(true);
                }}
              >
                <IconImage
                  icon="time-circled"
                  size={16}
                  className="text-fg-dim"
                />
              </RectButton>
            </View>
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
