import { useMemo } from "react";
import { Text } from "react-native";

export const Hhhmark = ({ source }: { source: string }) => {
  const rendered = useMemo(() => {
    const result = source.replaceAll(`'`, `’`).replaceAll(/"([^"]*)"/g, `“$1”`);

    // Handle bold text by replacing **text** with <Text className="font-bold">text</Text>
    const boldHandled = result.split(/\*\*(.*?)\*\*/g).map((part, index) =>
      index % 2 === 1 ? (
        <Text
          key={`bold-${index}`}
          className="rounded bg-accent-10 px-1 font-medium tracking-tighter text-primary-4"
        >
          {part}
        </Text>
      ) : (
        part
      ),
    );

    const italicHandled = boldHandled.map((part, index) =>
      typeof part === `string`
        ? part.split(/\*(.*?)\*/g).map((subPart, subIndex) => {
            return subIndex % 2 === 1 ? (
              <Text
                key={`medium-${index}-${subIndex}`}
                className="font-medium text-accent-10"
              >
                {subPart}
              </Text>
            ) : (
              subPart
            );
          })
        : part,
    );

    return italicHandled;
  }, [source]);

  return <Text>{rendered}</Text>;
};
