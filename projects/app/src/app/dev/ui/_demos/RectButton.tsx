import { ExampleStack, LittlePrimaryHeader } from "@/app/dev/ui/_helpers";
import { RectButton } from "@/client/ui/RectButton";
import type { PropsOf } from "@/client/ui/types";
import { View } from "react-native";

export default () => (
  <View className="flex-1">
    <View className="flex-row flex-wrap">
      <ExampleStack title="normal" childrenClassName="gap-2">
        <RectButtonVariants />
      </ExampleStack>

      <ExampleStack title="normal (disabled)" childrenClassName="gap-2">
        <RectButtonVariants disabled />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="themes" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="normal" childrenClassName="gap-2">
        <RectButtonVariants />
      </ExampleStack>

      <View className="theme-accent">
        <ExampleStack title="accent" childrenClassName="gap-2">
          <RectButtonVariants />
        </ExampleStack>
      </View>

      <View className="theme-success">
        <ExampleStack title="success" childrenClassName="gap-2">
          <RectButtonVariants />
        </ExampleStack>
      </View>

      <View className="theme-danger">
        <ExampleStack title="danger" childrenClassName="gap-2">
          <RectButtonVariants />
        </ExampleStack>
      </View>

      <ExampleStack title="(disabled)" childrenClassName="gap-2">
        <RectButtonVariants disabled />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader
      // eslint-disable-next-line @pinyinly/no-restricted-css-classes
      title="flex-col"
    />

    <View className="flex-row flex-wrap">
      <ExampleStack title="items-start" showFrame>
        <View className="w-[120px] items-start gap-2">
          <RectButtonVariants />
        </View>
      </ExampleStack>

      <ExampleStack title="items-center" showFrame>
        <View className="w-[120px] items-center gap-2">
          <RectButtonVariants />
        </View>
      </ExampleStack>

      <ExampleStack title="items-stretch" showFrame>
        <View className="w-[120px] items-stretch gap-2">
          <RectButtonVariants />
        </View>
      </ExampleStack>

      <ExampleStack title="items-end" showFrame>
        <View className="w-[120px] items-end gap-2">
          <RectButtonVariants />
        </View>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader
      // eslint-disable-next-line @pinyinly/no-restricted-css-classes
      title="flex-col + flex-1"
    />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="w-[120px] items-start gap-2"
      >
        <RectButtonVariants className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="w-[120px] items-center gap-2"
      >
        <RectButtonVariants className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-stretch"
        showFrame
        childrenClassName="w-[120px] items-stretch gap-2"
      >
        <RectButtonVariants className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="w-[120px] items-end gap-2"
      >
        <RectButtonVariants className="flex-1" />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-row" />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="h-[100px] flex-row items-start gap-2"
      >
        <RectButtonVariants inFlexRowParent />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="h-[100px] flex-row items-center gap-2"
      >
        <RectButtonVariants inFlexRowParent />
      </ExampleStack>

      <ExampleStack
        title="items-stretch**"
        showFrame
        childrenClassName="h-[100px] flex-row items-stretch gap-2"
      >
        <RectButtonVariants inFlexRowParent />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="h-[100px] flex-row items-end gap-2"
      >
        <RectButtonVariants inFlexRowParent />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-row + flex-1" />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="h-[100px] flex-row items-start gap-2"
      >
        <RectButtonVariants inFlexRowParent className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="h-[100px] flex-row items-center gap-2"
      >
        <RectButtonVariants inFlexRowParent className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-stretch**"
        showFrame
        childrenClassName="h-[100px] flex-row items-stretch gap-2"
      >
        <RectButtonVariants inFlexRowParent className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="h-[100px] flex-row items-end gap-2"
      >
        <RectButtonVariants inFlexRowParent className="flex-1" />
      </ExampleStack>
    </View>
  </View>
);

const RectButtonVariants = (props: Partial<PropsOf<typeof RectButton>>) => (
  <>
    <RectButton variant="filled" {...props}>
      Filled
    </RectButton>
    <RectButton variant="outline" {...props}>
      Outline
    </RectButton>
    <RectButton variant="option" {...props}>
      Option
    </RectButton>
    <RectButton variant="bare" {...props}>
      Bare
    </RectButton>
  </>
);
