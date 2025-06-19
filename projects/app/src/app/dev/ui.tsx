/* eslint-disable no-console */
import { useQuizProgress } from "@/client/hooks/useQuizProgress";
import { HanziText } from "@/client/ui/HanziText";
import { IconImage } from "@/client/ui/IconImage";
import { PinyinOptionButton } from "@/client/ui/PinyinOptionButton";
import { QuizDeckHanziToPinyinQuestion } from "@/client/ui/QuizDeckHanziToPinyinQuestion";
import { QuizFlagText } from "@/client/ui/QuizFlagText";
import { QuizProgressBar } from "@/client/ui/QuizProgressBar";
import { QuizQueueButton } from "@/client/ui/QuizQueueButton";
import { RectButton } from "@/client/ui/RectButton";
import { ShootingStars } from "@/client/ui/ShootingStars";
import type { TextAnswerButtonState } from "@/client/ui/TextAnswerButton";
import { TextAnswerButton } from "@/client/ui/TextAnswerButton";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import type { PropsOf } from "@/client/ui/types";
import { Use } from "@/client/ui/Use";
import { QuestionFlagKind } from "@/data/model";
import { hanziWordToPinyinQuestionOrThrow } from "@/data/questions/hanziWordToPinyin";
import { hanziWordToPinyin } from "@/data/skills";
import { buildHanziWord } from "@/dictionary/dictionary";
import { subMinutes } from "date-fns/subMinutes";
import { Link } from "expo-router";
import shuffle from "lodash/shuffle";
import type { ReactNode } from "react";
import { StrictMode, useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tv } from "tailwind-variants";

