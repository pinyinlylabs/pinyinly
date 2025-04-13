import { HanziText } from "@/client/ui/HanziText";
import { QuizProgressBar2 } from "@/client/ui/QuizProgressBar2";
import { RectButton2 } from "@/client/ui/RectButton2";
import {
  TextAnswerButton,
  TextAnswerButtonState,
} from "@/client/ui/TextAnswerButton";
import { PropsOf } from "@/client/ui/types";
import { Link } from "expo-router";
import shuffle from "lodash/shuffle";
import { ReactNode, useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tv } from "tailwind-variants";

export default function DesignSystemPage() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollTo = (y: number) => {
    scrollViewRef.current?.scrollTo({ y, animated: true });
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View className="flex-row p-2">
        <Link href="/learn" asChild>
          <Text className="text-text hover:underline">Home</Text>
        </Link>
      </View>
      <ScrollView style={{ flex: 1 }} ref={scrollViewRef}>
        <Section title="QuizProgressBar2Example" scrollTo={scrollTo}>
          <QuizProgressBar2Example />
        </Section>

        <Section title="HanziText" scrollTo={scrollTo}>
          <HanziTextExamples />
        </Section>

        <Section title="AnswerButton" scrollTo={scrollTo}>
          <TextAnswerButtonExamples />
        </Section>

        <Section title="RectButton2" scrollTo={scrollTo}>
          <RectButton2Examples />
        </Section>

        <Section title="Typography" scrollTo={scrollTo}>
          <View className="flex-1 gap-2">
            {([`body`, `title`, `chinese`] as const).map((family) => (
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
          <View className={`light-theme ${examplesStackClassName}`} />
          <View className={`dark-theme ${examplesStackClassName}`} />
        </View>
      </ScrollView>
    </View>
  );
}

const typography = tv({
  base: `text-primary-12`,

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
      body: `font-body`,
      title: `font-title`,
      chinese: `font-chinese`,
    },
  },
});

const HanziTextExamples = () => (
  <>
    <ExampleStack title="bare" className="gap-5">
      <View className="items-start border-2 border-dashed border-primary-8">
        <HanziText hanzi="你好" />
      </View>
      <View className="items-start border-2 border-dashed border-primary-8">
        <HanziText hanzi="乚" />
      </View>
    </ExampleStack>

    <ExampleStack title="pinyin" className="gap-5">
      <View className="items-start border-2 border-dashed border-primary-8">
        <HanziText pinyin="nǐhǎo" hanzi="你好" />
      </View>

      <View className="items-start border-2 border-dashed border-primary-8">
        <HanziText pinyin="bie2 de5" hanzi="别的" />
      </View>

      <View className="items-start border-2 border-dashed border-primary-8">
        <HanziText pinyin="yǐ" hanzi="乚" />
      </View>
    </ExampleStack>

    <ExampleStack title="accented" className="gap-5">
      <View className="items-start border-2 border-dashed border-primary-8">
        <HanziText pinyin="nǐhǎo" hanzi="你好" accented />
      </View>

      <View className="items-start border-2 border-dashed border-primary-8">
        <HanziText pinyin="yǐ" hanzi="乚" accented />
      </View>
    </ExampleStack>

    <ExampleStack title="underline" className="gap-5">
      <View className="items-start border-2 border-dashed border-primary-8">
        <HanziText pinyin="nǐhǎo" hanzi="你好" underline />
      </View>

      <View className="items-start border-2 border-dashed border-primary-8">
        <HanziText pinyin="yǐ" hanzi="乚" underline />
      </View>
    </ExampleStack>

    <ExampleStack title="accented + underline" className="gap-5">
      <View className="items-start border-2 border-dashed border-primary-8">
        <HanziText pinyin="nǐhǎo" hanzi="你好" accented underline />
      </View>

      <View className="items-start border-2 border-dashed border-primary-8">
        <HanziText pinyin="yǐ" hanzi="乚" accented underline />
      </View>
    </ExampleStack>
  </>
);

const TypographyExample = ({
  size,
  family,
}: {
  size: `xs` | `sm` | `base` | `lg` | `xl` | `2xl`;
  family: `body` | `title` | `chinese`;
}) => {
  return (
    <View>
      <Text className="font-xs text-primary-9">
        <Text className="text-xs text-primary-11">{size}</Text>
      </Text>

      <Text className={typography({ size, family })} numberOfLines={1}>
        The quick brown fox jumps over the lazy dog.
      </Text>
    </View>
  );
};

