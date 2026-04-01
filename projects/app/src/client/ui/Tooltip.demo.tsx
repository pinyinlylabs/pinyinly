import { ExampleStack, LittlePrimaryHeader } from "@/client/ui/demo/components";
import { Icon } from "@/client/ui/Icon";
import { RectButton } from "@/client/ui/RectButton";
import { Tooltip } from "@/client/ui/Tooltip";
import { Text, View } from "react-native";

export default () => (
  <View className="flex-1 gap-4">
    <LittlePrimaryHeader title="Basic" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="Text content" showFrame>
        <Tooltip>
          <Tooltip.Trigger asChild>
            <RectButton variant="outline">Hover me</RectButton>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <Text className="font-sans text-sm text-fg">Save changes</Text>
          </Tooltip.Content>
        </Tooltip>
      </ExampleStack>

      <ExampleStack title="Custom class" showFrame>
        <Tooltip>
          <Tooltip.Trigger asChild>
            <RectButton variant="rounded" iconStart="help-circled" />
          </Tooltip.Trigger>
          <Tooltip.Content className="border-cyanold/40 bg-cyanold/10">
            <Text className="font-sans text-sm font-bold text-fg">
              Helpful hint
            </Text>
          </Tooltip.Content>
        </Tooltip>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="Rich content" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="Image + text" showFrame>
        <Tooltip>
          <Tooltip.Trigger asChild>
            <RectButton variant="filled" iconStart="document">
              Preview
            </RectButton>
          </Tooltip.Trigger>
          <Tooltip.Content className="min-w-[220px] gap-2">
            <View className="flex-row items-center gap-2">
              <View className="size-8 items-center justify-center rounded bg-fg/10">
                <Icon icon="document" />
              </View>
              <View>
                <Text className="font-sans text-sm font-bold text-fg">
                  Draft.pdf
                </Text>
                <Text className="font-sans text-xs text-fg-dim">
                  Updated 2 mins ago
                </Text>
              </View>
            </View>
          </Tooltip.Content>
        </Tooltip>
      </ExampleStack>
    </View>
  </View>
);
