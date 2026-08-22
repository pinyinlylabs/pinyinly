import { isStructuralHanziQuery } from "@/client/query";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import type { HanziCharacter } from "@/data/model";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { useQuery } from "@tanstack/react-query";
import { View } from "@/client/ui/View";
import { StructuralLozenge } from "./StructuralLozenge";
import { Lozenge } from "./Lozenge";
import { Text } from "./Text";

export function WikiHanziCharacterHeaderOverview({
  hanzi,
  ...rest
}: {
  hanzi: HanziCharacter;
}) {
  true satisfies IsExhaustedRest<typeof rest>;

  const { data: isStructuralHanzi } = useQuery(isStructuralHanziQuery);
  const isStructural = isStructuralHanzi?.(hanzi) === true;

  return (
    <View className="gap-[10px]">
      <View className="flex-row items-center gap-1">
        <View className="flex-1 flex-row gap-1">
          {isStructural ? <StructuralLozenge /> : null}
        </View>
      </View>
      <View>
        <HeaderTitleProvider.ScrollTrigger title={hanzi} />
        <Text className="font-sans text-[48px] font-semibold text-fg-loud">
          {hanzi}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Text className="text-xs text-muted-fg">6 strokes</Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Lozenge color="muted-fg">Components</Lozenge>
        <Text className="text-xs text-muted-fg">6</Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Lozenge color="muted-fg">Component form</Lozenge>
        <Text className="text-xs text-muted-fg">6</Text>
      </View>
    </View>
  );
}
