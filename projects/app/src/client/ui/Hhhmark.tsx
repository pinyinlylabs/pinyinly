import { parseHhhmark } from "@/data/hhhmark";
import { useMemo } from "react";
import { Text } from "react-native";

export const Hhhmark = ({ source }: { source: string }) => {
  const rendered = useMemo(() => {
    const parsed = parseHhhmark(source);
    return (
      <Text>
        {parsed.map((node, index) => {
          switch (node.type) {
            case `text`: {
              return <Text key={`text-${index}`}>{node.text}</Text>;
            }
            case `hanziWord`: {
              return (
                <Text
                  key={`hanziWord-${index}`}
                  className="rounded bg-accent-10 px-1 font-medium tracking-tighter text-primary-4"
                >
                  {node.hanziWord}
                </Text>
              );
            }
            case `bold`: {
              return (
                <Text
                  key={`bold-${index}`}
                  className="rounded bg-accent-10 px-1 font-medium tracking-tighter text-primary-4"
                >
                  {node.text}
                </Text>
              );
            }
            case `italic`: {
              return (
                <Text
                  key={`italic-${index}`}
                  className="font-medium text-accent-10"
                >
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
