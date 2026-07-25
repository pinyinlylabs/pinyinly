import type {
  UserSettingEntity,
  UserSettingEntityInput,
  UserSettingEntityLike,
  UserSettingKeyInput,
} from "@/client/ui/hooks/useUserSetting";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { TextInputMulti } from "./TextInputMulti";

interface InlineEditableSettingJsonProps<T extends UserSettingEntity> {
  setting: UserSettingEntityLike<T>;
  settingKey: UserSettingKeyInput<T>;
  readonly?: boolean;
  placeholder?: string;
  emptyStateText?: string;
  errorTextInvalidJson?: string;
  autoResizeMinHeight?: number;
  className?: string;
  inputClassName?: string;
  renderDisplay?: (value: unknown) => ReactNode;
  onSaveValue?: (value: unknown) => void;
}

export function InlineEditableSettingJson<T extends UserSettingEntity>({
  setting,
  settingKey,
  readonly = false,
  placeholder,
  emptyStateText,
  errorTextInvalidJson = `Invalid JSON. Fix formatting before saving.`,
  autoResizeMinHeight = 100,
  className,
  inputClassName,
  renderDisplay,
  onSaveValue,
}: InlineEditableSettingJsonProps<T>) {
  const { value, setValue } = useUserSetting({ setting, key: settingKey });
  const jsonValueField = inferJsonValueField(setting, settingKey);
  if (jsonValueField == null) {
    throw new Error(
      `InlineEditableSettingJson requires exactly one non-key setting field.`,
    );
  }

  const currentJsonValue =
    value == null
      ? null
      : (((value as Record<string, unknown>)[jsonValueField] ??
          null) as unknown);
  const currentJsonText = formatJsonValue(currentJsonValue);

  const [draft, setDraft] = useState(currentJsonText);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const skipNextBlurSaveRef = useRef(false);

  useEffect(() => {
    if (isDirty) {
      return;
    }

    setDraft(currentJsonText);
    setError(null);
  }, [currentJsonText, isDirty]);

  const handleSaveDraft = () => {
    const trimmed = draft.trim();

    if (trimmed.length === 0) {
      if (currentJsonValue != null) {
        setValue(null);
        onSaveValue?.(null);
      }

      setDraft(``);
      setError(null);
      setIsDirty(false);
      return;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      const normalizedCurrent =
        currentJsonValue == null ? null : JSON.stringify(currentJsonValue);
      const normalizedNext = JSON.stringify(parsed);

      if (normalizedCurrent !== normalizedNext) {
        setValue({ [jsonValueField]: parsed } as UserSettingEntityInput<T>);
        onSaveValue?.(parsed);
      }

      setDraft(formatJsonValue(parsed));
      setError(null);
      setIsDirty(false);
    } catch {
      setError(errorTextInvalidJson);
    }
  };

  const hasDisplayContent = hasJsonContent(currentJsonValue);

  if (readonly) {
    if (!hasDisplayContent) {
      if (emptyStateText == null) {
        return null;
      }

      return (
        <View className={className}>
          <Text className="pyly-body-caption text-fg-dim">
            {emptyStateText}
          </Text>
        </View>
      );
    }

    return (
      <View className={className}>
        {renderDisplay == null ? (
          <Text className="font-mono text-[12px] text-fg">
            {currentJsonText}
          </Text>
        ) : (
          renderDisplay(currentJsonValue)
        )}
      </View>
    );
  }

  return (
    <View className={className}>
      <View className="gap-2">
        <TextInputMulti
          variant="bare"
          placeholder={placeholder}
          autoResizeMinHeight={autoResizeMinHeight}
          value={draft}
          onChangeText={(nextValue) => {
            setDraft(nextValue);
            setIsDirty(true);
            if (error != null) {
              setError(null);
            }
          }}
          onBlur={() => {
            if (skipNextBlurSaveRef.current) {
              skipNextBlurSaveRef.current = false;
              return;
            }

            handleSaveDraft();
          }}
          onKeyPress={(event: {
            nativeEvent: { key: string; shiftKey?: boolean };
            preventDefault: () => void;
          }) => {
            if (event.nativeEvent.key === `Enter`) {
              const isShiftPressed = event.nativeEvent.shiftKey === true;
              if (isShiftPressed) {
                return;
              }

              event.preventDefault();
              handleSaveDraft();
              return;
            }

            if (event.nativeEvent.key === `Escape`) {
              event.preventDefault();
              skipNextBlurSaveRef.current = true;
              setDraft(currentJsonText);
              setError(null);
              setIsDirty(false);
            }
          }}
          className={[
            `min-h-24 rounded-md border border-fg/15 bg-bg px-3 py-2 font-mono text-[12px]`,
            inputClassName,
          ]
            .filter((x) => x != null)
            .join(` `)}
        />

        {error == null ? null : (
          <Text className="pyly-body-caption text-danger">{error}</Text>
        )}
      </View>
    </View>
  );
}

function formatJsonValue(value: unknown): string {
  if (value == null) {
    return ``;
  }

  return JSON.stringify(value, null, 2);
}

function hasJsonContent(value: unknown): boolean {
  if (value == null) {
    return false;
  }

  if (typeof value === `string`) {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === `object`) {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return true;
}

function inferJsonValueField<T extends UserSettingEntity>(
  setting: UserSettingEntityLike<T>,
  settingKey: UserSettingKeyInput<T>,
): string | null {
  const valueShape = (
    setting.entity as unknown as {
      _def?: {
        valueType?: {
          _def?: {
            shape?: Record<string, unknown>;
          };
        };
      };
    }
  )._def?.valueType?._def?.shape;

  if (valueShape == null) {
    return null;
  }

  const keyFieldNames = new Set(
    Object.keys(settingKey as Record<string, unknown>),
  );
  const payloadFieldNames = Object.keys(valueShape).filter(
    (fieldName) => !keyFieldNames.has(fieldName),
  );

  return payloadFieldNames.length === 1 ? (payloadFieldNames[0] ?? null) : null;
}
