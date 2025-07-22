import type { Href } from "expo-router";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { useRef } from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

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
            pyly-color-schema-light theme-default flex-1 bg-bg/90 p-2

            hover:bg-bg
          `}
        >
          <Link href={href} asChild>
            <Text className="font-mono text-2xl text-fg">{title}</Text>
          </Link>
        </View>
        <View
          className={`
            pyly-color-scheme-dark hidden flex-1 bg-bg-loud p-2

            lg:flex
          `}
        />
      </View>
      <View className="lg:flex-row">
        <View
          className={`
            pyly-color-schema-light theme-default

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
      <View className="h-px grow bg-bg-loud" />
      <Text className="pyly-dev-dt text-center">{title}</Text>
      <View className="h-px grow bg-bg-loud" />
    </View>
  );
};