function DesignSystemPage() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollTo = (y: number) => {
    scrollViewRef.current?.scrollTo({ y, animated: true });
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View className="flex-row p-2">
        <Link href="/learn" asChild>
          <Text
            className={`
              text-fg

              hover:underline
            `}
          >
            Home
          </Text>
        </Link>
      </View>
      <ScrollView style={{ flex: 1 }} ref={scrollViewRef}>
        <Section title={IconsExample.name} scrollTo={scrollTo}>
          <IconsExample />
        </Section>

        <Section title={QuizFlagTextExample.name} scrollTo={scrollTo}>
          <QuizFlagTextExample />
        </Section>

        <Section title={ShootingStarsExample.name} scrollTo={scrollTo}>
          <ShootingStarsExample />
        </Section>

        <Section title={IconImageExample.name} scrollTo={scrollTo}>
          <IconImageExample />
        </Section>

        <Section
          title={QuizDeckHanziToPinyinQuestionExample.name}
          scrollTo={scrollTo}
        >
          <QuizDeckHanziToPinyinQuestionExample />
        </Section>

        <Section title={PinyinOptionButtonExample.name} scrollTo={scrollTo}>
          <PinyinOptionButtonExample />
        </Section>

        <Section title={TextInputSingleExample.name} scrollTo={scrollTo}>
          <TextInputSingleExample />
        </Section>

        <Section title={QuizQueueButton.name} scrollTo={scrollTo}>
          <QuizQueueButtonExample />
        </Section>

        <Section title={QuizProgressBar.name} scrollTo={scrollTo}>
          <QuizProgressBarExample />
        </Section>

        <Section title={HanziText.name} scrollTo={scrollTo}>
          <HanziTextExamples />
        </Section>

        <Section title="TextAnswerButton" scrollTo={scrollTo}>
          <TextAnswerButtonExamples />
        </Section>

        <Section title="RectButton" scrollTo={scrollTo}>
          <RectButtonExamples />
        </Section>

        <Section title="Typography" scrollTo={scrollTo}>
          <View className="flex-1 gap-2">
            {([`chinese`] as const).map((family) => (
              <View key={family}>
                <LittlePrimaryHeader title={family} />
                <TypographyExample family={family} size="xs" />
                <TypographyExample family={family} size="sm" />
                <TypographyExample family={family} size="base" />
                <TypographyExample family={family} size="lg" />
                <TypographyExample family={family} size="xl" />
                <TypographyExample family={family} size="2xl" />
              </View>
            ))}
          </View>
        </Section>

        <Section title="Colors" scrollTo={scrollTo}>
          <View>
            <LittlePrimaryHeader title="slate" />
            <View className="flex-row flex-wrap gap-1">
              <ColorSwatch className="bg-slate-1" index={1} />
              <ColorSwatch className="bg-slate-2" index={2} />
              <ColorSwatch className="bg-slate-3" index={3} />
              <ColorSwatch className="bg-slate-4" index={4} />
              <ColorSwatch className="bg-slate-5" index={5} />
              <ColorSwatch className="bg-slate-6" index={6} />
              <ColorSwatch className="bg-slate-7" index={7} />
              <ColorSwatch className="bg-slate-8" index={8} />
              <ColorSwatch className="bg-slate-9" index={9} />
              <ColorSwatch className="bg-slate-10" index={10} />
              <ColorSwatch className="bg-slate-11" index={11} />
              <ColorSwatch className="bg-slate-12" index={12} />
            </View>
          </View>

          <View>
            <LittlePrimaryHeader title="cyan" />
            <View className="flex-row flex-wrap gap-1">
              <ColorSwatch className="bg-cyan-1" index={1} />
              <ColorSwatch className="bg-cyan-2" index={2} />
              <ColorSwatch className="bg-cyan-3" index={3} />
              <ColorSwatch className="bg-cyan-4" index={4} />
              <ColorSwatch className="bg-cyan-5" index={5} />
              <ColorSwatch className="bg-cyan-6" index={6} />
              <ColorSwatch className="bg-cyan-7" index={7} />
              <ColorSwatch className="bg-cyan-8" index={8} />
              <ColorSwatch className="bg-cyan-9" index={9} />
              <ColorSwatch className="bg-cyan-10" index={10} />
              <ColorSwatch className="bg-cyan-11" index={11} />
              <ColorSwatch className="bg-cyan-12" index={12} />
            </View>
          </View>
          <View>
            <LittlePrimaryHeader title="red" />
            <View className="flex-row flex-wrap gap-1">
              <ColorSwatch className="bg-red-1" index={1} />
              <ColorSwatch className="bg-red-2" index={2} />
              <ColorSwatch className="bg-red-3" index={3} />
              <ColorSwatch className="bg-red-4" index={4} />
              <ColorSwatch className="bg-red-5" index={5} />
              <ColorSwatch className="bg-red-6" index={6} />
              <ColorSwatch className="bg-red-7" index={7} />
              <ColorSwatch className="bg-red-8" index={8} />
              <ColorSwatch className="bg-red-9" index={9} />
              <ColorSwatch className="bg-red-10" index={10} />
              <ColorSwatch className="bg-red-11" index={11} />
              <ColorSwatch className="bg-red-12" index={12} />
            </View>
          </View>
          <View>
            <LittlePrimaryHeader title="lime" />
            <View className="flex-row flex-wrap gap-1">
              <ColorSwatch className="bg-lime-1" index={1} />
              <ColorSwatch className="bg-lime-2" index={2} />
              <ColorSwatch className="bg-lime-3" index={3} />
              <ColorSwatch className="bg-lime-4" index={4} />
              <ColorSwatch className="bg-lime-5" index={5} />
              <ColorSwatch className="bg-lime-6" index={6} />
              <ColorSwatch className="bg-lime-7" index={7} />
              <ColorSwatch className="bg-lime-8" index={8} />
              <ColorSwatch className="bg-lime-9" index={9} />
              <ColorSwatch className="bg-lime-10" index={10} />
              <ColorSwatch className="bg-lime-11" index={11} />
              <ColorSwatch className="bg-lime-12" index={12} />
            </View>
          </View>
          <View>
            <LittlePrimaryHeader title="amber" />
            <View className="flex-row flex-wrap gap-1">
              <ColorSwatch className="bg-amber-1" index={1} />
              <ColorSwatch className="bg-amber-2" index={2} />
              <ColorSwatch className="bg-amber-3" index={3} />
              <ColorSwatch className="bg-amber-4" index={4} />
              <ColorSwatch className="bg-amber-5" index={5} />
              <ColorSwatch className="bg-amber-6" index={6} />
              <ColorSwatch className="bg-amber-7" index={7} />
              <ColorSwatch className="bg-amber-8" index={8} />
              <ColorSwatch className="bg-amber-9" index={9} />
              <ColorSwatch className="bg-amber-10" index={10} />
              <ColorSwatch className="bg-amber-11" index={11} />
              <ColorSwatch className="bg-amber-12" index={12} />
            </View>
          </View>
        </Section>

        {/* Fill the rest of the page if it's too tall for the content */}
        <View className="flex-1 flex-row">
          <View
            className={`
              hhh-color-schema-light

              ${examplesStackClassName}
            `}
          />
          <View
            className={`
              hhh-color-scheme-dark

              ${examplesStackClassName}
            `}
          />
        </View>
      </ScrollView>
    </View>
  );
}

