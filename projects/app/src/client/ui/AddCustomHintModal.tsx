import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AssetImage } from "./AssetImage";
import { IconImage } from "./IconImage";
import { ImageUploadButton } from "./ImageUploadButton";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";
import { TextInputSingle } from "./TextInputSingle";

interface AddCustomHintModalProps {
  onDismiss: () => void;
  onSave: (
    hint: string,
    explanation: string | undefined,
    assetIds: string[] | undefined,
  ) => void;
  /** Initial hint text when editing an existing hint */
  initialHint?: string;
  /** Initial explanation text when editing an existing hint */
  initialExplanation?: string;
  /** Initial asset IDs when editing an existing hint */
  initialAssetIds?: readonly string[];
}

export function AddCustomHintModal({
  onDismiss,
  onSave,
  initialHint = ``,
  initialExplanation = ``,
  initialAssetIds = [],
}: AddCustomHintModalProps) {
  return (
    <PageSheetModal onDismiss={onDismiss} suspenseFallback={null}>
      {({ dismiss }) => (
        <AddCustomHintModalContent
          onDismiss={dismiss}
          onSave={(hint, explanation, assetIds) => {
            onSave(hint, explanation, assetIds);
            dismiss();
          }}
          initialHint={initialHint}
          initialExplanation={initialExplanation}
          initialAssetIds={initialAssetIds}
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
  initialAssetIds,
}: {
  onDismiss: () => void;
  onSave: (
    hint: string,
    explanation: string | undefined,
    assetIds: string[] | undefined,
  ) => void;
  initialHint: string;
  initialExplanation: string;
  initialAssetIds: readonly string[];
}) {
  const [hint, setHint] = useState(initialHint);
  const [explanation, setExplanation] = useState(initialExplanation);
  const [assetIds, setAssetIds] = useState<string[]>([...initialAssetIds]);
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
                assetIds.length > 0 ? assetIds : undefined,
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
                    icon="chevron-down"
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

          {/* Image upload section */}
          <View className="gap-2">
            <Text className="text-[14px] font-medium text-fg">
              Images (optional)
            </Text>
            <ImageUploadButton
              onUploadComplete={(assetId) => {
                setAssetIds([...assetIds, assetId]);
              }}
              onUploadError={(error) => {
                // TODO: Show error toast/alert
                console.error(`Upload error:`, error);
              }}
              buttonText="Add image"
            />

            {/* Display uploaded images */}
            {assetIds.length > 0 && (
              <View className="mt-2 flex-row flex-wrap gap-2">
                {assetIds.map((assetId) => (
                  <View
                    key={assetId}
                    className="relative size-24 overflow-hidden rounded-lg border border-fg/10"
                  >
                    <AssetImage assetId={assetId} className="size-full" />
                    {/* Remove button */}
                    <Pressable
                      onPress={() => {
                        setAssetIds(assetIds.filter((id) => id !== assetId));
                      }}
                      className="absolute right-1 top-1 rounded-full bg-bg/90 p-1"
                    >
                      <IconImage size={16} icon="close" className="text-fg" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
