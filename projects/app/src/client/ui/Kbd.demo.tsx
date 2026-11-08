import { Kbd } from "./Kbd";
import { Text } from "./Text";
import { View } from "./View";

export default () => (
  <View className="gap-3">
    <View className="flex-row items-center gap-2">
      <Text className="w-24 pyly-body-caption">Single key</Text>
      <Kbd>Esc</Kbd>
    </View>
    <View className="flex-row items-center gap-1">
      <Text className="w-24 pyly-body-caption">Shortcut</Text>
      <Kbd>⌘</Kbd>
      <Kbd>\</Kbd>
    </View>
    <View className="flex-row items-center gap-1">
      <Text className="w-24 pyly-body-caption">Multi-key</Text>
      <Kbd>Ctrl</Kbd>
      <Kbd>Shift</Kbd>
      <Kbd>P</Kbd>
    </View>
  </View>
);
