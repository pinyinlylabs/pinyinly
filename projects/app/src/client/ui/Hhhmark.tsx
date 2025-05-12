import { parseHhhmark } from "@/data/hhhmark";
import { useMemo } from "react";
import { Text } from "react-native";
import { HanziWordRefText } from "./HanziWordRefText";

export const Hhhmark = ({
  source,
  context,
}: {
  source: string;
  context: `body` | `caption`;
}) => {
  const rendered = useMemo(() => {
    const parsed = parseHhhmark(source);
    return (
      <Text className="hhh-hhhmark">
        {parsed.map((node, index) => {
          switch (node.type) {
            case `text`: {
              return (
                <Text
                  key={`text-${index}`}
                  className={
                    context === `body` ? `hhh-text-body` : `hhh-text-caption`
                  }
                >
                  {node.text}
                </Text>
              );
            }
            case `hanziWord`: {
              return (
                <HanziWordRefText
                  key={`hanziWord-${index}`}
                  context={context}
                  hanziWord={node.hanziWord}
                />
              );
            }
            case `bold`: {
              return (
                <Text
                  key={`bold-${index}`}
                  className={
                    context === `body`
                      ? `hhh-text-body-bold`
                      : `hhh-text-caption-bold`
                  }
                >
                  {node.text}
                </Text>
              );
            }
            case `italic`: {
              return (
                <Text
                  key={`italic-${index}`}
                  className={
                    context === `body`
                      ? `hhh-text-body-italic`
                      : `hhh-text-caption-italic`
                  }
                >
                  {node.text}
                </Text>
              );
            }
          }
        })}
      </Text>
    );
  }, [context, source]);

  return rendered;
};
