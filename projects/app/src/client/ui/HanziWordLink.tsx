import type { HanziWord } from "@/data/model";
import { hanziFromHanziWord } from "@/dictionary/dictionary";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { Text } from "react-native";
import { WikiHanziModal } from "./WikiHanziModal";

export const HanziWordLink = ({
  hanziWord,
  children,
}: PropsWithChildren<{
  hanziWord: HanziWord;
}>) => {
  const [showWiki, setShowWiki] = useState(false);
  const hanzi = hanziFromHanziWord(hanziWord);

  return (
    <>
      <Text
        className="pyly-ref"
        onPress={() => {
          setShowWiki(true);
        }}
      >
        {children}
      </Text>
      {showWiki ? (
        <WikiHanziModal
          hanzi={hanzi}
          onDismiss={() => {
            setShowWiki(false);
          }}
        />
      ) : null}
    </>
  );
};
