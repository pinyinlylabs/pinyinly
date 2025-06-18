import { parseHhhmark } from "@/data/hhhmark";
import { useMemo } from "react";
import { Text } from "react-native";
import { tv } from "tailwind-variants";
import { HanziWordRefText } from "./HanziWordRefText";

export type HhhmarkContext = `body-2xl` | `body` | `caption`;

export const hhhText = tv({
  variants: {
    context: {
      [`body-2xl`]: `hhh-body-2xl`,
      [`body`]: `hhh-body`,
      [`caption`]: `hhh-body-caption`,
    },
  },
});

export const hhhTextBold = tv({
  variants: {
    context: {
      [`body-2xl`]: `hhh-body-2xl-bold`,
      [`body`]: `hhh-body-bold`,
      [`caption`]: `hhh-body-caption-bold`,
    },
  },
});

export const hhhTextItalic = tv({
  variants: {
    context: {
      [`body-2xl`]: `hhh-body-2xl-italic`,
      [`body`]: `hhh-body-italic`,
      [`caption`]: `hhh-body-caption-italic`,
    },
  },
});

export const Hhhmark = ({
  source,
  context,
}: {
  source: string;
  context: HhhmarkContext;
}) => {
  const rendered = useMemo(() => {
    const parsed = parseHhhmark(source);
    return (
      <Text className="hhh-hhhmark">
        {parsed.map((node, index) => {
          switch (node.type) {
            case `text`: {
              return (
                <Text key={`text-${index}`} className={hhhText({ context })}>
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
                  showGloss={node.showGloss}
                />
              );
            }
            case `bold`: {
              return (
                <Text
                  key={`bold-${index}`}
                  className={hhhTextBold({ context })}
                >
                  {node.text}
                </Text>
              );
            }
            case `italic`: {
              return (
                <Text
                  key={`italic-${index}`}
                  className={hhhTextItalic({ context })}
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