export default function DesignSystemStrict() {
  return (
    <StrictMode>
      <DesignSystemPage />
    </StrictMode>
  );
}

const typography = tv({
  base: `text-fg`,

  variants: {
    size: {
      xs: `text-xs`,
      sm: `text-sm`,
      base: `text-base`,
      lg: `text-lg`,
      xl: `text-xl`,
      "2xl": `text-2xl`,
    },
    family: {
      chinese: `font-chinese`,
    },
  },
});

const HanziTextExamples = () => (
  <>
    <ExampleStack title="hanzi">
      <ExampleStack title="1" showFrame>
        <HanziText hanzi="你好" />
      </ExampleStack>
      <ExampleStack title="2" showFrame>
        <HanziText hanzi="别的" />
      </ExampleStack>
      <ExampleStack title="3" showFrame>
        <HanziText hanzi="乚" />
      </ExampleStack>
    </ExampleStack>

    <ExampleStack title="hanzi + pinyin">
      <ExampleStack title="1" showFrame>
        <HanziText pinyin="nǐhǎo" hanzi="你好" />
      </ExampleStack>
      <ExampleStack title="2" showFrame>
        <HanziText pinyin="bie2 de5" hanzi="别的" />
      </ExampleStack>
      <ExampleStack title="3" showFrame>
        <HanziText pinyin="yǐ" hanzi="乚" />
      </ExampleStack>
    </ExampleStack>

    <ExampleStack title="hanzi + pinyin (underline)">
      <ExampleStack title="1" showFrame>
        <HanziText pinyin="nǐhǎo" hanzi="你好" underline />
      </ExampleStack>
      <ExampleStack title="2" showFrame>
        <HanziText pinyin="bie2 de5" hanzi="别的" underline />
      </ExampleStack>
      <ExampleStack title="3" showFrame>
        <HanziText pinyin="yǐ" hanzi="乚" underline />
      </ExampleStack>
    </ExampleStack>
  </>
);

const TypographyExample = ({
  size,
  family,
}: {
  size: `xs` | `sm` | `base` | `lg` | `xl` | `2xl`;
  family: `chinese`;
}) => {
  return (
    <View>
      <Text className="text-xs text-primary-11">{size}</Text>

      <Text className={typography({ size, family })} numberOfLines={1}>
        The quick brown fox jumps over the lazy dog.
      </Text>
    </View>
  );
};

const LittlePrimaryHeader = ({ title }: { title: string }) => {
  return (
    <View className="mb-2 mt-4 flex-row items-center gap-2">
      <View className="h-px grow bg-primary-7" />
      <Text className="text-center text-xs font-bold uppercase text-fg/80">
        {title}
      </Text>
      <View className="h-px grow bg-primary-7" />
    </View>
  );
};

const ColorSwatch = ({
  index,
  className = ``,
}: {
  index: number;
  className?: string;
}) => (
  <View className="flex-wrap gap-1">
    <Text className="text-center text-xs text-fg/50">{index}</Text>
    <View
      className={`
        size-[40px]

        ${className}
      `}
    />
  </View>
);

