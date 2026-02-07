import type { HanziText, HanziWord } from "@/data/model";
import { buildHanziWord } from "@/dictionary";
import { Pressable, ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { AssetImage } from "./AssetImage";
import { IconImage } from "./IconImage";
import { PageSheetModal } from "./PageSheetModal";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";

interface PresetHint {
  hint: string;
  explanation?: string;
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
                <HintOption
                  key={`preset-${index}`}
                  hint={h.hint}
                  explanation={h.explanation}
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
                <CustomHintOption
                  key={`custom-${h.customHintId}`}
                  hint={h.hint}
                  explanation={h.explanation}
                  imageIds={h.imageIds}
                  isSelected={isSelected}
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

function HintOption({
  hint,
  explanation,
  isSelected,
  onPress,
}: {
  hint: string;
  explanation: string | undefined;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View className={hintOptionClass({ isSelected })}>
        <Text className="text-[14px] font-semibold text-fg-loud">
          <Pylymark source={hint} />
        </Text>
        {explanation != null && (
          <Text className="text-[14px] text-fg">
            <Pylymark source={explanation} />
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function CustomHintOption({
  hint,
  explanation,
  imageIds,
  isSelected,
  onPress,
  onEdit,
  onDelete,
}: {
  hint: string;
  explanation: string | undefined;
  imageIds: readonly string[] | undefined;
  isSelected: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View className={hintOptionClass({ isSelected })}>
        {/* Your hint badge */}
        <View className="mb-1 flex-row items-center gap-2">
          <View className="rounded-full bg-purple/20 px-2 py-0.5">
            <Text className="text-[11px] font-medium text-purple">
              Your hint
            </Text>
          </View>
          <View className="flex-1" />
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            hitSlop={8}
          >
            <IconImage size={16} icon="puzzle" className="text-fg-dim" />
          </Pressable>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            hitSlop={8}
          >
            <IconImage size={16} icon="close" className="text-fg-dim" />
          </Pressable>
        </View>
        <Text className="text-[14px] font-semibold text-fg-loud">
          <Pylymark source={hint} />
        </Text>
        {explanation != null && (
          <Text className="text-[14px] text-fg">
            <Pylymark source={explanation} />
          </Text>
        )}
        {imageIds != null && imageIds.length > 0 && (
          <View className="mt-2 flex-row flex-wrap gap-2">
            {imageIds.slice(0, 3).map((assetId) => (
              <View
                key={assetId}
                className="size-14 overflow-hidden rounded-md border border-fg/10"
              >
                <AssetImage assetId={assetId} className="size-full" />
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const hintOptionClass = tv({
  base: `gap-1 rounded-lg border-2 p-3`,
  variants: {
    isSelected: {
      true: `border-cyan bg-cyan/10`,
      false: `border-fg-bg10 bg-fg-bg5`,
    },
  },
});
