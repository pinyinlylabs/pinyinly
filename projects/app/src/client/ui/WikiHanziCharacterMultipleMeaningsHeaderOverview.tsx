import { HeaderProvider } from "@/client/ui/HeaderProvider";
import { use } from "react";
import type {
  HanziCharacter,
  HanziWord,
  Skill,
  SrsStateType,
} from "@/data/model";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { View } from "@/client/ui/View";
import { ComponentLozenge } from "./ComponentLozenge";
import { Text } from "./Text";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./hooks/useDb";
import { WikiHanziMeaningsPanel } from "./WikiHanziMeaningsPanel";
import { WikiHanziBookmarkMenu } from "./WikiHanziBookmarkMenu";
import { HanziStrokesAnimatedTile } from "./HanziStrokesAnimatedTile";
import { WikiPageEditModeContext } from "./WikiPageEditModeContext";

export function WikiHanziCharacterMultipleMeaningsHeaderOverview({
  hanzi,
  hanziWord,
  skillSrsStates,
  onModalDismiss,
  ...rest
}: {
  hanzi: HanziCharacter;
  hanziWord: HanziWord | null;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
  onModalDismiss?: () => void;
}) {
  true satisfies IsExhaustedRest<typeof rest>;

  const db = useDb();
  const wikiPageEditMode = use(WikiPageEditModeContext);

  const { data: characterData } = useLiveQuery({
    query: (q) =>
      q
        .from({ character: db.characterCollection })
        .where(({ character }) => eq(character.hanzi, hanzi))
        .findOne(),
  });
  return (
    <View className="gap-3 pl-4">
      <View className="flex-row items-center gap-1">
        <View className="flex-1 flex-row items-center gap-1">
          {characterData?.isComponent ? (
            <ComponentLozenge isStructural={characterData.isStructural} />
          ) : null}
        </View>
      </View>
      <View>
        <HeaderProvider.ScrollTrigger title={hanzi} />
        <View className="flex-row items-center gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-3">
            <Text className="font-sans text-[48px] font-semibold text-fg-loud">
              {hanzi}
            </Text>
            <HanziStrokesAnimatedTile hanzi={hanzi} autoPlay hideFgWhenIdle />
          </View>
          <HeaderProvider.ActionsPortal>
            <WikiHanziBookmarkMenu
              hanziWord={hanziWord}
              hanzi={hanzi}
              onModalDismiss={onModalDismiss}
              wikiPageEditMode={wikiPageEditMode}
            />
          </HeaderProvider.ActionsPortal>
        </View>
      </View>
      <View className="mb-3">
        <WikiHanziMeaningsPanel hanzi={hanzi} skillSrsStates={skillSrsStates} />
      </View>
    </View>
  );
}
