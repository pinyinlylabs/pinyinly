import { useIsBetaEnabled } from "@/client/hooks/useBetaFeatures";
import { walkIdsNodeLeafs } from "@/data/hanzi";
import type { HanziText, HanziWord, WikiCharacterData } from "@/data/model";
import type { HanziWordMeaning } from "@/dictionary";
import {
  hanziFromHanziWord,
  loadDictionary,
  meaningKeyFromHanziWord,
} from "@/dictionary";
import { parseIndexRanges } from "@/util/indexRanges";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { use } from "react";
import { Text, View } from "react-native";
import { AssetImage } from "./AssetImage";
import { HanziCharacter, hanziCharacterColorSchema } from "./HanziCharacter";
import { HanziLink } from "./HanziLink";
import { useSelectedHint } from "./HanziWordHintProvider";
import { IconImage } from "./IconImage";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";

interface WikiHanziCharacterDecompositionProps {
  characterData: WikiCharacterData;
  illustrationAssetId?: string;
}

export function WikiHanziCharacterDecomposition({
  characterData,
  illustrationAssetId,
}: WikiHanziCharacterDecompositionProps) {
  const componentsElements: ReactNode[] = [];
  const dictionary = use(loadDictionary());

  if (characterData.mnemonic && Array.isArray(characterData.strokes)) {
    for (const [i, visualComponent] of [
      ...walkIdsNodeLeafs(characterData.mnemonic.components),
    ].entries()) {
      const label =
        visualComponent.label ??
        (visualComponent.hanzi == null
          ? null
          : dictionary
              .lookupHanzi(visualComponent.hanzi)
              .map(([, meaning]) => meaning.gloss[0])
              .join(` / `));
      componentsElements.push(
        <View className="flex-1 items-center gap-2" key={i}>
          <View className="flex-row items-center gap-2">
            <HanziCharacter
              className="size-12"
              highlightColor={hanziCharacterColorSafeSchema.parse(
                visualComponent.color,
              )}
              strokesData={characterData.strokes}
              highlightStrokes={parseIndexRanges(visualComponent.strokes)}
            />
          </View>
          <Text className="pyly-body text-center">
            {visualComponent.hanzi == null ? (
              label
            ) : (
              <HanziLink hanzi={visualComponent.hanzi}>
                {visualComponent.hanzi} {label}
              </HanziLink>
            )}
          </Text>
        </View>,
      );
    }
  }

  return (
    <View className="mx-4 gap-2">
      <Text className="pyly-body-subheading">Recognize the character</Text>
      <View className="rounded-lg bg-fg-bg5">
        <View className="gap-4 p-4 pb-0">
          {componentsElements.length > 0 ? (
            <>
              <Text className="pyly-body">
                Use the components of{` `}
                <Text className="pyly-bold">{characterData.hanzi}</Text> to
                help:
              </Text>

              <View className="flex-row gap-5">{componentsElements}</View>
            </>
          ) : Array.isArray(characterData.strokes) ? (
            <>
              <Text className="pyly-body">
                What does{` `}
                <Text className="pyly-bold">{characterData.hanzi}</Text>
                {` `}
                resemble?
              </Text>

              <View className="flex-1 items-center">
                <HanziCharacter
                  className="size-12"
                  strokesData={characterData.strokes}
                  highlightStrokes={parseIndexRanges(
                    `0-${characterData.strokes.length - 1}`,
                  )}
                />
              </View>
            </>
          ) : null}
        </View>

        {illustrationAssetId == null ? (
          <View className="h-4" />
        ) : (
          <View className="my-4 h-[200px] w-full overflow-hidden">
            <AssetImage assetId={illustrationAssetId} className="size-full" />
          </View>
        )}

        <MeaningsSection
          hanzi={characterData.hanzi}
          mnemonicHints={characterData.mnemonic?.hints}
        />
      </View>
    </View>
  );
}

