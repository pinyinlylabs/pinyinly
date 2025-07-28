import type { HanziText } from "@/data/model";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { Text } from "react-native";
import { WikiHanziModal } from "./WikiHanziModal";

export const HanziLink = ({
  hanzi,
  children,
}: PropsWithChildren<{
  hanzi: HanziText;
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
