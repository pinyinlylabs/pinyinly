import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Image as RnImage,
  ScrollView,
  Text,
  View,
} from "react-native";
import { AssetImage } from "./AssetImage";
import { IconImage } from "./IconImage";
import { ImageUploadButton, useImageUploader } from "./ImageUploadButton";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";
import { TextInputSingle } from "./TextInputSingle";

interface AddCustomHintModalProps {
  onDismiss: () => void;
  onSave: (
    hint: string,
    explanation: string | undefined,
    imageIds: string[] | undefined,
  ) => void;
  /** Initial hint text when editing an existing hint */
  initialHint?: string;
  /** Initial explanation text when editing an existing hint */
  initialExplanation?: string;
  /** Initial image IDs when editing an existing hint */
  initialImageIds?: readonly string[];
}

export function AddCustomHintModal({
  onDismiss,
  onSave,
  initialHint = ``,
  initialExplanation = ``,
  initialImageIds = [],
}: AddCustomHintModalProps) {
  return (
    <PageSheetModal onDismiss={onDismiss} suspenseFallback={null}>
      {({ dismiss }) => (
        <AddCustomHintModalContent
          onDismiss={dismiss}
          onSave={(hint, explanation, imageIds) => {
            onSave(hint, explanation, imageIds);
            dismiss();
          }}
          initialHint={initialHint}
          initialExplanation={initialExplanation}
          initialImageIds={initialImageIds}
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
  initialImageIds,
}: {
  onDismiss: () => void;
  onSave: (
    hint: string,
    explanation: string | undefined,
    imageIds: string[] | undefined,
  ) => void;
  initialHint: string;
  initialExplanation: string;
  initialImageIds: readonly string[];
}) {
  const [hint, setHint] = useState(initialHint);
  const [explanation, setExplanation] = useState(initialExplanation);
  const [imageIds, setImageIds] = useState<string[]>([...initialImageIds]);
  const [showExplanation, setShowExplanation] = useState(
    initialExplanation.length > 0,
  );

  const isEditing = initialHint.length > 0;
  const canSave = hint.trim().length > 0;

  useEffect(() => {
    setHint(initialHint);
  }, [initialHint]);

  useEffect(() => {
    setExplanation(initialExplanation);
    setShowExplanation(initialExplanation.length > 0);
  }, [initialExplanation]);

  useEffect(() => {
    setImageIds([...initialImageIds]);
  }, [initialImageIds]);

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
                imageIds.length > 0 ? imageIds : undefined,
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
            <ImagePasteDropZone
              onUploadComplete={(assetId) => {
                setImageIds((current) => [...current, assetId]);
              }}
              onUploadError={(error) => {
                // TODO: Show error toast/alert
                console.error(`Upload error:`, error);
              }}
            />
            <ImageUploadButton
              onUploadComplete={(assetId) => {
                setImageIds((current) => [...current, assetId]);
              }}
              onUploadError={(error) => {
                // TODO: Show error toast/alert
                console.error(`Upload error:`, error);
              }}
              buttonText="Add image"
            />

            {/* Display uploaded images */}
            {imageIds.length > 0 && (
              <View className="mt-2 flex-row flex-wrap gap-2">
                {imageIds.map((assetId) => (
                  <View
                    key={assetId}
                    className="relative size-24 overflow-hidden rounded-lg border border-fg/10"
                  >
                    <AssetImage assetId={assetId} className="size-full" />
                    {/* Remove button */}
                    <Pressable
                      onPress={() => {
                        setImageIds(imageIds.filter((id) => id !== assetId));
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

function ImagePasteDropZone({
  onUploadComplete,
  onUploadError,
}: {
  onUploadComplete: (assetId: string) => void;
  onUploadError?: (error: string) => void;
}) {
  const [pasteArmed, setPasteArmed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const hasPreview = previewUrl != null && previewUrl.length > 0;

  const handleUploadComplete = (assetId: string) => {
    setPreviewUrl((current) => {
      if (current != null && current.length > 0) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    onUploadComplete(assetId);
  };

  const handleUploadError = (error: string) => {
    onUploadError?.(error);
  };

  const { uploading, uploadImageBlob } = useImageUploader({
    onUploadComplete: handleUploadComplete,
    onUploadError: handleUploadError,
  });

  useEffect(() => {
    if (Platform.OS !== `web` || !pasteArmed || typeof window === `undefined`) {
      return;
    }

    const handlePaste = (event: ClipboardEvent) => {
      if (uploading) {
        return;
      }

      const clipboardData = event.clipboardData;
      const items = clipboardData?.items ? Array.from(clipboardData.items) : [];
      const fileItem = items.find(
        (item) => item.kind === `file` && item.type.startsWith(`image/`),
      );
      const fileFromItems = fileItem?.getAsFile() ?? null;
      const fileFromFiles = clipboardData?.files
        ? Array.from(clipboardData.files).find((file) =>
            file.type.startsWith(`image/`),
          )
        : null;
      const file = fileFromItems ?? fileFromFiles;

      if (file == null) {
        handleUploadError(`Clipboard does not contain an image`);
        return;
      }

      event.preventDefault();
      setPasteArmed(false);
      const nextPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl((current) => {
        if (current != null && current.length > 0) {
          URL.revokeObjectURL(current);
        }
        return nextPreviewUrl;
      });
      void uploadImageBlob({ blob: file, contentType: file.type });
    };

    window.addEventListener(`paste`, handlePaste);
    return () => {
      window.removeEventListener(`paste`, handlePaste);
    };
  }, [handleUploadError, pasteArmed, uploadImageBlob, uploading]);

  useEffect(() => {
    return () => {
      if (previewUrl != null && previewUrl.length > 0) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (Platform.OS !== `web`) {
    return null;
  }

  return (
    <Pressable
      onPress={() => {
        setPasteArmed(true);
      }}
      className={`
        items-center justify-center gap-2 rounded-lg border border-dashed border-fg/20 bg-fg/5 px-3
        py-4
      `}
    >
      {hasPreview ? (
        <View className="items-center gap-2">
          <View className="size-28 overflow-hidden rounded-md border border-fg/10">
            <RnImage
              source={{ uri: previewUrl }}
              className="size-full"
              resizeMode="cover"
            />
          </View>
          <Text className="text-[12px] text-fg-dim">
            {uploading ? `Uploading...` : `Pasted preview`}
          </Text>
        </View>
      ) : uploading ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" className="text-fg" />
          <Text className="text-[13px] text-fg">Uploading image...</Text>
        </View>
      ) : (
        <View className="items-center gap-1">
          <Text className="text-[13px] text-fg">
            {pasteArmed
              ? `Now paste your image`
              : `Click here then press Cmd+V to paste an image`}
          </Text>
          <Text className="text-[12px] text-fg-dim">Web only</Text>
        </View>
      )}
    </Pressable>
  );
}
