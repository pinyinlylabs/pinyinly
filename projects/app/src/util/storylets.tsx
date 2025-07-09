import { IconImage } from "@/client/ui/IconImage";
import { SpeechBubble } from "@/client/ui/SpeechBubble";
import { parseHhhmark } from "@/data/hhhmark";
import { nonNullable } from "@pinyinly/lib/invariant";
import { Image } from "expo-image";
import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { tv } from "tailwind-variants";
import { HanziWordRefText } from "../client/ui/HanziWordRefText";

const Dialogue = ({ text }: { text: string; onContinue: () => void }) => {
  const [speechBubbleLoaded, setSpeechBubbleLoaded] = useState(false);
  const [textAnimationDone, setTextAnimationDone] = useState(false);

  return (
    <View
      className={`
        p-4

        ${speechBubbleLoaded ? `` : `invisible`}
      `}
    >
      {speechBubbleLoaded ? (
        <TypewriterHhhmark
          source={text}
          className="hhh-body"
          delay={200}
          onAnimateEnd={() => {
            setTextAnimationDone(true);
          }}
        />
      ) : null}
      <View
        className={`
          -mb-2 -mr-2 mt-1 flex-row items-center justify-end gap-1 transition-opacity duration-1000

          ${textAnimationDone ? `opacity-100` : `opacity-0`}
        `}
      >
        <Text className="hhh-button-bare text-fg">Continue</Text>
        <IconImage
          source={require(`@/assets/icons/chevron-forward-filled.svg`)}
          size={24}
          className="animate-hoscillate"
        />
      </View>
      <SpeechBubble
        className="pointer-events-none absolute inset-0 left-[-14px]"
        onLoad={() => {
          setSpeechBubbleLoaded(true);
        }}
      />
    </View>
  );
};

export const TypewriterText = ({
  text,
  className,
  delay = 0,
  onAnimateEnd,
}: {
  text: string;
  className?: string;
  delay?: number;
  onAnimateEnd?: () => void;
}) => {
  const words = text.split(` `);
  return (
    <Text className={className}>
      {words.map((word, i, arr) => {
        const isLastWord = i === arr.length - 1;
        return (
          <TypewriterWord
            key={i}
            delay={delay}
            index={i}
            word={word}
            onAnimateEnd={isLastWord ? onAnimateEnd : undefined}
          />
        );
      })}
    </Text>
  );
};

const TypewriterWord = ({
  word,
  index,
  delay,
  onAnimateEnd,
}: {
  word: string | JSX.Element;
  index: number;
  delay: number;
  onAnimateEnd?: () => void;
}) => {
  let entering = FadeIn.duration(250).delay(delay + 100 * index);
  if (onAnimateEnd != null) {
    entering = entering.withCallback(onAnimateEnd);
  }
  return <Reanimated.Text entering={entering}>{word}</Reanimated.Text>;
};

const LeafImage = () => null;

export const NewWordDirector = () => {
  const [state, setState] = useState(`splash`);

  const next = () => {
    if (state === `splash`) {
      setState(`intro`);
    } else if (state === `intro`) {
      setState(`dependenciesMet`);
    }
  };

  switch (state) {
    case `splash`: {
      return <NewWordSplash onNext={next} />;
    }
    case `intro`: {
      return <NewWordIntro onNext={next} />;
    }
    default: {
      return null;
    }
  }
};

const NewWordSplash = ({ onNext: next }: { onNext: () => void }) => {
  return (
    <View className={screenClass()}>
      <LeafImage />
      <AfterDelay ms={100} action={next} />
    </View>
  );
};

const screenClass = tv({
  base: `h-[200px] w-[400px]`,
});

const AfterDelay = ({ ms, action }: { ms: number; action: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      action();
    }, ms);
    return () => {
      clearTimeout(timer);
    };
  }, [action, ms]);

  return null;
};

const NewWordIntro = ({ onNext: next }: { onNext: () => void }) => {
  const learnedDependencies = [] as string[] | null;
  return (
    <View className={screenClass({ class: `` })}>
      <View className="mt-auto flex-row items-end gap-4">
        <Image
          source={require(`@/assets/illustrations/tutor.svg`)}
          className="h-[94px] w-[80px] animate-fadein"
        />

        <View className="flex-1 pb-9">
          {learnedDependencies == null || learnedDependencies.length === 0 ? (
            <Dialogue
              onContinue={next}
              text="…you know **辶** means **walk or movement**, and **力** means **strength**… "
            />
          ) : learnedDependencies.length === 1 ? (
            <Dialogue
              onContinue={next}
              text={`Since you know ${nonNullable(learnedDependencies[0])}, you’re ready for your next
          lesson.`}
            />
          ) : learnedDependencies.length === 2 ? (
            <Dialogue
              onContinue={next}
              text={`Since you know ${nonNullable(learnedDependencies[0])} and ${nonNullable(learnedDependencies[1])},
          you’re ready for your next lesson.`}
            />
          ) : (
            <Dialogue
              onContinue={next}
              text={`Since you know ${nonNullable(learnedDependencies[0])}, ${nonNullable(learnedDependencies[1])} and ${nonNullable(learnedDependencies[2])}, you’re ready for your next lesson.`}
            />
          )}
        </View>
      </View>
    </View>
  );
};

export const TypewriterHhhmark = ({
  source,
  className,
  delay = 0,
  onAnimateEnd,
}: {
  source: string;
  className?: string;
  delay?: number;
  onAnimateEnd?: () => void;
}) => {
  const rendered = useMemo(() => {
    const parsed = parseHhhmark(source);
    let i = 0;
    return parsed.map((node, index) => {
      const isLastNode = index === parsed.length - 1;
      switch (node.type) {
        case `text`: {
          return (
            <Text key={index}>
              {node.text.split(` `).map((word, j, arr) => {
                const isLastSubNode = isLastNode && j === arr.length - 1;
                return (
                  <TypewriterWord
                    key={j}
                    index={i++}
                    word={(j > 0 ? ` ` : ``) + word}
                    delay={delay}
                    onAnimateEnd={isLastSubNode ? onAnimateEnd : undefined}
                  />
                );
              })}
            </Text>
          );
        }
        case `hanziWord`: {
          return (
            <TypewriterWord
              key={index}
              index={i++}
              delay={delay}
              word={
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
        case `bold`: {
          return (
            <Text key={index} className="hhh-bold">
              {node.text.split(` `).map((word, j, arr) => {
                const isLastSubNode = isLastNode && j === arr.length - 1;
                return (
                  <TypewriterWord
                    key={j}
                    index={i++}
                    word={(j > 0 ? ` ` : ``) + word}
                    delay={delay}
                    onAnimateEnd={isLastSubNode ? onAnimateEnd : undefined}
                  />
                );
              })}
            </Text>
          );
        }
        case `italic`: {
          return (
            <Text key={index} className="hhh-italic">
              {node.text.split(` `).map((word, j, arr) => {
                const isLastSubNode = isLastNode && j === arr.length - 1;
                return (
                  <TypewriterWord
                    key={j}
                    index={i++}
                    word={(j > 0 ? ` ` : ``) + word}
                    delay={delay}
                    onAnimateEnd={isLastSubNode ? onAnimateEnd : undefined}
                  />
                );
              })}
            </Text>
          );
        }
      }
    });
  }, [delay, onAnimateEnd, source]);

  return <Text className={className}>{rendered}</Text>;
};
