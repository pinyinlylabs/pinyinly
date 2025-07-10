import { parseHhhmark } from "@/data/hhhmark";
import type { JSX } from "react";
import { Fragment, useMemo } from "react";
import { Text } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { HanziWordRefText } from "./HanziWordRefText";

export const HhhmarkTypewriter = ({
  source,
  className,
  delay: _delay = 0,
  onAnimateEnd,
}: {
  source: string;
  className?: string;
  delay?: number;
  onAnimateEnd?: () => void;
}) => {
  const rendered = useMemo(() => {
    const perCharDelay = 60;
    const perCommaDelay = 250;
    const perFullstopDelay = 300;
    const perEllipsisDelay = 500;
    const parsed = parseHhhmark(source);

    let delay = _delay;

    function renderAnimatedText(text: string, isLastNode = false) {
      return text.split(``).map((char, index) => {
        const isLastChar = index === text.length - 1;
        const charDelay = delay;

        // Delay the next character if there is one.
        if (!isLastChar) {
          switch (char) {
            case `,`: {
              delay += perCommaDelay;
              break;
            }
            case `.`: {
              delay += perFullstopDelay;
              break;
            }
            case `…`: {
              delay += perEllipsisDelay;
              break;
            }
            default: {
              delay += perCharDelay;
              break;
            }
          }
        }

        return (
          <EnteringText
            key={index}
            text={char}
            delay={charDelay}
            onAnimateEnd={isLastNode && isLastChar ? onAnimateEnd : undefined}
          />
        );
      });
    }

    return parsed.map((node, index) => {
      const isLastNode = index === parsed.length - 1;
      switch (node.type) {
        case `hanziWord`: {
          return (
            <EnteringText
              key={index}
              delay={(delay += perCharDelay)}
              text={
                <HanziWordRefText
                  key={`hanziWord-${index}`}
                  hanziWord={node.hanziWord}
                  showGloss={node.showGloss}
                />
              }
              onAnimateEnd={isLastNode ? onAnimateEnd : undefined}
            />
          );
        }
        case `text`: {
          return (
            <Fragment key={index}>
              {renderAnimatedText(node.text, isLastNode)}
            </Fragment>
          );
        }
        case `bold`: {
          return (
            <Text key={index} className="hhh-bold">
              {renderAnimatedText(node.text, isLastNode)}
            </Text>
          );
        }
        case `italic`: {
          return (
            <Text key={index} className="hhh-italic">
              {renderAnimatedText(node.text, isLastNode)}
            </Text>
          );
        }
      }
    });
  }, [_delay, onAnimateEnd, source]);

  return <Text className={className}>{rendered}</Text>;
};

const EnteringText = ({
  text,
  delay,
  onAnimateEnd,
}: {
  text: string | JSX.Element;
  delay: number;
  onAnimateEnd?: () => void;
}) => {
  let entering = FadeIn.duration(250).delay(delay);
  if (onAnimateEnd != null) {
    entering = entering.withCallback(onAnimateEnd);
  }
  return <Reanimated.Text entering={entering}>{text}</Reanimated.Text>;
};
