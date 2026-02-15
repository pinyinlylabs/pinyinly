import type { HanziText, HanziWord } from "@/data/model";
import { buildHanziWord } from "@/dictionary";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { HanziHintOption } from "./HanziHintOption";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";

interface PresetHint {
  hint: string;
  explanation?: string;
  imageIds: readonly string[] | null;
  meaningKey: string;
}

interface AllHintsModalProps {
  hanzi: HanziText;
  onDismiss: () => void;
  presetHints: PresetHint[];
  currentHint: {
    hint: string;
    explanation?: string;
    imageIds: readonly string[] | null;
  } | null;
  onSavePresetHint: (hanziWord: HanziWord, hint: PresetHint) => void;
}

export function AllHintsModal({
  hanzi,
  onDismiss,
  presetHints,
  currentHint,
  onSavePresetHint,
}: AllHintsModalProps) {
  const initialPresetHint = useMemo(() => {
    if (currentHint == null) {
      return null;
    }
    return presetHints.find((hint) => hint.hint === currentHint.hint) ?? null;
  }, [currentHint, presetHints]);

  const [draftHint, setDraftHint] = useState<PresetHint | null>(
    initialPresetHint,
  );

  const previewHint = draftHint ?? currentHint ?? presetHints[0] ?? null;
  const canSave = draftHint != null;

  return (
    <PageSheetModal
      onDismiss={onDismiss}
      suspenseFallback={<Text>Loading…</Text>}
    >
      {({ dismiss }) => (
        <View className="flex-1 bg-bg">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-fg/10 px-4 py-3">
            <RectButton variant="bare" onPress={dismiss}>
              Cancel
            </RectButton>
            <Text className="text-[17px] font-semibold text-fg-loud">
              Hint gallery
            </Text>
            <RectButton
              variant="bare"
              onPress={() => {
                if (draftHint == null) {
                  return;
                }
                const hintMeaningKey = draftHint.meaningKey.toLowerCase();
                const hintHanziWord = buildHanziWord(hanzi, hintMeaningKey);
                onSavePresetHint(hintHanziWord, draftHint);
                dismiss();
              }}
              disabled={!canSave}
            >
              Save
            </RectButton>
          </View>

          {/* Scrollable content */}
          <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4">
            <View className="gap-2">
              <Text className="text-[13px] font-medium text-fg-dim">
                Preview
              </Text>
              {previewHint == null ? (
                <View className="rounded-lg border-2 border-dashed border-fg/20 p-4">
                  <Text className="text-[14px] text-fg-dim">
                    Select a system hint to preview it here.
                  </Text>
                </View>
              ) : (
                <HanziHintOption
                  hint={previewHint.hint}
                  explanation={previewHint.explanation}
                  imageIds={previewHint.imageIds}
                  isSelected
                  onPress={() => {
                    // Preview only; selection happens in the list below.
                  }}
                />
              )}
              {currentHint != null && initialPresetHint == null ? (
                <Text className="text-[12px] text-fg-dim">
                  You are currently using a custom hint.
                </Text>
              ) : null}
            </View>

            <View className="gap-2">
              <Text className="text-[13px] font-medium text-fg-dim">
                System hints
              </Text>
              {presetHints.map((h, index) => {
                const isSelected = draftHint?.hint === h.hint;
                return (
                  <HanziHintOption
                    key={`preset-${index}`}
                    hint={h.hint}
                    explanation={h.explanation}
                    imageIds={h.imageIds}
                    isSelected={isSelected}
                    onPress={() => {
                      setDraftHint(h);
                    }}
                  />
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </PageSheetModal>
  );
}
