import { parsePylymark } from "@/data/pylymark";
import { hanziFromHanziWord, loadDictionary } from "@/dictionary/dictionary";
import { splitGraphemes } from "@/util/unicode";
import { invariant } from "@pinyinly/lib/invariant";
import type { ReactNode } from "react";
import { use } from "react";
import { Text } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { HanziWordLink } from "./HanziWordLink";

interface Clock {
  ms: number;
  delay: Record<string, number | undefined>;
  delayDefault: number;
}

export const PylymarkTypewriter = ({
  source,
  className,
  fastForward = false,
  delay = 150,
  onAnimateEnd,
}: {
  source: string;
  className?: string;
  fastForward?: boolean;
  /**
   * Allows delaying the presentation of the text while still allowing the
   * necessary space to be reserved (because it's just rendered opacity-0).
   */
  delay?: number;
  onAnimateEnd?: () => void;
}) => {
  const dict = use(loadDictionary());
  const parsed = parsePylymark(source);

  const clock: Clock = {
    ms: delay,
    delayDefault: 40,
    delay: {
      ",": 400,
      ".": 300,
      "…": 500,
    },
  };

  const nodes: ReactNode[] = [];

  for (const node of parsed) {
    switch (node.type) {
      case `hanziWord`: {
        let text: string = hanziFromHanziWord(node.hanziWord);
        const meaning = dict.get(node.hanziWord);
        const gloss = meaning?.gloss.at(0);
        if (node.showGloss && gloss != null) {
          text += ` ${gloss}`;
        }

        nodes.push(
          <HanziWordLink hanziWord={node.hanziWord} key={nodes.length}>
            {typeChars(text, clock, fastForward)}
          </HanziWordLink>,
        );
        break;
      }
      case `text`: {
        void typeChars(node.text, clock, fastForward, nodes);
        break;
      }
      case `bold`: {
        nodes.push(
          <Text className="pyly-bold" key={nodes.length}>
            {typeChars(node.text, clock, fastForward)}
          </Text>,
        );
        break;
      }
      case `italic`: {
        nodes.push(
          <Text className="pyly-italic" key={nodes.length}>
            {typeChars(node.text, clock, fastForward)}
          </Text>,
        );
        break;
      }
      case `highlight`: {
        nodes.push(
          <Text className="pyly-highlight" key={nodes.length}>
            {typeChars(node.text, clock, fastForward)}
          </Text>,
        );
        break;
      }
    }
  }

  // Add an empty text node to handle `onAnimateEnd`. Doing it as the last step
  // means it can be ignored in the rest of the algorithm.
  if (onAnimateEnd != null) {
    nodes.push(
      <Char
        onAnimateEnd={onAnimateEnd}
        delay={clock.ms}
        fastForward={fastForward}
        key={nodes.length}
        char=""
      />,
    );
  }

  return <Text className={className}>{nodes}</Text>;
};

const Char = ({
  char,
  delay,
  fastForward,
  onAnimateEnd,
}: {
  char: string;
  delay: number;
  fastForward: boolean;
  onAnimateEnd?: () => void;
}) => {
  let entering =
    // Skip the entering animation if fast-forwarding (unless this is the last
    // node and we need to call `onAnimateEnd`).
    onAnimateEnd || !fastForward
      ? FadeIn.duration(fastForward ? 0 : 250).delay(fastForward ? 0 : delay)
      : undefined;

  if (onAnimateEnd != null) {
    invariant(entering != null, `onAnimateEnd requires entering animation`);
    entering = entering.withCallback(onAnimateEnd);
  }

  return (
    <Reanimated.Text
      key={
        // Reanimated doesn't support cancelling `entering` animations, so the
        // only way to "fast forward" is to throw away the old element and
        // create a new one.
        fastForward ? `ff` : `no-ff`
      }
      entering={entering}
    >
      {char}
    </Reanimated.Text>
  );
};

function typeChars(
  text: string,
  clock: Clock,
  fastForward: boolean,
  result: ReactNode[] = [],
) {
  for (const grapheme of splitGraphemes(text)) {
    if (grapheme === `…`) {
      // Write an ellipsis as three fullstops, to better mimic a typewriter.
      const oldDelay = clock.delay[`.`];
      clock.delay[`.`] = 100;

      void typeChars(`...`, clock, fastForward, result);

      clock.delay[`.`] = oldDelay;
    } else {
      result.push(
        <Char
          delay={clock.ms}
          fastForward={fastForward}
          key={result.length}
          char={grapheme}
        />,
      );
    }

    clock.ms += clock.delay[grapheme] ?? clock.delayDefault;
  }

  return result;
}