const Section = ({
  title,
  children,
  scrollTo,
}: {
  title: string;
  children: ReactNode;
  /**
   * For manual regression testing it's help to pixel-align the same position on
   * the new and old page and quickly swap between them to see the differences.
   * Being able to click the section title makes this easier.
   */
  scrollTo: (y: number) => void;
}) => {
  const ref = useRef<View>(null);
  return (
    <>
      <View className="flex-row" ref={ref}>
        <View
          className={`
            hhh-color-schema-light flex-1 bg-bg/90 p-2

            hover:bg-bg
          `}
        >
          <Pressable
            onPress={() => {
              ref.current?.measure((_x, y) => {
                scrollTo(y);
              });
            }}
          >
            <Text className="text-2xl text-fg">{title}</Text>
          </Pressable>
        </View>
        <View className="hhh-color-scheme-dark flex-1 bg-primary-4 p-2" />
      </View>
      <View className="flex-row">
        <View
          className={`
            hhh-color-schema-light

            ${examplesStackClassName}
          `}
        >
          {children}
        </View>
        <View
          className={`
            hhh-color-scheme-dark

            ${examplesStackClassName}
          `}
        >
          {children}
        </View>
      </View>
    </>
  );
};

const examplesStackClassName = `bg-bg flex-1 shrink basis-1 flex-row flex-wrap justify-center gap-2 p-2 sm:justify-start`;

const ExampleStack = ({
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
    <Text className="text-center text-xs text-caption">{title}</Text>
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
      true: `border-2 border-dashed border-primary-8`,
    },
  },
});

const RectButtonVariants = (props: Partial<PropsOf<typeof RectButton>>) => (
  <>
    <RectButton variant="filled" {...props}>
      Filled
    </RectButton>
    <RectButton variant="outline" {...props}>
      Outline
    </RectButton>
    <RectButton variant="option" {...props}>
      Option
    </RectButton>
    <RectButton variant="bare" {...props}>
      Bare
    </RectButton>
  </>
);

