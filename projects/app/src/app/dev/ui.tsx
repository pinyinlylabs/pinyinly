/* eslint-disable no-console */
import { useQuizProgress } from "@/client/hooks/useQuizProgress";
import { HanziText } from "@/client/ui/HanziText";
import { Hhhmark } from "@/client/ui/Hhhmark";
import { IconImage } from "@/client/ui/IconImage";
import { ImageCloud } from "@/client/ui/ImageCloud";
import { NewSkillModal } from "@/client/ui/NewSkillModal";
import { NewSprout } from "@/client/ui/NewSprout";
import { NewWordTutorial } from "@/client/ui/NewWordTutorial";
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
import { ToggleButton } from "@/client/ui/ToggleButton";
import type { PropsOf } from "@/client/ui/types";
import { Use } from "@/client/ui/Use";
import { WikiHanziWordModal } from "@/client/ui/WikiHanziWordModal";
import { QuestionFlagKind } from "@/data/model";
import { hanziWordToPinyinQuestionOrThrow } from "@/data/questions/hanziWordToPinyin";
import type { RankNumber } from "@/data/skills";
import {
  hanziWordToGloss,
  hanziWordToPinyin,
  hanziWordToPinyinFinal,
  hanziWordToPinyinInitial,
  hanziWordToPinyinTone,
} from "@/data/skills";
import { buildHanziWord } from "@/dictionary/dictionary";
import { subMinutes } from "date-fns/subMinutes";
import { Link } from "expo-router";
import shuffle from "lodash/shuffle";
import type { ReactNode } from "react";
import { StrictMode, useCallback, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tv } from "tailwind-variants";
import { RankLozenge, SkillTile } from "../(menu)/skills";

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
        <Section
          title={`NewWordTutorial` satisfies NameOf<typeof NewWordTutorial>}
          scrollTo={scrollTo}
        >
          <NewWordTutorialExamples />
        </Section>

        <Section title={`Typography`} scrollTo={scrollTo}>
          <TypographyExamples />
        </Section>

        <Section
          title={`Hhhmark` satisfies NameOf<typeof Hhhmark>}
          scrollTo={scrollTo}
        >
          <HhhmarkExamples />
        </Section>

        <Section
          title={`NewSprout` satisfies NameOf<typeof NewSprout>}
          scrollTo={scrollTo}
        >
          <NewSproutExamples />
        </Section>

        <Section
          title={`ImageCloud` satisfies NameOf<typeof ImageCloud>}
          scrollTo={scrollTo}
        >
          <ImageCloudExamples />
        </Section>

        <Section
          title={`ToggleButton` satisfies NameOf<typeof ToggleButton>}
          scrollTo={scrollTo}
        >
          <ToggleButtonExamples />
        </Section>

        <Section
          title={
            `WikiHanziWordModal` satisfies NameOf<typeof WikiHanziWordModal>
          }
          scrollTo={scrollTo}
        >
          <WikiHanziWordModalExamples />
        </Section>

        <Section
          title={`SkillTile` satisfies NameOf<typeof SkillTile>}
          scrollTo={scrollTo}
        >
          <SkillTileExamples />
        </Section>

        <Section
          title={`IconsExample` satisfies NameOf<typeof IconsExample>}
          scrollTo={scrollTo}
        >
          <IconsExample />
        </Section>

        <Section
          title={`QuizFlagText` satisfies NameOf<typeof QuizFlagText>}
          scrollTo={scrollTo}
        >
          <QuizFlagTextExample />
        </Section>

        <Section
          title={`ShootingStars` satisfies NameOf<typeof ShootingStars>}
          scrollTo={scrollTo}
        >
          <ShootingStarsExample />
        </Section>

        <Section
          title={`IconImage` satisfies NameOf<typeof IconImage>}
          scrollTo={scrollTo}
        >
          <IconImageExample />
        </Section>

        <Section
          title={
            `QuizDeckHanziToPinyinQuestion` satisfies NameOf<
              typeof QuizDeckHanziToPinyinQuestion
            >
          }
          scrollTo={scrollTo}
        >
          <QuizDeckHanziToPinyinQuestionExample />
        </Section>

        <Section
          title={
            `PinyinOptionButtonExample` satisfies NameOf<
              typeof PinyinOptionButtonExample
            >
          }
          scrollTo={scrollTo}
        >
          <PinyinOptionButtonExample />
        </Section>

        <Section
          title={
            `TextInputSingleExample` satisfies NameOf<
              typeof TextInputSingleExample
            >
          }
          scrollTo={scrollTo}
        >
          <TextInputSingleExample />
        </Section>

        <Section
          title={`QuizQueueButton` satisfies NameOf<typeof QuizQueueButton>}
          scrollTo={scrollTo}
        >
          <QuizQueueButtonExample />
        </Section>

        <Section
          title={`QuizProgressBar` satisfies NameOf<typeof QuizProgressBar>}
          scrollTo={scrollTo}
        >
          <QuizProgressBarExample />
        </Section>

        <Section
          title={`HanziText` satisfies NameOf<typeof HanziText>}
          scrollTo={scrollTo}
        >
          <HanziTextExamples />
        </Section>

        <Section title="TextAnswerButton" scrollTo={scrollTo}>
          <TextAnswerButtonExamples />
        </Section>

        <Section title="RectButton" scrollTo={scrollTo}>
          <RectButtonExamples />
        </Section>

        <Section title="Colors" scrollTo={scrollTo}>
          <ColorPalette />
        </Section>

        <Section
          title={
            `NewSkillModalExamples` satisfies NameOf<
              typeof NewSkillModalExamples
            >
          }
          scrollTo={scrollTo}
        >
          <NewSkillModalExamples />
        </Section>

        {/* Fill the rest of the page if it's too tall for the content */}
        <View className="flex-1 flex-row">
          <View
            className={`
              hhh-color-schema-light theme-default

              ${examplesStackClassName}
            `}
          />
          <View
            className={`
              hhh-color-scheme-dark theme-default

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

const TypographyExamples = () => {
  const themes = `theme-default theme-success theme-danger theme-accent`.split(
    ` `,
  );
  return (
    <View className="flex-1 gap-3">
      {[
        `hhh-body-title`,
        `hhh-body-heading`,
        `hhh-body-2xl`,
        `hhh-body`,
        `hhh-body-caption`,
        `hhh-body-dt`,
        `hhh-body-input`,
      ].flatMap((family) => (
        <View key={family}>
          <Text className="hhh-dev-dt">{family}</Text>
          {themes.map((theme) => (
            <View
              key={theme}
              className="flex-row items-center justify-between gap-2"
            >
              <Text
                className={`
                  ${family}
                  ${theme}

                  truncate
                `}
              >
                {/* It's important to make sure that utilities like `font-bold` and `font-italic` combine correctly with the `hhh-` text component styles. */}
                Lorem ipsum <Text className="hhh-bold">hhh-bold</Text> and
                {` `}
                <Text className="hhh-italic">hhh-italic</Text> and{` `}
                <Text className="hhh-ref">hhh-ref 好 good</Text>.
              </Text>
              <View className="shrink-0 grow-0">
                <Text className="hhh-dev-dt opacity-50">{theme}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const LittlePrimaryHeader = ({ title }: { title: string }) => {
  return (
    <View className="mb-2 mt-4 flex-row items-center gap-2">
      <View className="h-px grow bg-bg-1" />
      <Text className="hhh-dev-dt text-center">{title}</Text>
      <View className="h-px grow bg-bg-1" />
    </View>
  );
};

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
            hhh-color-schema-light theme-default flex-1 bg-bg/90 p-2

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
        <View className="hhh-color-scheme-dark flex-1 bg-bg-1 p-2" />
      </View>
      <View className="flex-row">
        <View
          className={`
            hhh-color-schema-light theme-default

            ${examplesStackClassName}
          `}
        >
          {children}
        </View>
        <View
          className={`
            hhh-color-scheme-dark theme-default

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
    <Text className="hhh-dev-dt text-center">{title}</Text>
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
      // eslint-disable-next-line @pinyinly/no-restricted-css-classes
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
      // eslint-disable-next-line @pinyinly/no-restricted-css-classes
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
      // eslint-disable-next-line @pinyinly/no-restricted-css-classes
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
      // eslint-disable-next-line @pinyinly/no-restricted-css-classes
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
        <QuizProgressBar progress={3} />
      </View>
      <View className="min-h-[32px]">
        <QuizProgressBar progress={11} />
      </View>
      <View className="min-h-[32px]">
        <QuizProgressBar progress={quizProgress.progress} />
      </View>
      <View className="flex-row items-start gap-4">
        <View className="flex-row items-center gap-2">
          <Text className="hhh-dev-dt">Answer:</Text>
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

function ColorPalette() {
  const bgColors = [
    `bg-red`,
    `bg-orange`,
    `bg-amber`,
    `bg-yellow`,
    `bg-lime`,
    `bg-wasabi`,
    `bg-green`,
    `bg-emerald`,
    `bg-teal`,
    `bg-cyan`,
    `bg-cyanold`,
    `bg-sky`,
    `bg-blue`,
    `bg-indigo`,
    `bg-violet`,
    `bg-purple`,
    `bg-fuchsia`,
    `bg-pink`,
    `bg-rose`,
    `bg-brick`,
    `bg-slate`,
    `bg-gray`,
    `bg-zinc`,
    `bg-neutral`,
    `bg-stone`,
    `bg-cloud`,
    `bg-ink`,
    `bg-ink-1`,
    `bg-fg`,
    `bg-bg-1`,
  ];
  const opacities = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  const columnLabels = (
    <View
      className={`
        flex-row gap-2

        [.hhh-color-scheme-dark_&]:flex-row-reverse
      `}
    >
      {opacities.map((o, i) => (
        <View key={i} className="w-9 items-center justify-center">
          <Text className="hhh-dev-dt">
            <Text className="text-fg/20">/</Text>
            {o * 100}
          </Text>
        </View>
      ))}
    </View>
  );
  return (
    <View
      className={`
        flex-1 items-end

        [.hhh-color-scheme-dark_&]:items-start
      `}
    >
      <View
        className={`
          flex-row gap-4

          [.hhh-color-scheme-dark_&]:flex-row-reverse
        `}
      >
        <View
          className={`
            items-end gap-2

            [.hhh-color-scheme-dark_&]:items-start
          `}
        >
          <View>
            <Text className="invisible text-xs">Colors</Text>
          </View>
          {bgColors.map((bgColor) => (
            <View key={bgColor} className={`h-9 justify-center`}>
              <Text className="hhh-dev-dt text-fg">
                {bgColor.replace(`bg-`, ``)}
              </Text>
            </View>
          ))}
        </View>
        <View className="gap-2">
          {columnLabels}
          {bgColors.map((bgColor) => (
            <View
              key={bgColor}
              className={`
                flex-row gap-2

                [.hhh-color-scheme-dark_&]:flex-row-reverse
              `}
            >
              {opacities.map((opacity, index) => (
                <View
                  className={`
                    size-9 rounded-lg

                    ${bgColor}
                  `}
                  key={index}
                  style={{ opacity }}
                />
              ))}
            </View>
          ))}
          {columnLabels}
        </View>
      </View>
    </View>
  );
}

function NewSkillModalExamples() {
  return (
    <>
      <View>
        <NewSkillModal
          skill={hanziWordToPinyin(`你好:hello`)}
          devUiSnapshotMode
        />
      </View>
      <View>
        <NewSkillModal
          skill={hanziWordToPinyinInitial(`你好:hello`)}
          devUiSnapshotMode
        />
      </View>
      <View>
        <NewSkillModal
          skill={hanziWordToPinyinFinal(`你好:hello`)}
          devUiSnapshotMode
        />
      </View>
      <View>
        <NewSkillModal
          skill={hanziWordToPinyinTone(`你好:hello`)}
          devUiSnapshotMode
        />
      </View>
      <View>
        <NewSkillModal
          skill={hanziWordToGloss(`你好:hello`)}
          devUiSnapshotMode
        />
      </View>
    </>
  );
}

function SkillTileExamples() {
  return (
    <>
      {([0, 1, 2, 3, 4] as RankNumber[]).map((rank) => (
        <View key={rank} className="gap-2">
          <RankLozenge rank={rank} />
          {[0, 0.1, 0.5, 0.9].map((completion) => (
            <SkillTile
              key={`${rank}-${completion}`}
              hanziWord={`你好:hello`}
              gloss={`hello`}
              rank={rank}
              completion={completion}
            />
          ))}
        </View>
      ))}
    </>
  );
}

function WikiHanziWordModalExamples() {
  return (
    <>
      <View>
        <WikiHanziWordModal
          devUiSnapshotMode
          hanziWord={`你好:hello`}
          onDismiss={() => null}
        />
      </View>
    </>
  );
}

function ToggleButtonExamples() {
  const [isActive1, setIsActive1] = useState(false);
  const [isActive2, setIsActive2] = useState(true);
  return (
    <>
      <ExampleStack title="loading">
        <ToggleButton isActive={null} onPress={() => null} />
      </ExampleStack>
      <ExampleStack title="on">
        <ToggleButton
          isActive={isActive1}
          onPress={() => {
            setIsActive1((prev) => !prev);
          }}
        />
      </ExampleStack>
      <ExampleStack title="off">
        <ToggleButton
          isActive={isActive2}
          onPress={() => {
            setIsActive2((prev) => !prev);
          }}
        />
      </ExampleStack>
    </>
  );
}

function ImageCloudExamples() {
  return <ImageCloud className="h-[320px] w-[415px]" />;
}

function NewSproutExamples() {
  return <NewSprout className="h-[320px] w-[415px]" />;
}

function HhhmarkExamples() {
  return (
    <View className="gap-2">
      {(
        [
          `hhh-body-title`,
          `hhh-body-2xl`,
          `hhh-body`,
          `hhh-body-caption`,
        ] as const
      ).map((textClass) => (
        <View className="flex-row items-center gap-2" key={textClass}>
          <Text className="hhh-dev-dt w-[128px] text-right">{textClass}</Text>
          <Text
            className={`
              w-[250px]

              ${textClass}
            `}
          >
            <Hhhmark source="Some **bold text** and *italic text* and {好:good} and another line of plain text." />
          </Text>
        </View>
      ))}
    </View>
  );
}

function NewWordTutorialExamples() {
  const [rerenderCount, setRerenderCount] = useState(0);

  return (
    <View className="flex-1 items-center justify-center gap-4">
      <NewWordTutorial
        className="h-[800px] w-[420px] rounded-xl border border-fg/20"
        key={rerenderCount}
      />
      <RectButton
        variant="bare"
        onPress={() => {
          setRerenderCount((prev) => prev + 1);
        }}
      >
        Restart
      </RectButton>
    </View>
  );
}
