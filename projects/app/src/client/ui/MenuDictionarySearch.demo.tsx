import { ExampleStack } from "@/client/ui/demo/components";
import { MenuDictionarySearch } from "@/client/ui/MenuDictionarySearch";
import { View } from "react-native";

export default () => {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="default" showFrame>
        <MenuDictionarySearch />
      </ExampleStack>
    </View>
  );
};
