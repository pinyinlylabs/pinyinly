import { ExampleStack, LittlePrimaryHeader } from "@/client/ui/demo/components";
import { MenuContext } from "@/client/ui/MenuContext";
import { ScrollView, Text, View } from "react-native";

export default function MenuContextDemo() {
  return (
    <View className="flex-1 gap-4">
      <LittlePrimaryHeader title="MenuContext Title Scroll Trigger" />

      <View className="flex-row flex-wrap">
        <ExampleStack title="Large sections" showFrame>
          <MenuContextScrollDemo
            sections={[
              {
                title: `Character`,
                summary: `Top-level character overview and decomposition.`,
              },
              {
                title: `Pronunciation`,
                summary: `Pinyin hints, tone clues, and sound associations.`,
              },
              {
                title: `Usage`,
                summary: `Example words and sentence-style context.`,
              },
              {
                title: `Memory Story`,
                summary: `Mnemonic imagery and personal memory hooks.`,
              },
            ]}
          />
        </ExampleStack>

        <ExampleStack title="Dense trigger changes" showFrame>
          <MenuContextScrollDemo
            sections={[
              {
                title: `Overview`,
                summary: `Fast section transitions for trigger precedence testing.`,
              },
              {
                title: `Radicals`,
                summary: `Components and positional clues in compact form.`,
              },
              {
                title: `Examples`,
                summary: `Short usage snippets with quick title switching.`,
              },
              {
                title: `Review`,
                summary: `Checklist recap with rapid trigger updates.`,
              },
            ]}
            compact
          />
        </ExampleStack>
      </View>
    </View>
  );
}

function MenuContextScrollDemo({
  sections,
  compact = false,
}: {
  sections: readonly { title: string; summary: string }[];
  compact?: boolean;
}) {
  return (
    <View className="h-[560px] w-[420px] overflow-hidden rounded-lg border border-fg/10 bg-bg">
      <MenuContext>
        <View
          className={`
            sticky top-0 z-10 h-[52px] flex-row items-center border-b border-fg/10 bg-bg/95 px-4
          `}
        >
          <Text className="pyly-body text-fg-dim">Floating title:</Text>
          <View className="w-2" />
          <View className="flex-1">
            <MenuContext.TitleText className="pyly-body-heading text-fg-loud" />
          </View>
        </View>

        <ScrollView contentContainerClassName="gap-6 p-4 pb-10">
          <View className="rounded-lg border border-fg/10 bg-fg/5 p-3">
            <Text className="pyly-body-dt text-fg-dim">
              Scroll to see the header title switch to the most recently
              scrolled-off trigger.
            </Text>
          </View>

          {sections.map((section) => (
            <View key={section.title} className="gap-3">
              <Text className="pyly-body-heading">{section.title}</Text>
              <MenuContext.TitleScrollTrigger title={section.title} />

              <Text className="pyly-body text-fg-dim">{section.summary}</Text>

              <View
                className={
                  compact
                    ? `h-[120px] rounded-lg border border-fg/10 bg-fg/5`
                    : `h-[220px] rounded-lg border border-fg/10 bg-fg/5`
                }
              />
            </View>
          ))}
        </ScrollView>
      </MenuContext>
    </View>
  );
}
