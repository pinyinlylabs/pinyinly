import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import type { FloatingMenuModalMenuProps } from "@/client/ui/FloatingMenuModal";
import { RectButton } from "@/client/ui/RectButton";
import { ExampleStack } from "@/client/ui/demo/components";
import { View } from "react-native";

function DemoMenu({ onRequestClose }: FloatingMenuModalMenuProps) {
  return (
    <View className="items-start rounded-xl bg-bg-high p-2">
      <RectButton variant="bare2" onPress={onRequestClose}>
        Item one
      </RectButton>
      <RectButton variant="bare2" onPress={onRequestClose}>
        Item two
      </RectButton>
    </View>
  );
}

export default () => (
  <View className="p-4">
    <ExampleStack
      title="Two items (both linked)"
      childrenClassName="items-start"
    >
      <Breadcrumbs>
        <Breadcrumbs.Item href="/wiki">Wiki</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/bookmarks">Bookmarks</Breadcrumbs.Item>
      </Breadcrumbs>
    </ExampleStack>

    <ExampleStack
      title="Three items (last unlinked = current page)"
      childrenClassName="items-start"
    >
      <Breadcrumbs>
        <Breadcrumbs.Item href="/wiki">Wiki</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/sounds">Sounds</Breadcrumbs.Item>
        <Breadcrumbs.Item>zh</Breadcrumbs.Item>
      </Breadcrumbs>
    </ExampleStack>

    <ExampleStack title="Menu item" childrenClassName="items-start">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/sounds">Sounds</Breadcrumbs.Item>
        <Breadcrumbs.Item menu={<DemoMenu />}>Current sound</Breadcrumbs.Item>
      </Breadcrumbs>
    </ExampleStack>
  </View>
);
