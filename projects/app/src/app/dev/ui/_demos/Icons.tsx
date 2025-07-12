import { ExampleStack } from "@/app/dev/ui/_helpers";
import { IconImage } from "@/client/ui/IconImage";
import { View } from "react-native";

export default () => {
  const icons = ([12, 24, 32] as const).map((size, i) => (
    <View key={i} className="max-w-[200px] flex-row flex-wrap">
      {allIcons.map((source, i) => (
        <IconImage key={i} size={size} source={source} />
      ))}
    </View>
  ));
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="default" childrenClassName="gap-8">
        {icons}
      </ExampleStack>

      <ExampleStack title="success" childrenClassName="gap-8 theme-success">
        {icons}
      </ExampleStack>

      <ExampleStack title="danger" childrenClassName="gap-8 theme-danger">
        {icons}
      </ExampleStack>
    </View>
  );
};

const allIcons = [
  // <pyly-glob-template dir="../../../../assets/icons" glob="*.svg" template="  require(`${path}`),">
  require(`../../../../assets/icons/alarm-filled.svg`),
  require(`../../../../assets/icons/alarm.svg`),
  require(`../../../../assets/icons/arrow-down.svg`),
  require(`../../../../assets/icons/arrow-return-left.svg`),
  require(`../../../../assets/icons/arrow-right.svg`),
  require(`../../../../assets/icons/arrow-up.svg`),
  require(`../../../../assets/icons/badge-filled.svg`),
  require(`../../../../assets/icons/badge.svg`),
  require(`../../../../assets/icons/book.svg`),
  require(`../../../../assets/icons/bookmark-filled.svg`),
  require(`../../../../assets/icons/bookmark.svg`),
  require(`../../../../assets/icons/cart.svg`),
  require(`../../../../assets/icons/check-circled-filled.svg`),
  require(`../../../../assets/icons/check.svg`),
  require(`../../../../assets/icons/chevron-backward-filled.svg`),
  require(`../../../../assets/icons/chevron-down-filled.svg`),
  require(`../../../../assets/icons/chevron-forward-filled.svg`),
  require(`../../../../assets/icons/chevron-up-filled.svg`),
  require(`../../../../assets/icons/close-circled-filled.svg`),
  require(`../../../../assets/icons/close.svg`),
  require(`../../../../assets/icons/document.svg`),
  require(`../../../../assets/icons/flag-1.svg`),
  require(`../../../../assets/icons/flag.svg`),
  require(`../../../../assets/icons/flame-filled.svg`),
  require(`../../../../assets/icons/flame.svg`),
  require(`../../../../assets/icons/frown-circled.svg`),
  require(`../../../../assets/icons/help-circled.svg`),
  require(`../../../../assets/icons/home-filled.svg`),
  require(`../../../../assets/icons/home.svg`),
  require(`../../../../assets/icons/inbox-filled.svg`),
  require(`../../../../assets/icons/keyboard.svg`),
  require(`../../../../assets/icons/loader.svg`),
  require(`../../../../assets/icons/lock-filled.svg`),
  require(`../../../../assets/icons/medal.svg`),
  require(`../../../../assets/icons/menu.svg`),
  require(`../../../../assets/icons/message-bubble-filled.svg`),
  require(`../../../../assets/icons/plant-filled.svg`),
  require(`../../../../assets/icons/profile-filled.svg`),
  require(`../../../../assets/icons/profile.svg`),
  require(`../../../../assets/icons/redo.svg`),
  require(`../../../../assets/icons/repeat.svg`),
  require(`../../../../assets/icons/ruler.svg`),
  require(`../../../../assets/icons/search.svg`),
  require(`../../../../assets/icons/settings-filled.svg`),
  require(`../../../../assets/icons/settings.svg`),
  require(`../../../../assets/icons/show.svg`),
  require(`../../../../assets/icons/star-filled.svg`),
  require(`../../../../assets/icons/star.svg`),
  require(`../../../../assets/icons/time-circled.svg`),
  require(`../../../../assets/icons/trending-down.svg`),
  require(`../../../../assets/icons/trending-up.svg`),
  require(`../../../../assets/icons/undo.svg`),
  require(`../../../../assets/icons/zap-filled.svg`),
  // </pyly-glob-template>
];