const RectButtonExamples = (props: Partial<PropsOf<typeof RectButton>>) => (
  <View className="flex-1">
    <View className="flex-row flex-wrap">
      <ExampleStack title="normal" childrenClassName="gap-2">
        <RectButtonVariants {...props} />
      </ExampleStack>

      <ExampleStack title="normal (disabled)" childrenClassName="gap-2">
        <RectButtonVariants disabled {...props} />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="themes" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="normal" childrenClassName="gap-2">
        <RectButtonVariants {...props} />
      </ExampleStack>

      <View className="theme-accent">
        <ExampleStack title="accent" childrenClassName="gap-2">
          <RectButtonVariants {...props} />
        </ExampleStack>
      </View>

      <View className="theme-success">
        <ExampleStack title="success" childrenClassName="gap-2">
          <RectButtonVariants {...props} />
        </ExampleStack>
      </View>

      <View className="theme-danger">
        <ExampleStack title="danger" childrenClassName="gap-2">
          <RectButtonVariants {...props} />
        </ExampleStack>
      </View>

      <ExampleStack title="(disabled)" childrenClassName="gap-2">
        <RectButtonVariants disabled {...props} />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader
      // eslint-disable-next-line @haohaohow/no-restricted-css-classes
      title="flex-col"
    />

    <View className="flex-row flex-wrap">
      <ExampleStack title="items-start" showFrame>
        <View className="w-[120px] items-start gap-2">
          <RectButtonVariants {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-center" showFrame>
        <View className="w-[120px] items-center gap-2">
          <RectButtonVariants {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-stretch" showFrame>
        <View className="w-[120px] items-stretch gap-2">
          <RectButtonVariants {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-end" showFrame>
        <View className="w-[120px] items-end gap-2">
          <RectButtonVariants {...props} />
        </View>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader
      // eslint-disable-next-line @haohaohow/no-restricted-css-classes
      title="flex-col + flex-1"
    />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="w-[120px] items-start gap-2"
      >
        <RectButtonVariants className="flex-1" {...props} />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="w-[120px] items-center gap-2"
      >
        <RectButtonVariants className="flex-1" {...props} />
      </ExampleStack>

      <ExampleStack
        title="items-stretch"
        showFrame
        childrenClassName="w-[120px] items-stretch gap-2"
      >
        <RectButtonVariants className="flex-1" {...props} />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="w-[120px] items-end gap-2"
      >
        <RectButtonVariants className="flex-1" {...props} />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-row" />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="h-[100px] flex-row items-start gap-2"
      >
        <RectButtonVariants inFlexRowParent {...props} />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="h-[100px] flex-row items-center gap-2"
      >
        <RectButtonVariants inFlexRowParent {...props} />
      </ExampleStack>

      <ExampleStack
        title="items-stretch**"
        showFrame
        childrenClassName="h-[100px] flex-row items-stretch gap-2"
      >
        <RectButtonVariants inFlexRowParent {...props} />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="h-[100px] flex-row items-end gap-2"
      >
        <RectButtonVariants inFlexRowParent {...props} />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-row + flex-1" />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="h-[100px] flex-row items-start gap-2"
      >
        <RectButtonVariants inFlexRowParent className="flex-1" {...props} />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="h-[100px] flex-row items-center gap-2"
      >
        <RectButtonVariants inFlexRowParent className="flex-1" {...props} />
      </ExampleStack>

      <ExampleStack
        title="items-stretch**"
        showFrame
        childrenClassName="h-[100px] flex-row items-stretch gap-2"
      >
        <RectButtonVariants inFlexRowParent className="flex-1" {...props} />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="h-[100px] flex-row items-end gap-2"
      >
        <RectButtonVariants inFlexRowParent className="flex-1" {...props} />
      </ExampleStack>
    </View>
  </View>
);

const TextAnswerButtonExamples = (
  props: Partial<PropsOf<typeof TextAnswerButton>>,
) => (
  <View className="flex-1">
    <View className="flex-row flex-wrap">
      <ExampleStack title="state">
        <TextAnswerButton state="default" text="default" {...props} />
        <TextAnswerButton state="error" text="error" {...props} />
        <TextAnswerButton state="selected" text="selected" {...props} />
        <TextAnswerButton state="success" text="success" {...props} />
      </ExampleStack>

      <ExampleStack title="disabled">
        <TextAnswerButton disabled text="Disabled" {...props} />
      </ExampleStack>

      <ExampleStack title="synced">
        <SyncedAnswerButtonExample />
      </ExampleStack>

      <ExampleStack title="text overflow" showFrame>
        <View className="size-[120px]">
          <TextAnswerButton
            className="flex-1"
            text="one two three four five six seven eight nine ten"
            {...props}
          />
          <TextAnswerButton
            className="flex-1"
            disabled
            text="one two three four five six seven eight nine ten"
            {...props}
          />
        </View>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader
      // eslint-disable-next-line @haohaohow/no-restricted-css-classes
      title="flex-col"
    />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="size-[120px] items-start gap-2"
      >
        <SyncedAnswerButtonExample />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="size-[120px] items-center gap-2"
      >
        <SyncedAnswerButtonExample />
      </ExampleStack>

      <ExampleStack
        title="items-stretch"
        showFrame
        childrenClassName="size-[120px] gap-2"
      >
        <SyncedAnswerButtonExample />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="size-[120px] items-end gap-2"
      >
        <SyncedAnswerButtonExample />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader
      // eslint-disable-next-line @haohaohow/no-restricted-css-classes
      title="flex-col + flex-1"
    />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="size-[120px] items-start gap-2"
      >
        <SyncedAnswerButtonExample className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="size-[120px] items-center gap-2"
      >
        <SyncedAnswerButtonExample className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-stretch"
        showFrame
        childrenClassName="size-[120px] gap-2"
      >
        <SyncedAnswerButtonExample className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="size-[120px] items-end gap-2"
      >
        <SyncedAnswerButtonExample className="flex-1" />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-row" />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row items-start gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row items-center gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent />
      </ExampleStack>

      <ExampleStack
        title="items-stretch"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row items-end gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-row + flex-1" />

    <View className="flex-row flex-wrap">
      <ExampleStack
        title="items-start"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row items-start gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-center"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row items-center gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-stretch"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent className="flex-1" />
      </ExampleStack>

      <ExampleStack
        title="items-end"
        showFrame
        childrenClassName="h-[100px] w-[200px] flex-row items-end gap-2"
      >
        <SyncedAnswerButtonExample inFlexRowParent className="flex-1" />
      </ExampleStack>
    </View>
  </View>
);

function SyncedAnswerButtonExample(
  props: Omit<PropsOf<typeof TextAnswerButton>, `text`>,
) {
  const [state, setState] = useState<TextAnswerButtonState>(`default`);
  return (
    <>
      <TextAnswerButton
        state={state}
        onPress={() => {
          setState(
            (prev) =>
              shuffle(
                (
                  [
                    `selected`,
                    `success`,
                    `error`,
                    `default`,
                    `dimmed`,
                  ] as TextAnswerButtonState[]
                ).filter((x) => x !== prev),
              )[0] ?? `default`,
          );
        }}
        {...props}
        text="Primary"
      />
      <TextAnswerButton state={state} {...props} text="Mirror" />
    </>
  );
}

function QuizProgressBarExample() {
  const quizProgress = useQuizProgress();

  const logCorrect = useCallback(() => {
    quizProgress.recordAnswer(true);
  }, [quizProgress]);

  const logIncorrect = useCallback(() => {
    quizProgress.recordAnswer(false);
  }, [quizProgress]);

  return (
    <View className="w-full gap-2">
      <View className="min-h-[32px]">
        <QuizProgressBar progress={quizProgress.progress} />
      </View>
      <View className="flex-row items-start gap-4">
        <View className="flex-row items-center gap-2">
          <Text className="font-bold text-caption">Answer:</Text>
          <RectButton variant="outline" onPress={logCorrect}>
            Correct
          </RectButton>
          <RectButton variant="outline" onPress={logIncorrect}>
            Incorrect
          </RectButton>
        </View>
      </View>
    </View>
  );
}

function QuizQueueButtonExample() {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="loading">
        <QuizQueueButton queueStats={null} />
      </ExampleStack>

      <ExampleStack title="overdue">
        <QuizQueueButton
          queueStats={{ overDueCount: 1, dueCount: 0, newCount: 0 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 10, dueCount: 0, newCount: 0 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 100, dueCount: 0, newCount: 0 }}
        />
      </ExampleStack>

      <ExampleStack title="due">
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 1, newCount: 0 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 10, newCount: 0 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 100, newCount: 0 }}
        />
      </ExampleStack>

      <ExampleStack title="new">
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 0, newCount: 1 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 0, newCount: 10 }}
        />
        <QuizQueueButton
          queueStats={{ overDueCount: 0, dueCount: 0, newCount: 100 }}
        />
      </ExampleStack>
    </View>
  );
}