const LittlePrimaryHeader = ({ title }: { title: string }) => {
  return (
    <View className="mb-2 mt-4 flex-row items-center gap-2">
      <View className="h-[1px] flex-grow bg-primary-7" />
      <Text className="text-center text-xs font-bold uppercase text-primary-10">
        {title}
      </Text>
      <View className="h-[1px] flex-grow bg-primary-7" />
    </View>
  );
};

const captionLabel = tv({
  base: `text-primary-9 text-xs text-center`,
  variants: {
    highlighted: {
      true: `text-primary-11 font-bold`,
    },
  },
});

const ColorSwatch = ({
  index,
  className,
}: {
  index: number;
  className?: string;
}) => (
  <View className="flex-wrap gap-1">
    <Text className={captionLabel({ highlighted: index === 10 })}>{index}</Text>
    <View className={`h-[40px] w-[40px] ${className ?? ``}`} />
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
        <View className="light-theme flex-1 bg-primary-4 p-2 hover:bg-primary-5">
          <Pressable
            onPress={() => {
              ref.current?.measure((_x, y) => {
                scrollTo(y);
              });
            }}
          >
            <Text className="text-2xl text-text">{title}</Text>
          </Pressable>
        </View>
        <View className="dark-theme flex-1 bg-primary-4 p-2" />
      </View>
      <View className="flex-row">
        <View className={`light-theme ${examplesStackClassName}`}>
          {children}
        </View>
        <View className={`dark-theme ${examplesStackClassName}`}>
          {children}
        </View>
      </View>
    </>
  );
};

const examplesStackClassName = `bg-background flex-1 shrink basis-1 flex-row flex-wrap justify-center gap-2 p-2 sm:justify-start`;

const ExampleStack = ({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title: string;
  className?: string;
}) => (
  <View className={`items-center gap-2 p-2 ${className ?? ``}`}>
    <Text className="text-center text-xs text-primary-10">{title}</Text>
    {children}
  </View>
);

const RectButton2Variants = (props: Partial<PropsOf<typeof RectButton2>>) => (
  <>
    <RectButton2 variant="bare" {...props}>
      Bare
    </RectButton2>
    <RectButton2 variant="outline" {...props}>
      Outline
    </RectButton2>
    <RectButton2 variant="filled" {...props}>
      Filled
    </RectButton2>
  </>
);

