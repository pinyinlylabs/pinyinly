import { parsePylymark } from "@/data/pylymark";
import { splitGraphemes } from "@/util/unicode";
import type { JSX, ReactElement } from "react";
import { cloneElement } from "react";
import { Text } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { HanziWordRefText } from "./HanziWordRefText";
import type { PropsOf } from "./types";

export const PylymarkTypewriter = ({
  source,
  className,
  delay = 0,
  onAnimateEnd,
}: {
  source: string;
  className?: string;
  /**
   * Allows delaying the presentation of the text while still allowing the
   * necessary space to be reserved (because it's just rendered opacity-0).
   */
  delay?: number;
  onAnimateEnd?: () => void;
}) => {
  const perCharDelay = 40;
  const perHanziWordDelay = perCharDelay * 10;
  const perCommaDelay = 400;
  let perFullstopDelay = 300;
  const perEllipsisDelay = 500;
  const parsed = parsePylymark(source);

  const nodes: ReactElement<
    PropsOf<typeof EnteringText>,
    typeof EnteringText
  >[] = [];

  function pushCharacters(text: string, className?: string) {
    for (const grapheme of splitGraphemes(text)) {
      if (grapheme === `…`) {
        const oldDelay = perFullstopDelay;
        perFullstopDelay = 100;

        pushCharacters(`...`, className);

        perFullstopDelay = oldDelay;
      } else {
        nodes.push(
          <EnteringText
            key={nodes.length}
            text={grapheme}
            delay={delay}
            className={className}
          />,
        );
      }

      switch (grapheme) {
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
  }

  for (const node of parsed) {
    switch (node.type) {
      case `hanziWord`: {
        nodes.push(
          <EnteringText
            key={nodes.length}
            delay={delay}
            text={
              <HanziWordRefText
                hanziWord={node.hanziWord}
                showGloss={node.showGloss}
              />
            }
          />,
        );
        delay += perHanziWordDelay;
        break;
      }
      case `text`: {
        pushCharacters(node.text);
        break;
      }
      case `bold`: {
        pushCharacters(node.text, `pyly-bold`);
        break;
      }
      case `italic`: {
        pushCharacters(node.text, `pyly-italic`);
        break;
      }
      case `highlight`: {
        pushCharacters(node.text, `pyly-highlight`);
        break;
      }
    }
  }

  // Attach `onAnimateEnd` to the last node. Doing it as the last step means it
  // can be ignored in the rest of the algorithm.
  const last = nodes.pop();
  if (last != null && onAnimateEnd != null) {
    const withOnAnimateEndSet = cloneElement(last, { onAnimateEnd });
    nodes.push(withOnAnimateEndSet as typeof last);
  }

  return <Text className={className}>{nodes}</Text>;
};

const EnteringText = ({
  text,
  delay,
  onAnimateEnd,
  className,
}: {
  text: string | JSX.Element;
  delay: number;
  onAnimateEnd?: () => void;
  className?: string;
}) => {
  let entering = FadeIn.duration(250).delay(delay);
  if (onAnimateEnd != null) {
    entering = entering.withCallback(onAnimateEnd);
  }
  return (
    <Reanimated.Text entering={entering} className={className}>
      {text}
    </Reanimated.Text>
  );
};
