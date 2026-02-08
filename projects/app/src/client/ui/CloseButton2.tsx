import { Pressable } from "react-native";
import { IconImage } from "./IconImage";

export function CloseButton2({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`
        size-8 rounded-md transition-transform

        hover:bg-fg-loud/10

        active:scale-95
      `}
    >
      <IconImage icon="close" size={32} className="text-fg-loud" />
    </Pressable>
  );
}
