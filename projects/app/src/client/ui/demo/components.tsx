import { useBetaFeatures } from "@/client/ui/hooks/useBetaFeatures";
import { RectButton } from "@/client/ui/RectButton";
import { ToggleButton } from "@/client/ui/ToggleButton";
import type { HanziText, HanziWord } from "@/data/model";
import { Link } from "expo-router";
import type { Href } from "expo-router";
import { useRef } from "react";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import {
  examplesStackClassName,
  useDemoHanziKnob,
  useDemoHanziWordKnob,
} from "./utils";

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

export const LittlePrimaryHeader = ({ title }: { title: string }) => {
  return (
    <View className="mb-2 mt-4 flex-row items-center gap-2">
      <View className="h-px grow bg-bg-high" />
      <Text className="pyly-dev-dt text-center">{title}</Text>
      <View className="h-px grow bg-bg-high" />
    </View>
  );
};

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

/**
 * A knob to toggle beta features on/off in demo pages.
 * Uses the device store to persist the setting.
 */
export function DemoBetaFeaturesKnob() {
  const { isLoading, isEnabled, setIsEnabled } = useBetaFeatures();

  return (
    <View className="flex-row items-center gap-2 border-b-4 border-fg/10 pb-2">
      <Text className="pyly-body">Beta Features</Text>
      <ToggleButton
        isActive={isLoading ? null : isEnabled}
        onPress={() => {
          setIsEnabled(!isEnabled);
        }}
      />
    </View>
  );
}