const RectButton2Examples = (props: Partial<PropsOf<typeof RectButton2>>) => (
  <View className="flex-1">
    <View className="flex-row flex-wrap">
      <ExampleStack title="normal">
        <RectButton2Variants {...props} />
      </ExampleStack>

      <ExampleStack title="normal (disabled)">
        <RectButton2Variants disabled {...props} />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="accent" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="normal">
        <RectButton2Variants accent {...props} />
      </ExampleStack>

      <View className="success-theme">
        <ExampleStack title="success">
          <RectButton2Variants accent {...props} />
        </ExampleStack>
      </View>

      <View className="danger-theme">
        <ExampleStack title="danger">
          <RectButton2Variants accent {...props} />
        </ExampleStack>
      </View>

      <ExampleStack title="(disabled)">
        <RectButton2Variants accent disabled {...props} />
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-col" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="items-start">
        <View className="w-[120px] flex-col items-start gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-center">
        <View className="w-[120px] flex-col items-center gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-stretch">
        <View className="w-[120px] flex-col items-stretch gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants className="flex-col" {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-end">
        <View className="w-[120px] flex-col items-end gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants {...props} />
        </View>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-col + flex-1" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="items-start">
        <View className="w-[120px] flex-col items-start gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants className="flex-1" {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-center">
        <View className="w-[120px] flex-col items-center gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants className="flex-1" {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-stretch">
        <View className="w-[120px] flex-col items-stretch gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants className="flex-1" {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-end">
        <View className="w-[120px] flex-col items-end gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants className="flex-1" {...props} />
        </View>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-row" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="items-start">
        <View className="h-[100px] flex-row items-start gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants inFlexRowParent {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-center">
        <View className="h-[100px] flex-row items-center gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants inFlexRowParent {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-stretch**">
        <View className="h-[100px] flex-row items-stretch gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants inFlexRowParent {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-end">
        <View className="h-[100px] flex-row items-end gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants inFlexRowParent {...props} />
        </View>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-row + flex-1" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="items-start">
        <View className="h-[100px] flex-row items-start gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants inFlexRowParent className="flex-1" {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-center">
        <View className="h-[100px] flex-row items-center gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants inFlexRowParent className="flex-1" {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-stretch**">
        <View className="h-[100px] flex-row items-stretch gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants inFlexRowParent className="flex-1" {...props} />
        </View>
      </ExampleStack>

      <ExampleStack title="items-end">
        <View className="h-[100px] flex-row items-end gap-2 border-2 border-dashed border-primary-8">
          <RectButton2Variants inFlexRowParent className="flex-1" {...props} />
        </View>
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

      <ExampleStack title="text overflow">
        <View className="h-[120px] w-[120px] gap-2 border-2 border-dashed border-primary-8">
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

    <LittlePrimaryHeader title="flex-col" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="items-start">
        <View className="h-[120px] w-[120px] flex-col items-start gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample />
        </View>
      </ExampleStack>

      <ExampleStack title="items-center">
        <View className="h-[120px] w-[120px] flex-col items-center gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample />
        </View>
      </ExampleStack>

      <ExampleStack title="items-stretch">
        <View className="h-[120px] w-[120px] flex-col gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample />
        </View>
      </ExampleStack>

      <ExampleStack title="items-end">
        <View className="h-[120px] w-[120px] flex-col items-end gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample />
        </View>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-col + flex-1" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="items-start">
        <View className="h-[120px] w-[120px] flex-col items-start gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample className="flex-1" />
        </View>
      </ExampleStack>

      <ExampleStack title="items-center">
        <View className="h-[120px] w-[120px] flex-col items-center gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample className="flex-1" />
        </View>
      </ExampleStack>

      <ExampleStack title="items-stretch">
        <View className="h-[120px] w-[120px] flex-col gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample className="flex-1" />
        </View>
      </ExampleStack>

      <ExampleStack title="items-end">
        <View className="h-[120px] w-[120px] flex-col items-end gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample className="flex-1" />
        </View>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-row" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="items-start">
        <View className="h-[100px] w-[200px] flex-row items-start gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample inFlexRowParent />
        </View>
      </ExampleStack>

      <ExampleStack title="items-center">
        <View className="h-[100px] w-[200px] flex-row items-center gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample inFlexRowParent />
        </View>
      </ExampleStack>

      <ExampleStack title="items-stretch">
        <View className="h-[100px] w-[200px] flex-row gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample inFlexRowParent />
        </View>
      </ExampleStack>

      <ExampleStack title="items-end">
        <View className="h-[100px] w-[200px] flex-row items-end gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample inFlexRowParent />
        </View>
      </ExampleStack>
    </View>

    <LittlePrimaryHeader title="flex-row + flex-1" />

    <View className="flex-row flex-wrap">
      <ExampleStack title="items-start">
        <View className="h-[100px] w-[200px] flex-row items-start gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample inFlexRowParent className="flex-1" />
        </View>
      </ExampleStack>

      <ExampleStack title="items-center">
        <View className="h-[100px] w-[200px] flex-row items-center gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample inFlexRowParent className="flex-1" />
        </View>
      </ExampleStack>

      <ExampleStack title="items-stretch">
        <View className="h-[100px] w-[200px] flex-row gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample inFlexRowParent className="flex-1" />
        </View>
      </ExampleStack>

      <ExampleStack title="items-end">
        <View className="h-[100px] w-[200px] flex-row items-end gap-2 border-2 border-dashed border-primary-8">
          <SyncedAnswerButtonExample inFlexRowParent className="flex-1" />
        </View>
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

function QuizProgressBar2Example() {
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const logCorrect = useCallback(() => {
    setCorrect((prev) => prev + 1);
    setAttempts(0);
  }, []);

  const logIncorrect = useCallback(() => {
    setAttempts((prev) => prev + 1);
  }, []);

  const progress =
    correct +
    // Give a diminishing progress for each attempt.
    (attempts === 0 ? 0 : (Math.log(attempts - 0.5) + 1.9) / 8.7);

  return (
    <>
      <View className="w-full flex-col gap-2">
        <View className="min-h-[32px]">
          <QuizProgressBar2 progress={progress} />
        </View>
        <View className="flex-row items-start gap-4">
          <View className="flex-row items-center gap-2">
            <Text className="font-bold text-primary-10">Answer:</Text>
            <RectButton2 variant="outline" onPress={logCorrect}>
              Correct
            </RectButton2>
            <RectButton2 variant="outline" onPress={logIncorrect}>
              Incorrect
            </RectButton2>
          </View>
        </View>
      </View>
    </>
  );
}
