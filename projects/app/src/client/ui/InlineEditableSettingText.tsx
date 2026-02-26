import type {
  UserSettingEntityInput,
  UserSettingKeyInput,
  UserSettingTextEntity,
} from "@/client/ui/hooks/useUserSetting";
import {
  useUserSetting,
  useUserSettingHistory,
} from "@/client/ui/hooks/useUserSetting";
import { formatRelativeTime } from "@/util/date";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { tv } from "tailwind-variants";
import type { FloatingMenuModalMenuProps } from "./FloatingMenuModal";
import { FloatingMenuModal } from "./FloatingMenuModal";
import { ProgressPieIcon } from "./ProgressPieIcon";
import { RectButton } from "./RectButton";
import { useUserSettingTextDefaultValue } from "./hooks/useUserSettingTextDefaultValue";

export type InlineEditableSettingTextVariant =
  | `body`
  | `hint`
  | `hintExplanation`
  | `title`;

interface InlineEditableSettingTextProps<T extends UserSettingTextEntity> {
  variant?: InlineEditableSettingTextVariant;
  setting: T;
  settingKey: UserSettingKeyInput<T>;
  placeholder: string;
  /**
   * @deprecated Use `useUserSettingTextDefaultValue` hook instead for better
   * consistency and to avoid confusion with the `defaultValue` prop of the
   * underlying `TextInput`.
   */
  defaultValue?: string;
  multiline?: boolean;
  maxLength?: number;
  showCounterAtRatio?: number;
  overLimitMessage?: string;
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
  variant = `body`,
  setting,
  settingKey,
  placeholder,
  // oxlint-disable-next-line typescript/no-deprecated
  defaultValue,
  multiline = false,
  maxLength,
  showCounterAtRatio = 0.8,
  overLimitMessage,
  displayClassName,
  emptyClassName,
  inputClassName,
  displayContainerClassName,
  displayHoverClassName,
  renderDisplay,
  sanitizeValue = defaultSanitizeValue,
}: InlineEditableSettingTextProps<T>): ReactNode {
  "use memo";
  const { value, setValue } = useUserSetting(setting, settingKey);
  const history = useUserSettingHistory(setting, settingKey);
  const defaultValueFromHook = useUserSettingTextDefaultValue(
    setting,
    settingKey,
  );
  const currentValue: string = value?.text ?? ``;
  const fallbackValue = defaultValue ?? defaultValueFromHook ?? ``;
  const displayValue = currentValue.length > 0 ? currentValue : fallbackValue;
  const hasDisplayValue = displayValue.length > 0;
  const sanitizedDefaultValue = sanitizeValue(fallbackValue);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(displayValue);
  const containerRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(displayValue);
    }
  }, [displayValue, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const exitEditMode = () => {
      saveDraftValue(draft, sanitizeValue, sanitizedDefaultValue, setValue);
      setIsEditing(false);
    };

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
  }, [draft, isEditing, sanitizeValue, sanitizedDefaultValue, setValue]);

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
      saveDraftValue(draft, sanitizeValue, sanitizedDefaultValue, setValue);
    }

    if (event.nativeEvent.key === `Escape`) {
      event.preventDefault();
      setDraft(currentValue);
      setIsEditing(false);
    }
  };

  const displayText = hasDisplayValue ? displayValue : placeholder;
  const displayContent = hasDisplayValue
    ? (renderDisplay?.(displayText) ?? displayText)
    : displayText;
  const historyEntries = getHistoryEntries(history.entries, currentValue);
  const showHistoryButton =
    isEditing && draft.trim().length === 0 && historyEntries.length > 0;

  const displayViewClassName = displayContainer({
    variant,
    class: [displayContainerClassName, displayHoverClassName]
      .filter(Boolean)
      .join(` `),
  });
  const displayTextClassName = displayTextStyle({
    variant,
    class: displayClassName,
  });
  const emptyTextClassName = emptyTextStyle({
    variant,
    class: emptyClassName,
  });
  const inputTextClassName = inputText({ variant, class: inputClassName });
  const counterThreshold =
    maxLength == null ? null : Math.ceil(maxLength * showCounterAtRatio);
  const showCounter =
    maxLength != null &&
    counterThreshold != null &&
    draft.length >= counterThreshold;
  const isAtLimit = maxLength != null && draft.length >= maxLength;
  const isTooLong = maxLength != null && draft.length > maxLength;

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
            className={inputTextClassName}
            style={showHistoryButton ? { paddingRight: 32 } : undefined}
          />
          {showCounter ? (
            <View className="mt-1 flex-row items-center justify-between gap-2">
              {overLimitMessage == null ? (
                <View />
              ) : (
                <Text
                  className={
                    isTooLong
                      ? `text-[12px] text-fg`
                      : `text-[12px] text-fg-dim`
                  }
                  style={
                    isTooLong ? { color: `var(--color-warning)` } : undefined
                  }
                >
                  {overLimitMessage}
                </Text>
              )}
              <View className="flex-row items-center gap-1">
                <Text
                  className={
                    isAtLimit
                      ? `
                        text-right text-[11px] text-fg

                        [--color-fg:var(--color-warning)]
                      `
                      : `text-right text-[11px] text-fg-dim`
                  }
                >
                  {draft.length}/{maxLength}
                </Text>
                <ProgressPieIcon
                  progress={maxLength == null ? 0 : draft.length / maxLength}
                  warn={isAtLimit}
                  size={12}
                />
              </View>
            </View>
          ) : null}
          {showHistoryButton ? (
            <View className="absolute right-2 top-2">
              <FloatingMenuModal
                menu={
                  <InlineEditableSettingHistoryMenu
                    entries={historyEntries}
                    onSelect={(nextValue) => {
                      setDraft(nextValue);
                      inputRef.current?.focus();
                    }}
                  />
                }
              >
                <RectButton
                  variant="bare"
                  iconStart="time-circled"
                  iconSize={16}
                  className={`text-fg-dim`}
                />
              </FloatingMenuModal>
            </View>
          ) : null}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          className={pressable()}
          onPress={() => {
            setIsEditing(true);
          }}
        >
          <View className={displayViewClassName}>
            <Text
              className={
                hasDisplayValue ? displayTextClassName : emptyTextClassName
              }
            >
              {displayContent}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