function TextInputSingleExample() {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="default">
        <TextInputSingle placeholder="Placeholder text" />
        <TextInputSingle placeholder="Centered" textAlign="center" />
        <TextInputSingle placeholder="Right" textAlign="right" />
      </ExampleStack>

      <ExampleStack title="default (framed)" showFrame>
        <TextInputSingle placeholder="Placeholder text" />
        <TextInputSingle placeholder="Centered" textAlign="center" />
        <TextInputSingle placeholder="Right" textAlign="right" />
      </ExampleStack>

      <ExampleStack title="disabled" showFrame>
        <TextInputSingle placeholder="Placeholder" disabled />
        <TextInputSingle placeholder="Centered" disabled textAlign="center" />
        <TextInputSingle placeholder="Right" disabled textAlign="right" />
      </ExampleStack>
    </View>
  );
}

function IconImageExample() {
  const sources = [
    require(`@/assets/icons/book.svg`),
    require(`@/assets/icons/cart.svg`),
    require(`@/assets/icons/flag.svg`),
    require(`@/assets/icons/home.svg`),
  ];
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="size=12">
        {sources.map((s, i) => (
          <IconImage key={i} size={12} source={s} />
        ))}
      </ExampleStack>

      <ExampleStack title="default">
        {sources.map((s, i) => (
          <IconImage key={i} source={s} />
        ))}
      </ExampleStack>

      <ExampleStack title="size=32">
        {sources.map((s, i) => (
          <IconImage key={i} size={32} source={s} />
        ))}
      </ExampleStack>

      <View className="theme-success">
        <ExampleStack title="success">
          {sources.map((s, i) => (
            <IconImage key={i} source={s} />
          ))}
        </ExampleStack>
      </View>

      <View className="theme-accent">
        <ExampleStack title="accent">
          {sources.map((s, i) => (
            <IconImage key={i} source={s} />
          ))}
        </ExampleStack>
      </View>
    </View>
  );
}

