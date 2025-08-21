import { useSoundEffect } from "@/client/hooks/useSoundEffect";
import { useSoundEffectCycle } from "@/client/hooks/useSoundEffectCycle";
import { pickChildren } from "@/client/react";
import type { PylyAudioSource } from "@pinyinly/audio-sprites/client";
import type { PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import { IconImage } from "./IconImage";
import { MDXComponents } from "./MDXComponents";

export function PylyMdxComponents({ children }: PropsWithChildren) {
  return (
    <MDXComponents
      components={{
        Audio,
        Hanzi: HanziComponent,
        Translated: TranslatedComponent,

        Examples: ({ children }: PropsWithChildren) => {
          return <View className="gap-5 p-4">{children}</View>;
        },
        Example: ({ children }: PropsWithChildren) => {
          const [hanzi, translated] = pickChildren(
            children,
            HanziComponent,
            TranslatedComponent,
          );

          return (
            <View className="border-l-[6px] border-l-fg/20 py-2 pl-3">
              {hanzi == null ? null : (
                <Text className="pyly-body">{hanzi.props.children}</Text>
              )}
              {translated == null ? null : (
                <Text className="pyly-body">{translated.props.children}</Text>
              )}
            </View>
          );
        },
        Speech,
        ol: ({ children }: PropsWithChildren) => (
          <ol className="space-y-2">{children}</ol>
        ),
        ul: ({ children }: PropsWithChildren) => (
          <ul className="space-y-2">{children}</ul>
        ),
        li: ({ children }: PropsWithChildren) => (
          <li className="pyly-body">
            <Text className="pyly-body">{children}</Text>
          </li>
        ),
        table: ({ children }: PropsWithChildren) => (
          <View className="my-4 overflow-hidden rounded-lg border border-fg/20">
            {children}
          </View>
        ),
        thead: ({ children }: PropsWithChildren) => (
          <View className="bg-fg/5">{children}</View>
        ),
        tbody: ({ children }: PropsWithChildren) => <View>{children}</View>,
        tr: ({ children }: PropsWithChildren) => (
          <View
            className={`
              flex-row border-b border-fg/10

              last:border-b-0
            `}
          >
            {children}
          </View>
        ),
        th: ({ children }: PropsWithChildren) => (
          <View
            className={`
              flex-1 border-r border-fg/10 px-3 py-2

              last:border-r-0
            `}
          >
            <Text className="pyly-body font-semibold text-fg-loud">
              {children}
            </Text>
          </View>
        ),
        td: ({ children }: PropsWithChildren) => (
          <View
            className={`
              flex-1 border-r border-fg/10 px-3 py-2

              last:border-r-0
            `}
          >
            <Text className="pyly-body">{children}</Text>
          </View>
        ),
        wrapper: ({ children }: PropsWithChildren) => (
          <View className="pyly-mdx space-y-4">{children}</View>
        ),
      }}
    >
      {children}
    </MDXComponents>
  );
}

const Audio = ({ src }: { src: PylyAudioSource }) => {
  const playSound = useSoundEffect(src);

  return (
    <Pressable className="flex-row items-center gap-2" onPressIn={playSound}>
      <IconImage
        source={require(`@/assets/icons/speaker-2.svg`)}
        size={24}
        className="text-fg-loud"
      />
    </Pressable>
  );
};

const Speech = ({ srcs }: { srcs: PylyAudioSource[] }) => {
  const playSound = useSoundEffectCycle(srcs);

  return (
    <Pressable className="flex-row items-center gap-2" onPressIn={playSound}>
      <IconImage
        source={require(`@/assets/icons/speaker-2.svg`)}
        size={24}
        className="text-fg-loud"
      />
    </Pressable>
  );
};

function TranslatedComponent({ children }: PropsWithChildren) {
  return <>{children}</>;
}

function HanziComponent({ children }: PropsWithChildren) {
  return <>{children}</>;
}
