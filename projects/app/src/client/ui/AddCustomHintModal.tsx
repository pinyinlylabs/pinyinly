import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Icon } from "./Icon";
import { PageSheetModal } from "./PageSheetModal";
import { ProgressPieIcon } from "./ProgressPieIcon";
import { RectButton } from "./RectButton";
import { TextInputMulti } from "./TextInputMulti";

interface AddCustomHintModalProps {
  onDismiss: () => void;
  onSave: (hint: string, explanation: string | undefined) => void;
  /** Initial hint text when editing an existing hint */
  initialHint?: string;
  /** Initial explanation text when editing an existing hint */
  initialExplanation?: string;
}

export function AddCustomHintModal({
  onDismiss,
  onSave,
  initialHint = ``,
  initialExplanation = ``,
}: AddCustomHintModalProps) {
  return (
    <PageSheetModal onDismiss={onDismiss} suspenseFallback={null}>
      {({ dismiss }) => (
        <AddCustomHintModalContent
          onDismiss={dismiss}
          onSave={(hint, explanation) => {
            onSave(hint, explanation);
            dismiss();
          }}
          initialHint={initialHint}
          initialExplanation={initialExplanation}
        />
      )}
    </PageSheetModal>
  );
}

function AddCustomHintModalContent({
  onDismiss,
  onSave,
  initialHint,
  initialExplanation,
}: {
  onDismiss: () => void;
  onSave: (hint: string, explanation: string | undefined) => void;
  initialHint: string;
  initialExplanation: string;
}) {
  const [hint, setHint] = useState(initialHint);
  const [explanation, setExplanation] = useState(initialExplanation);
  const [showExplanation, setShowExplanation] = useState(
    initialExplanation.length > 0,
  );
  const hintLengthTarget = 80;
  const hintCounterThreshold = Math.ceil(hintLengthTarget * 0.8);

  const isEditing = initialHint.length > 0;
  const canSave = hint.trim().length > 0;
  const trimmedHintLength = hint.trim().length;
  const canShowExplanation = trimmedHintLength > 0;
  const isHintTooLong = trimmedHintLength > hintLengthTarget;
  const isHintAtLimit = trimmedHintLength >= hintLengthTarget;

  return (
    <View className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-fg/10 px-4 py-3">
        <RectButton variant="bare" onPress={onDismiss}>
          Cancel
        </RectButton>
        <Text className="text-[17px] font-semibold text-fg-loud">
          {isEditing ? `Edit hint` : `Create hint`}
        </Text>
        <RectButton
          variant="bare"
          onPress={() => {
            if (canSave) {
              onSave(
                hint.trim(),
                showExplanation && explanation.trim().length > 0
                  ? explanation.trim()
                  : undefined,
              );
            }
          }}
          disabled={!canSave}
        >
          Save
        </RectButton>
      </View>

      {/* Content */}
      <ScrollView className="flex-1">
        <View className="gap-4 p-4">
          <View className="gap-2">
            <Text className="text-[14px] font-medium text-fg">Your hint</Text>
            <TextInputMulti
              placeholder="Enter a hint that helps you remember..."
              value={hint}
              onChangeText={setHint}
              numberOfLines={6}
              style={{ minHeight: 160 }}
            />
            {trimmedHintLength >= hintCounterThreshold ? (
              <View className="flex-row items-center justify-between gap-2">
                <Text
                  className={
                    isHintTooLong
                      ? `text-[12px] text-fg`
                      : `text-[12px] text-fg-dim`
                  }
                  style={
                    isHintTooLong
                      ? { color: `var(--color-warning)` }
                      : undefined
                  }
                >
                  Keep hints under {hintLengthTarget} characters. Move extra
                  detail to the explanation.
                </Text>
                <View className="flex-row items-center gap-1">
                  <Text
                    className={
                      isHintAtLimit
                        ? `
                          text-right text-[11px] text-fg

                          [--color-fg:var(--color-warning)]
                        `
                        : `text-right text-[11px] text-fg-dim`
                    }
                  >
                    {trimmedHintLength}/{hintLengthTarget}
                  </Text>
                  <ProgressPieIcon
                    progress={trimmedHintLength / hintLengthTarget}
                    warn={isHintAtLimit}
                    size={12}
                  />
                </View>
              </View>
            ) : null}
          </View>

          {/* Explanation toggle/field */}
          {showExplanation && canShowExplanation ? (
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-[14px] font-medium text-fg">
                  Explanation (optional)
                </Text>
                <Pressable
                  onPress={() => {
                    setShowExplanation(false);
                    setExplanation(``);
                  }}
                >
                  <Icon size={16} icon="chevron-down" className="text-fg-dim" />
                </Pressable>
              </View>
              <TextInputMulti
                placeholder="Why does this hint work for you?"
                value={explanation}
                onChangeText={setExplanation}
                numberOfLines={2}
                style={{ minHeight: 60 }}
              />
            </View>
          ) : canShowExplanation ? (
            <Pressable
              onPress={() => {
                setShowExplanation(true);
              }}
              className="flex-row items-center gap-1.5"
            >
              <Text className="text-[14px] text-cyan">
                Add explanation (optional)
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
