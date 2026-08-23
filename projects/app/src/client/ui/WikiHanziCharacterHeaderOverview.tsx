import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import type { HanziCharacter } from "@/data/model";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { View } from "@/client/ui/View";
import { StructuralLozenge } from "./StructuralLozenge";
import { Lozenge } from "./Lozenge";
import { Text } from "./Text";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./hooks/useDb";
import { deepDecomposeHanziWithStrokeSpecs } from "@/dictionary";
import { intersperse } from "@/client/react";
import { arrayFilterUnique } from "@pinyinly/lib/collections";

export function WikiHanziCharacterHeaderOverview({
  hanzi,
  ...rest
}: {
  hanzi: HanziCharacter;
}) {
  true satisfies IsExhaustedRest<typeof rest>;

  const db = useDb();

  const { data: decompositionEntries } = useLiveQuery(
    (q) => q.from({ decomposition: db.characterDecompositionsCollection }),
    [db.characterDecompositionsCollection],
  );

  const { data: characterData } = useLiveQuery(
    (q) =>
      q
        .from({ character: db.characterCollection })
        .where(({ character }) => eq(character.hanzi, hanzi))
        .findOne(),
    [db.characterCollection, hanzi],
  );

  const { data: characterComponentFormsData } = useLiveQuery(
    (q) =>
      q
        .from({ character: db.characterCollection })
        .where(({ character }) => eq(character.componentFormOf, hanzi)),
    [db.characterCollection, hanzi],
  );

  const decompositionItems = deepDecomposeHanziWithStrokeSpecs(
    hanzi,
    decompositionEntries,
  ).filter(arrayFilterUnique((x) => x.hanzi));

  return (
    <View className="gap-[10px]">
      <View className="flex-row items-center gap-1">
        <View className="flex-1 flex-row gap-1">
          {characterData?.isStructural ? <StructuralLozenge /> : null}
        </View>
      </View>
      <View>
        <HeaderTitleProvider.ScrollTrigger title={hanzi} />
        <Text className="font-sans text-[48px] font-semibold text-fg-loud">
          {hanzi}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Text className="text-xs text-muted-fg">
          {characterData == null
            ? ` `
            : characterData.strokes === 1
              ? `${characterData.strokes} stroke`
              : `${characterData.strokes} strokes`}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Lozenge color="muted-fg">Components</Lozenge>
        <Text className="text-xs text-muted-fg">
          {intersperse(
            decompositionItems.map((x) => x.hanzi),
            <> </>,
          )}
        </Text>
      </View>
      {characterComponentFormsData.length === 0 ? null : (
        <View className="flex-row items-center gap-3">
          <Lozenge color="muted-fg">Component forms</Lozenge>
          <Text className="text-xs text-muted-fg">
            {intersperse(
              characterComponentFormsData.map((x) => x.hanzi),
              <> </>,
            )}
          </Text>
        </View>
      )}
    </View>
  );
}
