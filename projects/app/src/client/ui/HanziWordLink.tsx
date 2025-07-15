import type { HanziWord } from "@/data/model";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { Text } from "react-native";
import { WikiHanziWordModal } from "./WikiHanziWordModal";

export const HanziWordLink = ({
  hanziWord,
  children,
}: PropsWithChildren<{
  hanziWord: HanziWord;
}>) => {
  const [showWiki, setShowWiki] = useState(false);

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
