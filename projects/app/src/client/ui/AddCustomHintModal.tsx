import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { IconImage } from "./IconImage";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";
import { TextInputSingle } from "./TextInputSingle";

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

  const isEditing = initialHint.length > 0;
  const canSave = hint.trim().length > 0;

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
      <View className="gap-4 p-4">
        <View className="gap-2">
          <Text className="text-[14px] font-medium text-fg">Your hint</Text>
          <TextInputSingle
            placeholder="Enter a hint that helps you remember..."
            value={hint}
            onChangeText={setHint}
            multiline
            numberOfLines={3}
            className="min-h-[80px] py-3"
            textAlignVertical="top"
          />
        </View>

        {/* Explanation toggle/field */}
        {showExplanation ? (
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
                <IconImage
                  size={16}
                  source={require(`../../assets/icons/chevron-down.svg`)}
                  className="text-fg-dim"
                />
              </Pressable>
            </View>
            <TextInputSingle
              placeholder="Why does this hint work for you?"
              value={explanation}
              onChangeText={setExplanation}
              multiline
              numberOfLines={2}
              className="min-h-[60px] py-3"
              textAlignVertical="top"
            />
          </View>
        ) : (
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
        )}
      </View>
    </View>
  );
}
