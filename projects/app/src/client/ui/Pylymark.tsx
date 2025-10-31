import { parsePylymark } from "@/data/pylymark";
import { useMemo } from "react";
import { Text } from "react-native";
import { HanziWordRefText } from "./HanziWordRefText";

export const Pylymark = ({ source }: { source: string }) => {
  const rendered = useMemo(() => {
    const parsed = parsePylymark(source);
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
                  gloss={node.showGloss}
                />
              );
            }
            case `bold`: {
              return (
                <Text key={index} className="pyly-bold">
                  {node.text}
                </Text>
              );
            }
            case `italic`: {
              return (
                <Text key={index} className="pyly-italic">
                  {node.text}
                </Text>
              );
            }
            case `mark`: {
              return (
                <Text key={index} className="pyly-mark">
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
