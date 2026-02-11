import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { AssetImage } from "./AssetImage";
import { IconImage } from "./IconImage";
import { Pylymark } from "./Pylymark";

interface HanziHintOptionProps {
  hint: string;
  explanation?: string;
  imageIds: readonly string[] | null;
  isSelected: boolean;
  isUser?: boolean;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  footer?: ReactNode;
}

export function HanziHintOption({
  hint,
  explanation,
  imageIds,
  isSelected,
  isUser,
  onPress,
  onEdit,
  onDelete,
  footer,
}: HanziHintOptionProps) {
  const shouldShowImages = imageIds != null && imageIds.length > 0;

  return (
    <Pressable onPress={onPress}>
      <View className={hintOptionClass({ isSelected })}>
        {isUser === true ? (
          <View className="mb-1 flex-row items-center gap-2">
            <View className="rounded-full bg-purple/20 px-2 py-0.5">
              <Text className="text-[11px] font-medium text-purple">
                Your hint
              </Text>
            </View>
            <View className="flex-1" />
            {onEdit != null && (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
                hitSlop={8}
              >
                <IconImage size={16} icon="puzzle" className="text-fg-dim" />
              </Pressable>
            )}
            {onDelete != null && (
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                hitSlop={8}
              >
                <IconImage size={16} icon="close" className="text-fg-dim" />
              </Pressable>
            )}
          </View>
        ) : null}
        <Text className="text-[14px] font-semibold text-fg-loud">
          <Pylymark source={hint} />
        </Text>
        {explanation != null && (
          <Text className="text-[14px] text-fg">
            <Pylymark source={explanation} />
          </Text>
        )}
        {shouldShowImages ? <HintThumbnailRow imageIds={imageIds} /> : null}
        {footer}
      </View>
    </Pressable>
  );
}

function HintThumbnailRow({ imageIds }: { imageIds: readonly string[] }) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {imageIds.slice(0, 3).map((assetId) => (
        <View key={assetId} className="relative">
          <View className="size-14 overflow-hidden rounded-md border border-fg/10">
            <AssetImage assetId={assetId} className="size-full" />
          </View>
        </View>
      ))}
    </View>
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