function PinyinOptionButtonExample() {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack
        title="default"
        childrenClassName="flex-row flex-wrap gap-1"
      >
        <PinyinOptionButton pinyin="nī" shortcutKey="1" />
        <PinyinOptionButton pinyin="ní" shortcutKey="2" />
        <PinyinOptionButton pinyin="nǐ" shortcutKey="3" />
        <PinyinOptionButton pinyin="nì" shortcutKey="4" />
        <PinyinOptionButton pinyin="ni" shortcutKey="5" />
      </ExampleStack>

      <ExampleStack
        title="disabled"
        childrenClassName="flex-row flex-wrap gap-1"
      >
        <PinyinOptionButton pinyin="nī" shortcutKey="1" disabled />
        <PinyinOptionButton pinyin="ní" shortcutKey="2" disabled />
        <PinyinOptionButton pinyin="nǐ" shortcutKey="3" disabled />
        <PinyinOptionButton pinyin="nì" shortcutKey="4" disabled />
        <PinyinOptionButton pinyin="ni" shortcutKey="5" disabled />
      </ExampleStack>
    </View>
  );
}

function QuizDeckHanziToPinyinQuestionExample() {
  const skill = hanziWordToPinyin(buildHanziWord(`你好`, `hello`));
  const questionPromise = hanziWordToPinyinQuestionOrThrow(skill);

  return (
    <Use
      promise={questionPromise}
      render={(question) => (
        <QuizDeckHanziToPinyinQuestion
          noAutoFocus
          onNext={() => {
            console.log(`onNext()`);
          }}
          onRating={() => {
            console.log(`onRating()`);
          }}
          question={question}
        />
      )}
    />
  );
}

function QuizFlagTextExample() {
  return (
    <ExampleStack title="flags">
      <QuizFlagText flag={{ kind: QuestionFlagKind.WeakWord }} />
      <QuizFlagText flag={{ kind: QuestionFlagKind.NewSkill }} />
      <QuizFlagText
        flag={{
          kind: QuestionFlagKind.Overdue,
          interval: { start: subMinutes(new Date(), 59), end: new Date() },
        }}
      />
      <QuizFlagText flag={{ kind: QuestionFlagKind.Retry }} />
    </ExampleStack>
  );
}

function ShootingStarsExample() {
  const [i, setI] = useState(0);
  const [growth, setGrowth] = useState(0);
  const [play, setPlay] = useState(false);

  return (
    <View key={i} className="flex-row">
      <ExampleStack title="autoplay (125×75)" showFrame>
        <ShootingStars className="h-[75px] w-[125px]" play={true} />
      </ExampleStack>

      <View>
        <ExampleStack title="resizable (100×50)" showFrame>
          <ShootingStars
            style={{ width: 100 + growth, height: 50 + growth }}
            play={play}
          />
        </ExampleStack>
        <View className="shrink flex-row">
          <RectButton
            variant="bare"
            onPress={() => {
              setGrowth((prev) => prev - 5);
            }}
          >
            Shrink
          </RectButton>
          <RectButton
            variant="bare"
            onPress={() => {
              setGrowth((prev) => prev + 5);
            }}
          >
            Grow
          </RectButton>
        </View>
      </View>

      <ExampleStack title="manual (100×50)" showFrame>
        <ShootingStars className="h-[50px] w-[100px]" play={play} />
      </ExampleStack>

      <ExampleStack title="manual (100×50) success" showFrame>
        <ShootingStars
          className="theme-success h-[50px] w-[100px]"
          play={play}
        />
      </ExampleStack>

      <ExampleStack title="Controls" childrenClassName="items-center gap-2">
        <RectButton
          onPress={() => {
            setPlay((prev) => !prev);
          }}
        >
          {play ? `Stop` : `Play`}
        </RectButton>
        <RectButton
          onPress={() => {
            setI((prev) => prev + 1);
          }}
        >
          Re-render
        </RectButton>
      </ExampleStack>
    </View>
  );
}

