import { Image } from "expo-image";
import { Href, router } from "expo-router";
import { Pressable } from "react-native";

export const CloseButton = ({
  tintColor,
  href,
}: {
  tintColor: string;
  href: Href;
}) => {
  return (
    <Pressable
      onPressIn={() => {
        router.push(href);
      }}
    >
      <Image
        source={require(`@/assets/icons/close.svg`)}
        style={[{ flexShrink: 1, width: 24, height: 24 }]}
        tintColor={tintColor}
      />
    </Pressable>
  );
};
