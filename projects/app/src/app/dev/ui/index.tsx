import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import type { FunctionComponent } from "react";
import { lazy, StrictMode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { examplesStackClassName, Section } from "./_helpers";

function UiDemoIndexPage() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View className="flex-row flex-wrap items-center gap-2 p-2">
        {Object.keys(demos).map((name) => (
          <Link href={`/dev/ui/${name}`} asChild key={name}>
            <Text
              className={`
                font-mono text-xs text-fg/50

                hover:underline
              `}
            >
              {name}
            </Text>
          </Link>
        ))}

        {([`/`, `/learn`] satisfies Href[]).map((href) => (
          <Link href={href} asChild key={href}>
            <Text
              className={`
                font-mono text-xs text-fg/80

                hover:underline
              `}
            >
              {href}
            </Text>
          </Link>
        ))}
      </View>
      <ScrollView style={{ flex: 1 }}>
        {Object.entries(demos).map(([name, Demo]) => (
          <Section key={name} title={name} href={`/dev/ui/${name}`}>
            <Demo />
          </Section>
        ))}

        {/* Fill the rest of the page if it's too tall for the content */}
        <View className="flex-1 flex-row">
          <View
            className={`
              pyly-color-schema-light theme-default

              ${examplesStackClassName}
            `}
          />
          <View
            className={`
              pyly-color-scheme-dark theme-default

              ${examplesStackClassName}
            `}
          />
        </View>
      </ScrollView>
    </View>
  );
}

export default function UiDemoIndexPageStrict() {
  return (
    <StrictMode>
      <UiDemoIndexPage />
    </StrictMode>
  );
}

const lazyDemo = <Demo extends FunctionComponent>(
  importFn: () => Promise<{ default: Demo }>,
) =>
  lazy(async () => {
    await devToolsSlowQuerySleepIfEnabled();
    return await importFn();
  });

// prettier-ignore
export const demos: Record<string, FunctionComponent> = {
  // <pyly-glob-template dir="_demos/" glob="*.tsx" template="  ${filenameWithoutExt}: lazyDemo(() => import(`${pathWithoutExt}`)),">
  Colors: lazyDemo(() => import(`./_demos/Colors`)),
  HanziText: lazyDemo(() => import(`./_demos/HanziText`)),
  IconImage: lazyDemo(() => import(`./_demos/IconImage`)),
  Icons: lazyDemo(() => import(`./_demos/Icons`)),
  ImageCloud: lazyDemo(() => import(`./_demos/ImageCloud`)),
  NewSkillModal: lazyDemo(() => import(`./_demos/NewSkillModal`)),
  NewSprout: lazyDemo(() => import(`./_demos/NewSprout`)),
  NewWordTutorial: lazyDemo(() => import(`./_demos/NewWordTutorial`)),
  PinyinOptionButton: lazyDemo(() => import(`./_demos/PinyinOptionButton`)),
  Pylymark: lazyDemo(() => import(`./_demos/Pylymark`)),
  QuizDeckHanziToPinyinQuestion: lazyDemo(() => import(`./_demos/QuizDeckHanziToPinyinQuestion`)),
  QuizFlagText: lazyDemo(() => import(`./_demos/QuizFlagText`)),
  QuizProgressBar: lazyDemo(() => import(`./_demos/QuizProgressBar`)),
  QuizQueueButton: lazyDemo(() => import(`./_demos/QuizQueueButton`)),
  RectButton: lazyDemo(() => import(`./_demos/RectButton`)),
  ShootingStars: lazyDemo(() => import(`./_demos/ShootingStars`)),
  SkillTile: lazyDemo(() => import(`./_demos/SkillTile`)),
  TextAnswerButton: lazyDemo(() => import(`./_demos/TextAnswerButton`)),
  TextInputSingle: lazyDemo(() => import(`./_demos/TextInputSingle`)),
  ToggleButton: lazyDemo(() => import(`./_demos/ToggleButton`)),
  Typography: lazyDemo(() => import(`./_demos/Typography`)),
  WikiHanziWordModal: lazyDemo(() => import(`./_demos/WikiHanziWordModal`)),
// </pyly-glob-template>
};