function IconsExample() {
  const icons = ([12, 24, 32] as const).map((size, i) => (
    <View key={i} className="max-w-[200px] flex-row flex-wrap">
      {allIcons.map((source, i) => (
        <IconImage key={i} size={size} source={source} />
      ))}
    </View>
  ));
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="default" childrenClassName="gap-8">
        {icons}
      </ExampleStack>

      <ExampleStack title="success" childrenClassName="gap-8 theme-success">
        {icons}
      </ExampleStack>

      <ExampleStack title="danger" childrenClassName="gap-8 theme-danger">
        {icons}
      </ExampleStack>
    </View>
  );
}

const allIcons = [
  // <hhh-require-glob dir="../../assets/icons" glob="*.svg">
  require(`../../assets/icons/alarm-filled.svg`),
  require(`../../assets/icons/alarm.svg`),
  require(`../../assets/icons/arrow-down.svg`),
  require(`../../assets/icons/arrow-return-left.svg`),
  require(`../../assets/icons/arrow-right.svg`),
  require(`../../assets/icons/arrow-up.svg`),
  require(`../../assets/icons/badge-filled.svg`),
  require(`../../assets/icons/badge.svg`),
  require(`../../assets/icons/book.svg`),
  require(`../../assets/icons/bookmark-filled.svg`),
  require(`../../assets/icons/bookmark.svg`),
  require(`../../assets/icons/cart.svg`),
  require(`../../assets/icons/check-circled-filled.svg`),
  require(`../../assets/icons/check.svg`),
  require(`../../assets/icons/chevron-backward-filled.svg`),
  require(`../../assets/icons/chevron-down-filled.svg`),
  require(`../../assets/icons/chevron-forward-filled.svg`),
  require(`../../assets/icons/chevron-up-filled.svg`),
  require(`../../assets/icons/close-circled-filled.svg`),
  require(`../../assets/icons/close.svg`),
  require(`../../assets/icons/document.svg`),
  require(`../../assets/icons/flag-1.svg`),
  require(`../../assets/icons/flag.svg`),
  require(`../../assets/icons/flame-filled.svg`),
  require(`../../assets/icons/flame.svg`),
  require(`../../assets/icons/frown-circled.svg`),
  require(`../../assets/icons/help-circled.svg`),
  require(`../../assets/icons/home-filled.svg`),
  require(`../../assets/icons/home.svg`),
  require(`../../assets/icons/inbox-filled.svg`),
  require(`../../assets/icons/keyboard.svg`),
  require(`../../assets/icons/loader.svg`),
  require(`../../assets/icons/lock-filled.svg`),
  require(`../../assets/icons/medal.svg`),
  require(`../../assets/icons/menu.svg`),
  require(`../../assets/icons/message-bubble-filled.svg`),
  require(`../../assets/icons/plant-filled.svg`),
  require(`../../assets/icons/profile-filled.svg`),
  require(`../../assets/icons/profile.svg`),
  require(`../../assets/icons/redo.svg`),
  require(`../../assets/icons/repeat.svg`),
  require(`../../assets/icons/ruler.svg`),
  require(`../../assets/icons/search.svg`),
  require(`../../assets/icons/settings-filled.svg`),
  require(`../../assets/icons/settings.svg`),
  require(`../../assets/icons/show.svg`),
  require(`../../assets/icons/star-filled.svg`),
  require(`../../assets/icons/star.svg`),
  require(`../../assets/icons/time-circled.svg`),
  require(`../../assets/icons/trending-down.svg`),
  require(`../../assets/icons/trending-up.svg`),
  require(`../../assets/icons/undo.svg`),
  require(`../../assets/icons/zap-filled.svg`),
  // </hhh-require-glob>
];
