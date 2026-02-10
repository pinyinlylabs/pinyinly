import type {
  UserSettingEntity,
  UserSettingEntityInput,
  UserSettingKeyInput,
} from "@/client/hooks/useUserSetting";
import { useUserSetting } from "@/client/hooks/useUserSetting";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { confirmDiscardChanges } from "./confirmDiscardChanges";

interface InlineEditableSettingTextProps<T extends UserSettingEntity> {
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

export function InlineEditableSettingText<T extends UserSettingEntity>({
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
  const currentValue = (value as { t?: string } | null)?.t ?? ``;

  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [draft, setDraft] = useState(currentValue);
  const skipBlurSaveRef = useRef(false);

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
        : ({ t: sanitized } as UserSettingEntityInput<T>),
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

  return (
    <View>
      {isEditing ? (
        <TextInput
          autoFocus
          multiline={multiline}
          value={draft}
          onChangeText={setDraft}
          onBlur={handleBlur}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className={inputClassName}
        />
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
    </View>
  );
}