function MeaningsSection({
  hanzi,
  mnemonicHints,
}: {
  hanzi: string;
  mnemonicHints:
    | readonly { readonly meaningKey: string; readonly hint: string }[]
    | undefined;
}) {
  const isBetaEnabled = useIsBetaEnabled();
  const dictionary = use(loadDictionary());
  const hanziWordMeanings = dictionary.lookupHanzi(hanzi as HanziText);

  // If hanzi is not in dictionary or beta is not enabled, don't show this section
  if (!isBetaEnabled || hanziWordMeanings.length === 0) {
    return null;
  }

  const meaningsCount = hanziWordMeanings.length;

  return (
    <View className="gap-4 p-4">
      <Text className="pyly-body">
        <Text className="pyly-bold">{hanzi}</Text>
        {` `}({meaningsCount} {meaningsCount === 1 ? `meaning` : `meanings`})
      </Text>

      <View className="gap-3">
        {hanziWordMeanings.map(([hanziWord, meaning]) => {
          const meaningKey = meaningKeyFromHanziWord(hanziWord);
          // Match mnemonic hint by meaningKey
          const matchedHint = mnemonicHints?.find(
            (h) => h.meaningKey === meaningKey,
          );
          return (
            <MeaningItem
              key={hanziWord}
              hanziWord={hanziWord}
              meaning={meaning}
              mnemonicHint={matchedHint?.hint}
            />
          );
        })}
      </View>
    </View>
  );
}

function MeaningItem({
  hanziWord,
  meaning,
  mnemonicHint,
}: {
  hanziWord: HanziWord;
  meaning: HanziWordMeaning;
  mnemonicHint: string | undefined;
}) {
  const meaningKey = meaningKeyFromHanziWord(hanziWord);
  const hanzi = hanziFromHanziWord(hanziWord);

  // Get custom hint if set
  const customHint = useSelectedHint(hanziWord);
  const displayHint = customHint ?? mnemonicHint;
  const hasCustomHint = customHint != null;
  const hasHint = displayHint != null;

  // Display glosses: first one bold, rest dim and semicolon-separated
  const primaryGloss = meaning.gloss[0];
  const secondaryGlosses = meaning.gloss.slice(1);

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <View
          className={`
            m-1 size-3 rounded-full border-2

            ${hasCustomHint ? `border-cyan bg-cyan` : `border-fg-bg25`}
          `}
        />
        <Text className="pyly-body flex-1">
          <Text className="pyly-bold">{primaryGloss}</Text>
          {secondaryGlosses.length > 0 ? (
            <Text className="text-fg-dim">; {secondaryGlosses.join(`; `)}</Text>
          ) : null}
        </Text>
        {hasHint ? (
          <Link
            href={`/wiki/${encodeURIComponent(hanzi)}/edit/${encodeURIComponent(meaningKey)}`}
            asChild
          >
            <RectButton variant="bare" textClassName="text-sm text-cyan">
              {hasCustomHint ? `Edit` : `Customize`}
            </RectButton>
          </Link>
        ) : null}
      </View>
      {hasHint ? (
        <View className="pl-7">
          <Text className="pyly-body">
            <Pylymark source={displayHint} />
          </Text>
        </View>
      ) : (
        <View className="pl-7">
          <NoHintPlaceholder hanziWord={hanziWord} />
        </View>
      )}
    </View>
  );
}

function NoHintPlaceholder({ hanziWord }: { hanziWord: HanziWord }) {
  const meaningKey = meaningKeyFromHanziWord(hanziWord);
  const hanzi = hanziFromHanziWord(hanziWord);

  return (
    <Link
      href={`/wiki/${encodeURIComponent(hanzi)}/edit/${encodeURIComponent(meaningKey)}`}
      asChild
    >
      <RectButton variant="bare">
        <View
          className={`items-center gap-1 rounded-xl border-2 border-dashed border-fg/20 px-4 py-5`}
        >
          <IconImage size={32} icon="puzzle" className="text-fg-dim" />
          <View className="items-center">
            <Text className="font-sans text-base font-bold text-fg-dim">
              No hint
            </Text>
            <Text className="pyly-body-caption opacity-80">
              Create a hint here
            </Text>
          </View>
        </View>
      </RectButton>
    </Link>
  );
}

// oxlint-disable-next-line unicorn/prefer-top-level-await
const hanziCharacterColorSafeSchema = hanziCharacterColorSchema.catch(`fg`);
