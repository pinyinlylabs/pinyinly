import { HeaderProvider } from "@/client/ui/HeaderProvider";
import type { HanziCharacter, HanziWord } from "@/data/model";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { View } from "@/client/ui/View";
import { ComponentLozenge } from "./ComponentLozenge";
import { Text } from "./Text";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./hooks/useDb";
import { WikiHanziMeaningsPanel } from "./WikiHanziMeaningsPanel";
import { WikiHanziProgressLozenge } from "./WikiHanziProgressLozenge";
import { WikiHanziBookmarkMenu } from "./WikiHanziBookmarkMenu";
import { WikiHanziBookmarkLozenge } from "./WikiHanziBookmarkLozenge";
import { WikiHanziHskLozenges } from "./WikiHanziHskLozenges";
import { WikiHanziSkillLevelBreakdownBox } from "./WikiHanziSkillLevelBreakdown";
import { useSkillSrsStates } from "./hooks/useSkillSrsStates";

export function WikiHanziCharacterMultipleMeaningsHeaderOverview({
  hanzi,
  hanziWord,
  onModalDismiss,
  ...rest
}: {
  hanzi: HanziCharacter;
  hanziWord: HanziWord | null;
  onModalDismiss?: () => void;
}) {
  true satisfies IsExhaustedRest<typeof rest>;

  const db = useDb();
  const skillSrsStates = useSkillSrsStates();

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
          {characterData?.isComponent ? (
            <ComponentLozenge isStructural={characterData.isStructural} />
          ) : null}
          <WikiHanziProgressLozenge
            hanzi={hanzi}
            hanziWord={hanziWord}
            skillSrsStates={skillSrsStates}
          />
        </View>
        <HeaderProvider.ActionsPortal>
          <WikiHanziBookmarkMenu
            hanziWord={hanziWord}
            hanzi={hanzi}
            onModalDismiss={onModalDismiss}
          />
        </HeaderProvider.ActionsPortal>
      </View>
      <View>
        <HeaderProvider.ScrollTrigger title={hanzi} />
        <Text className="font-sans text-[48px] font-semibold text-fg-loud">
          {hanzi}
        </Text>
      </View>
      <View className="mb-3">
        <WikiHanziMeaningsPanel hanzi={hanzi} />
      </View>
      {hanziWord == null ? null : (
        <WikiHanziSkillLevelBreakdownBox
          hanziWord={hanziWord}
          skillSrsStates={skillSrsStates}
        />
      )}
    </View>
  );
}