function saveDraftValue<T extends UserSettingTextEntity>(
  draft: string,
  sanitizeValue: (value: string) => string | null,
  sanitizedDefaultValue: string | null,
  setValue: (value: UserSettingEntityInput<T> | null) => void,
) {
  const sanitized = sanitizeValue(draft);
  const isDefaultValue =
    sanitized != null && sanitizedDefaultValue != null
      ? sanitized === sanitizedDefaultValue
      : sanitized == null && sanitizedDefaultValue == null;

  setValue(
    sanitized == null || isDefaultValue
      ? null
      : ({ text: sanitized } as UserSettingEntityInput<T>),
  );
}

const pressable = tv({
  base: `
    group

    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
    focus-visible:outline-fg/60

    web:transition-colors
  `,
});

const displayContainer = tv({
  variants: {
    variant: {
      body: `
        -mx-2 rounded-md px-2 py-1

        group-hover:bg-fg-bg10
      `,
      hint: `
        -mx-2 rounded-md px-2 py-1

        group-hover:bg-fg-bg10
      `,
      hintExplanation: `
        -mx-2 rounded-md px-2 py-1

        group-hover:bg-fg-bg10
      `,
      title: `
        -mx-1 rounded-md px-1 py-0.5

        group-hover:bg-fg-bg10
      `,
    },
  },
});

const displayTextStyle = tv({
  variants: {
    variant: {
      body: `pyly-body text-[14px] text-fg`,
      hint: `pyly-body text-[14px] font-semibold text-fg-loud`,
      hintExplanation: `pyly-body text-[14px] text-fg`,
      title: `text-3xl font-bold text-fg`,
    },
  },
});

const emptyTextStyle = tv({
  variants: {
    variant: {
      body: `pyly-body text-[14px] text-fg-dim`,
      hint: `pyly-body text-[14px] font-semibold text-fg-dim`,
      hintExplanation: `pyly-body text-[14px] text-fg-dim`,
      title: `select-none text-3xl text-fg/20`,
    },
  },
});

const inputText = tv({
  variants: {
    variant: {
      body: `pyly-body-input rounded-md bg-bg-high px-2 py-1 text-[14px] text-fg`,
      hint: `pyly-body-input rounded-md bg-bg-high px-2 py-1 text-[14px] font-semibold text-fg-loud`,
      hintExplanation: `pyly-body-input rounded-md bg-bg-high px-2 py-1 text-[14px] text-fg`,
      title: `rounded-md bg-bg-high px-1 py-0.5 text-3xl font-bold text-fg`,
    },
  },
});

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

function InlineEditableSettingHistoryMenu({
  entries,
  onSelect,
  onRequestClose,
}: {
  entries: HistoryEntry[];
  onSelect: (value: string) => void;
} & FloatingMenuModalMenuProps) {
  return (
    <ScrollView
      className="shadow-lg max-h-[400px] w-[300px] rounded-xl bg-bg-high"
      contentContainerClassName="gap-1 p-2"
    >
      {entries.map((entry) => (
        <Pressable
          key={entry.id}
          onPress={() => {
            onSelect(entry.value);
            onRequestClose?.();
          }}
        >
          <View
            className={`
              gap-1 rounded-lg px-3 py-2

              hover:bg-fg-bg10
            `}
          >
            <Text className="text-[14px] text-fg">{entry.value}</Text>
            <Text className="text-[12px] text-fg-dim">
              {formatRelativeTime(entry.createdAt)}
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
