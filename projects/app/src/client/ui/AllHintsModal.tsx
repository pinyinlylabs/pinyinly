import type { HanziText, HanziWord } from "@/data/model";
import { buildHanziWord } from "@/dictionary";
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

interface CustomHint {
  customHintId: string;
  hint: string;
  explanation?: string;
  imageIds?: readonly string[];
}

interface AllHintsModalProps {
  hanzi: HanziText;
  onDismiss: () => void;
  presetHints: PresetHint[];
  customHints: CustomHint[];
  selectedHint: string | undefined;
  onSelectPresetHint: (hanziWord: HanziWord, hint: string) => void;
  onSelectCustomHint: (customHintId: string, hint: string) => void;
  onEditCustomHint: (customHintId: string) => void;
  onDeleteCustomHint: (customHintId: string) => void;
}

export function AllHintsModal({
  hanzi,
  onDismiss,
  presetHints,
  customHints,
  selectedHint,
  onSelectPresetHint,
  onSelectCustomHint,
  onEditCustomHint,
  onDeleteCustomHint,
}: AllHintsModalProps) {
  return (
    <PageSheetModal
      onDismiss={onDismiss}
      suspenseFallback={<Text>Loading…</Text>}
    >
      {({ dismiss }) => (
        <View className="flex-1 bg-bg">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-fg/10 px-4 py-3">
            <View className="w-[60px]" />
            <Text className="text-[17px] font-semibold text-fg-loud">
              All hints
            </Text>
            <RectButton variant="bare" onPress={dismiss}>
              Done
            </RectButton>
          </View>

          {/* Scrollable content */}
          <ScrollView className="flex-1" contentContainerClassName="gap-2 p-4">
            {/* Preset hints */}
            {presetHints.map((h, index) => {
              const isSelected = selectedHint === h.hint;
              const hintMeaningKey = h.meaningKey.toLowerCase();
              const hintHanziWord = buildHanziWord(hanzi, hintMeaningKey);
              return (
                <HanziHintOption
                  key={`preset-${index}`}
                  hint={h.hint}
                  explanation={h.explanation}
                  imageIds={h.imageIds}
                  isSelected={isSelected}
                  onPress={() => {
                    onSelectPresetHint(hintHanziWord, h.hint);
                    dismiss();
                  }}
                />
              );
            })}

            {/* Custom hints */}
            {customHints.map((h) => {
              const isSelected = selectedHint === h.hint;
              return (
                <HanziHintOption
                  key={`custom-${h.customHintId}`}
                  hint={h.hint}
                  explanation={h.explanation}
                  imageIds={h.imageIds ?? null}
                  isSelected={isSelected}
                  isUser
                  onPress={() => {
                    onSelectCustomHint(h.customHintId, h.hint);
                    dismiss();
                  }}
                  onEdit={() => {
                    onEditCustomHint(h.customHintId);
                    dismiss();
                  }}
                  onDelete={() => {
                    onDeleteCustomHint(h.customHintId);
                  }}
                />
              );
            })}
          </ScrollView>
        </View>
      )}
    </PageSheetModal>
  );
}
