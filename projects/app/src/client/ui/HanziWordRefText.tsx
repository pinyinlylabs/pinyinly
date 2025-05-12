import { useHanziWordMeaning } from "@/client/hooks/useHanziWordMeaning";
import type { HanziWord } from "@/data/model";
import { glossOrThrow, hanziFromHanziWord } from "@/dictionary/dictionary";
import { lazy, useState } from "react";
import { Text } from "react-native";

const WikiHanziWordModal = lazy(() => import(`./WikiHanziWordModal`));

export const HanziWordRefText = ({
  hanziWord,
  context,
}: {
  hanziWord: HanziWord;
  context: `body` | `caption`;
}) => {
  const meaning = useHanziWordMeaning(hanziWord);
  const [showWiki, setShowWiki] = useState(false);
  const gloss =
    meaning.data == null || meaning.data.gloss.length === 0
      ? null
      : glossOrThrow(hanziWord, meaning.data);

  return (
    <>
      <Text
        className={
          context === `body` ? `hhh-text-body-ref` : `hhh-text-caption-ref`
        }
        onPress={() => {
          setShowWiki(true);
        }}
      >
        {`${hanziFromHanziWord(hanziWord)}${gloss == null ? `` : ` ${gloss}`}`}
      </Text>
      {showWiki ? (
        <WikiHanziWordModal
          hanziWord={hanziWord}
          onDismiss={() => {
            setShowWiki(false);
          }}
        />
      ) : null}
    </>
  );
};
