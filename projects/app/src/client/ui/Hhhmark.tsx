import { parseHhhmark } from "@/data/hhhmark";
import { useMemo } from "react";
import { Text } from "react-native";
import { HanziWordRefText } from "./HanziWordRefText";

export const Hhhmark = ({ source }: { source: string }) => {
  const rendered = useMemo(() => {
    const parsed = parseHhhmark(source);
    return (
      <Text className="tab-size-2 whitespace-pre-wrap">
        {parsed.map((node, index) => {
          switch (node.type) {
            case `text`: {
              return <Text key={index}>{node.text}</Text>;
            }
            case `hanziWord`: {
              return (
                <HanziWordRefText
                  key={index}
                  hanziWord={node.hanziWord}
                  showGloss={node.showGloss}
                />
              );
            }
            case `bold`: {
              return (
                <Text key={index} className="hhh-bold">
                  {node.text}
                </Text>
              );
            }
            case `italic`: {
              return (
                <Text key={index} className="hhh-italic">
                  {node.text}
                </Text>
              );
            }
          }
        })}
      </Text>
    );
  }, [source]);

  return rendered;
};
