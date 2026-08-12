import { ButtonGroup } from "@/client/ui/ButtonGroup";
import { ExampleStack } from "@/client/ui/demo/components";
import { View } from "react-native";

export default () => (
  <View className="flex-1">
    <ExampleStack title="default" childrenClassName="items-start">
      <ButtonGroup>
        <ButtonGroup.Button onPress={() => {}}>Text</ButtonGroup.Button>
        <ButtonGroup.Button
          onPress={() => {}}
          iconStart="chevron-down"
          iconSize={16}
        ></ButtonGroup.Button>
      </ButtonGroup>

      <ButtonGroup defaultButtonVariant="barePrimary">
        <ButtonGroup.Button onPress={() => {}} iconStart="ai">
          Text
        </ButtonGroup.Button>
        <ButtonGroup.Button
          onPress={() => {}}
          iconStart="chevron-down"
          iconSize={16}
        ></ButtonGroup.Button>
      </ButtonGroup>
    </ExampleStack>
  </View>
);
