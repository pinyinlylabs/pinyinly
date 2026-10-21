import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import type { HanziCharacter, HanziWord } from "@/data/model";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { View } from "@/client/ui/View";
import { StructuralLozenge } from "./StructuralLozenge";
import { Text } from "./Text";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./hooks/useDb";
import { WikiHanziMeaningsPanel } from "./WikiHanziMeaningsPanel";
import { WikiHanziProgressLozenge } from "./WikiHanziProgressLozenge";
import { WikiHanziBookmarkMenu } from "./WikiHanziBookmarkMenu";
import { WikiHanziBookmarkLozenge } from "./WikiHanziBookmarkLozenge";
import { WikiHanziHskLozenges } from "./WikiHanziHskLozenges";

export function WikiHanziCharacterMultipleMeaningsHeaderOverview({
  hanzi,
  hanziWord,
  ...rest
}: {
  hanzi: HanziCharacter;
  hanziWord: HanziWord | null;
}) {
  true satisfies IsExhaustedRest<typeof rest>;

  const db = useDb();

  const { data: characterData } = useLiveQuery(
    (q) =>
      q
        .from({ character: db.characterCollection })
        .where(({ character }) => eq(character.hanzi, hanzi))
        .findOne(),
    [db.characterCollection, hanzi],
  );
  return (
    <View className="gap-3 pl-4">
      <View className="flex-row items-center gap-1">
        <View className="flex-1 flex-row items-center gap-1">
          <WikiHanziBookmarkLozenge hanziWord={hanziWord} />
          <WikiHanziHskLozenges hanzi={hanzi} />
          <WikiHanziProgressLozenge hanzi={hanzi} hanziWord={hanziWord} />
          {characterData?.isStructural ? <StructuralLozenge /> : null}
        </View>
        <WikiHanziBookmarkMenu hanziWord={hanziWord} />
      </View>
      <View>
        <HeaderTitleProvider.ScrollTrigger title={hanzi} />
        <Text className="font-sans text-[48px] font-semibold text-fg-loud">
          {hanzi}
        </Text>
      </View>
      <View className="mb-3">
        <WikiHanziMeaningsPanel hanzi={hanzi} />
      </View>
    </View>
  );
}
