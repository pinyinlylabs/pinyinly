import { useBetaFeatures } from "@/client/ui/hooks/useBetaFeatures";
import { RectButton } from "@/client/ui/RectButton";
import { ToggleButton } from "@/client/ui/ToggleButton";
import type { HanziText, HanziWord } from "@/data/model";
import { Link } from "expo-router";
import type { Href } from "expo-router";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { tv } from "tailwind-variants";
import { useDemoHanziKnob, useDemoHanziWordKnob } from "./utils";
import { Theme } from "@/client/ui/Theme";

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
    <Text className="text-center pyly-dev-dt">{title}</Text>
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
  const [isLightCollapsed, setIsLightCollapsed] = useState(false);
  const [isDarkCollapsed, setIsDarkCollapsed] = useState(false);

  return (
    <>
      <View className="flex-row" ref={ref}>
        <Theme theme="light">
          <View
            className={`
              flex-1 bg-bg/90 p-2

              hover:bg-bg
            `}
          >
            <View className="flex-row items-center justify-between gap-2">
              <Link href={href} asChild>
                <Text className="font-mono text-2xl text-fg">{title}</Text>
              </Link>
              <RectButton
                className="
                  hidden

                  lg:flex
                "
                variant="bare"
                onPress={() => {
                  setIsLightCollapsed((current) => !current);
                }}
              >
                {isLightCollapsed ? `Show` : `Hide`}
              </RectButton>
            </View>
          </View>
        </Theme>
        <Theme theme="dark">
          <View
            className={`
              hidden flex-1 bg-bg-high p-2

              lg:flex
            `}
          >
            <RectButton
              className="
                hidden self-end

                lg:flex
              "
              variant="bare"
              onPress={() => {
                setIsDarkCollapsed((current) => !current);
              }}
            >
              {isDarkCollapsed ? `Show` : `Hide`}
            </RectButton>
          </View>
        </Theme>
      </View>
      <View className="lg:flex-row">
        <Theme theme="light">
          <View
            className={`
              ${stackContentClass({ collapsed: isLightCollapsed })}
            `}
          >
            {isLightCollapsed ? null : children}
          </View>
        </Theme>
        <Theme theme="dark">
          <View
            className={`
              ${stackContentClass({ collapsed: isDarkCollapsed })}
            `}
          >
            {isDarkCollapsed ? null : children}
          </View>
        </Theme>
      </View>
    </>
  );
};

const stackContentClass = tv({
  base: `
    flex-row flex-wrap justify-center gap-2 bg-bg p-2

    sm:justify-start

    lg:flex-1 lg:shrink lg:basis-1
  `,
  variants: {
    collapsed: {
      true: `hidden`,
      false: ``,
    },
  },
});

export const LittlePrimaryHeader = ({ title }: { title: string }) => {
  return (
    <View className="mt-4 mb-2 flex-row items-center gap-2">
      <View className="h-px grow bg-bg-high" />
      <Text className="text-center pyly-dev-dt">{title}</Text>
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
