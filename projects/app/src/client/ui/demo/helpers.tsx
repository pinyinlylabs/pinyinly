import type { HanziText, HanziWord } from "@/data/model";
import type { Href } from "expo-router";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useRef } from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { RectButton } from "../RectButton";

export const ExampleStack = ({
  children,
  title,
  childrenClassName,
  showFrame,
}: {
  children: ReactNode;
  title: string;
  childrenClassName?: string;
  showFrame?: boolean;
}) => (
  <View className="items-center gap-2 p-2">
    <Text className="pyly-dev-dt text-center">{title}</Text>
    <View
      className={exampleStackChildrenClass({
        showFrame,
        className: childrenClassName,
      })}
    >
      {children}
    </View>
  </View>
);

const exampleStackChildrenClass = tv({
  base: `items-start`,
  variants: {
    showFrame: {
      true: `border-2 border-dashed border-fg/50`,
    },
  },
});

export const Section = ({
  title,
  children,
  href,
}: {
  title: string;
  children: ReactNode;
  href: Href;
}) => {
  const ref = useRef<View>(null);
  return (
    <>
      <View className="flex-row" ref={ref}>
        <View
          className={`
            pyly-color-scheme-light theme-default flex-1 bg-bg/90 p-2

            hover:bg-bg
          `}
        >
          <Link href={href} asChild>
            <Text className="font-mono text-2xl text-fg">{title}</Text>
          </Link>
        </View>
        <View
          className={`
            pyly-color-scheme-dark hidden flex-1 bg-bg-high p-2

            lg:flex
          `}
        />
      </View>
      <View className="lg:flex-row">
        <View
          className={`
            pyly-color-scheme-light theme-default

            ${examplesStackClassName}
          `}
        >
          {children}
        </View>
        <View
          className={`
            pyly-color-scheme-dark theme-default

            ${examplesStackClassName}
          `}
        >
          {children}
        </View>
      </View>
    </>
  );
};

export const examplesStackClassName = `bg-bg lg:flex-1 lg:shrink lg:basis-1 flex-row flex-wrap justify-center gap-2 p-2 sm:justify-start`;

export const LittlePrimaryHeader = ({ title }: { title: string }) => {
  return (
    <View className="mb-2 mt-4 flex-row items-center gap-2">
      <View className="h-px grow bg-bg-high" />
      <Text className="pyly-dev-dt text-center">{title}</Text>
      <View className="h-px grow bg-bg-high" />
    </View>
  );
};

/**
 * A hook that provides a demo hanzi word and ensures it's part of the URL,
 * so that the URL is the UI for editing the value (rather than needing a
 * separate UI widget).
 */
export function useDemoHanziWordKnob(defaultHanziWord: HanziWord): {
  hanziWord: HanziWord;
  setHanziWord: (hanziWord: HanziWord) => void;
};
export function useDemoHanziWordKnob(defaultHanziWord?: HanziWord): {
  hanziWord: HanziWord | undefined;
  setHanziWord: (hanziWord: HanziWord) => void;
};
export function useDemoHanziWordKnob(defaultHanziWord?: HanziWord) {
  const { hanziWord } = useLocalSearchParams<{
    hanziWord?: HanziWord;
  }>();
  const router = useRouter();

  function setHanziWord(hanziWord: HanziWord) {
    router.setParams({ hanziWord });
  }

  if (hanziWord == null && defaultHanziWord != null) {
    // Redirect to set a default hanzi. This way the query string is always
    // visible in the URL and it's self documenting if you want to preview a
    // different hanzi.
    setHanziWord(defaultHanziWord);
  }

  return {
    hanziWord: hanziWord ?? defaultHanziWord,
    setHanziWord,
  };
}

/**
 * A hook that provides a demo hanzi character and ensures it's part of the URL,
 * so that the URL is the UI for editing the value (rather than needing a
 * separate UI widget).
 */
export function useDemoHanziKnob(defaultHanzi: HanziText): {
  hanzi: HanziText;
  setHanzi: (hanzi: HanziText) => void;
};
export function useDemoHanziKnob(defaultHanzi?: HanziText): {
  hanzi: HanziText | undefined;
  setHanzi: (hanzi: HanziText) => void;
};
export function useDemoHanziKnob(defaultHanzi?: HanziText) {
  const { hanzi } = useLocalSearchParams<{
    hanzi?: HanziText;
  }>();
  const router = useRouter();

  function setHanzi(hanzi: HanziText) {
    router.setParams({ hanzi });
  }

  if (hanzi == null && defaultHanzi != null) {
    // Redirect to set a default hanzi. This way the query string is always
    // visible in the URL and it's self documenting if you want to preview a
    // different hanzi.
    setHanzi(defaultHanzi);
  }

  return {
    hanzi: hanzi ?? defaultHanzi,
    setHanzi,
  };
}

export function DemoHanziKnob({ hanzis }: { hanzis?: HanziText[] }) {
  const { hanzi: currentHanzi, setHanzi } = useDemoHanziKnob(hanzis?.[0]);

  hanzis ??= [
    `一`,
    `长`,
    `好`,
    `你好`,
    `学`,
    `习`,
    `汉`,
    `字`,
    `为`,
  ] as HanziText[];

  return (
    <View className="flex-row items-end gap-1 border-b-4 border-fg/10 pb-2">
      {hanzis.map((hanzi) => (
        <RectButton
          key={hanzi}
          className={
            hanzi === currentHanzi
              ? `[--color-fg:var(--color-cyanold)]`
              : undefined
          }
          variant="filled"
          onPressIn={() => {
            setHanzi(hanzi);
          }}
        >
          {hanzi}
        </RectButton>
      ))}
    </View>
  );
}

export function DemoHanziWordKnob({
  hanziWords,
}: {
  hanziWords?: HanziWord[];
}) {
  const { hanziWord: currentHanziWord, setHanziWord } = useDemoHanziWordKnob(
    hanziWords?.[0],
  );

  hanziWords ??= [`你好:hello`] as HanziWord[];

  return (
    <View className="flex-row items-end gap-1 border-b-4 border-fg/10 pb-2">
      {hanziWords.map((hanziWord) => (
        <RectButton
          key={hanziWord}
          className={
            hanziWord === currentHanziWord
              ? `[--color-fg:var(--color-cyanold)]`
              : undefined
          }
          variant="filled"
          onPressIn={() => {
            setHanziWord(hanziWord);
          }}
        >
          {hanziWord}
        </RectButton>
      ))}
    </View>
  );
}
