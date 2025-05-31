import { useHanziWordMeaning } from "@/client/hooks/useHanziWordMeaning";
import type {
  HanziToPinyinQuestion,
  MistakeType,
  NewSkillRating,
  QuestionFlagType,
} from "@/data/model";
import { QuestionFlagKind, SkillKind } from "@/data/model";
import { parsePinyinTone } from "@/data/pinyin";
import type { HanziWordSkill, Skill } from "@/data/rizzleSchema";
import { hanziWordFromSkill, skillKindFromSkill } from "@/data/skills";
import { readonlyMapSet } from "@/util/collections";
import { formatDuration } from "date-fns/formatDuration";
import { intervalToDuration } from "date-fns/intervalToDuration";
import { Image } from "expo-image";
import type { ReactNode, Ref } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StyleProp, TextInput, ViewStyle } from "react-native";
import {
  // eslint-disable-next-line @typescript-eslint/no-restricted-imports
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tv } from "tailwind-variants";
import z from "zod/v4";
import { HanziWordRefText } from "./HanziWordRefText";
import { Hhhmark } from "./Hhhmark";
import { NewSkillModal } from "./NewSkillModal";
import { PinyinOptionButton } from "./PinyinOptionButton";
import { RectButton2 } from "./RectButton2";
import { TextInputSingle } from "./TextInputSingle";
import type { PropsOf } from "./types";

export function QuizDeckHanziToPinyinQuestion({
  question,
  onNext,
}: {
  question: HanziToPinyinQuestion;
  onNext: () => void;
  onRating: (ratings: NewSkillRating[], mistakes: MistakeType[]) => void;
}) {
  const { prompt, skill, flag, answer } = question;

  const isCorrect = null as boolean | null;

  const [focusedCharIndex, setFocusedCharIndex] = useState<number | null>(null);
  const [pinyinByIndex, setPinyinByIndex] = useState<
    ReadonlyMap<number, string>
  >(new Map());

  const handleSubmit = () => {
    onNext();
  };

  const handlePinyinSearchFocus = () => {
    setFocusedCharIndex((prev) => prev ?? 0);
  };

  const handlePinyinSearchSelect = (pinyin: string) => {
    if (focusedCharIndex == null) {
      return;
    }

    setPinyinByIndex((prev) => readonlyMapSet(prev, focusedCharIndex, pinyin));

    setFocusedCharIndex((prev) => {
      if (prev == null) {
        return null;
      }

      // Move focus to the next character without pinyin
      for (let offset = 1; offset < answer.length; offset++) {
        const index = (prev + offset) % answer.length;
        if (!pinyinByIndex.has(index)) {
          // Found the next character without pinyin
          return index;
        }
      }

      return null;
    });
  };

  const handleFocusRequest = (index: number) => {
    setFocusedCharIndex(index);
    inputRef.current?.focus();
  };

  let initialPinyinSearchQuery = ``;
  if (focusedCharIndex != null) {
    const pinyin = pinyinByIndex.get(focusedCharIndex);
    const searchQuery = pinyin == null ? null : parsePinyinTone(pinyin)?.[0];
    initialPinyinSearchQuery = searchQuery ?? ``;
  }

  const isMissingAnswers = pinyinByIndex.size < answer.length;

  const inputRef = useRef<TextInput>(null);

  return (
    <Skeleton
      toast={
        isCorrect == null ? null : (
          <View
            className={`flex-1 ${isCorrect ? `success-theme2` : `danger-theme2`} gap-[12px] overflow-hidden bg-body-bg10 px-quiz-px pt-3 pb-safe-offset-[84px] lg:mb-2 lg:rounded-xl`}
          >
            {isCorrect ? (
              <View className="flex-row items-center gap-[8px]">
                <Image
                  className="size-[32px] shrink text-body"
                  source={require(`@/assets/icons/check-circled-filled.svg`)}
                  tintColor="currentColor"
                />
                <Text className="text-2xl font-bold text-body">Nice!</Text>
              </View>
            ) : (
              <>
                <View className="flex-row items-center gap-[8px]">
                  <Image
                    className="size-[32px] shrink text-body"
                    source={require(`@/assets/icons/close-circled-filled.svg`)}
                    tintColor="currentColor"
                  />
                  <Text className="text-2xl font-bold text-body">
                    Incorrect
                  </Text>
                </View>
                <Text className="text-xl/none font-medium text-body">
                  Correct answer:
                </Text>

                <SkillAnswer skill={skill} includeHint includeAlternatives />
              </>
            )}
          </View>
        )
      }
      submitButton={
        <SubmitButton
          state={
            isMissingAnswers
              ? SubmitButtonState.Disabled
              : isCorrect == null
                ? SubmitButtonState.Check
                : isCorrect
                  ? SubmitButtonState.Correct
                  : SubmitButtonState.Incorrect
          }
          onPress={handleSubmit}
        />
      }
    >
      {flag?.kind === QuestionFlagKind.NewSkill ? (
        <NewSkillModal passivePresentation skill={skill} />
      ) : null}

      {flag == null ? null : <FlagText flag={flag} />}
      <View>
        <Text className="text-xl font-bold text-body">{prompt}</Text>
      </View>
      <View className="flex-1 justify-center py-quiz-px">
        <View className="flex-row justify-center gap-2">
          {answer.map(([hanzi], i) => (
            <HanziPinyinAnswerBox
              key={i}
              focused={i === focusedCharIndex}
              hanzi={hanzi}
              index={i}
              onFocusRequest={handleFocusRequest}
              selectedPinyin={pinyinByIndex.get(i)}
            />
          ))}
        </View>
        <View className="min-h-12 flex-1" />
        <View className={focusedCharIndex == null ? `hhh-hidden` : ``}>
          <PinyinSearchInput
            key={focusedCharIndex}
            autoFocus={focusedCharIndex != null}
            initialQuery={initialPinyinSearchQuery}
            onFocus={handlePinyinSearchFocus}
            onSelect={handlePinyinSearchSelect}
            inputRef={inputRef}
          />
        </View>
      </View>
    </Skeleton>
  );
}

function HanziPinyinAnswerBox({
  focused,
  hanzi,
  index,
  onFocusRequest,
  selectedPinyin,
}: {
  focused: boolean;
  hanzi: string;
  index: number;
  onFocusRequest: (index: number) => void;
  selectedPinyin: string | undefined;
}) {
  const handlePress = () => {
    onFocusRequest(index);
  };

  return (
    <View className="items-center gap-2">
      <Text className="text-[80px] font-medium text-body">{hanzi}</Text>
      <View className={`h-[40px] ${focused ? `` : ``}`}>
        {selectedPinyin == null || focused ? (
          <Pressable
            className={pinyinPlaceholderClass({ focused })}
            onPress={handlePress}
          />
        ) : (
          <RectButton2 variant="option" onPress={handlePress}>
            {selectedPinyin}
          </RectButton2>
        )}
      </View>
    </View>
  );
}

interface PinyinSearchInputOption {
  pinyin: string;
  shortcutKey: string;
}

const PinyinSearchInput = ({
  autoFocus,
  initialQuery,
  inputRef,
  onFocus,
  onSelect,
}: {
  autoFocus: boolean;
  initialQuery: string;
  inputRef?: Ref<TextInput>;
  onFocus: () => void;
  onSelect: (pinyin: string) => void;
}) => {
  const [query, setQuery] = useState(initialQuery);

  const options: PinyinSearchInputOption[] | null = query.startsWith(`ni`)
    ? [
        { pinyin: `nī`, shortcutKey: `1` },
        { pinyin: `ní`, shortcutKey: `2` },
        { pinyin: `nǐ`, shortcutKey: `3` },
        { pinyin: `nì`, shortcutKey: `4` },
        { pinyin: `ni`, shortcutKey: `5` },
      ]
    : null;

  const handleQueryChange = (text: string) => {
    setQuery(text);

    if (options != null) {
      for (const option of options) {
        if (option.shortcutKey === text.slice(-1)) {
          onSelect(option.pinyin);
        }
      }
    }
  };

  const handleOptionPress = (pinyin: string) => {
    onSelect(pinyin);
  };

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap justify-center gap-2">
        {hiddenPlaceholderOptions}
        <View className="absolute inset-0 flex-row flex-wrap content-end justify-center gap-2">
          {options?.map((option, i) => (
            <Reanimated.View
              key={i}
              // entering={SlideInDown.springify()
              //   .delay(i * 100)
              //   .withInitialValues({ transform: [{ translateY: 20 }] })
              //   .damping(30)
              //   .mass(5)
              //   .stiffness(10)
              //   // .overshootClamping(false)
              //   .restDisplacementThreshold(0.1)
              //   .restSpeedThreshold(5)}
              // entering={BounceIn.delay(i * 100)}
              entering={FadeIn.duration(100)}
              exiting={FadeOut.duration(100)}
            >
              <PinyinOptionButton
                pinyin={option.pinyin}
                shortcutKey={option.shortcutKey}
                onPress={handleOptionPress}
              />
            </Reanimated.View>
          ))}
        </View>
      </View>
      <TextInputSingle
        autoFocus={autoFocus}
        onChangeText={handleQueryChange}
        onFocus={onFocus}
        placeholder="Search pinyin"
        ref={inputRef}
        value={query}
      />
    </View>
  );
};

// Reserve the space
const hiddenPlaceholderOptions = (
  <>
    <PinyinOptionButton
      pinyin="xxxxxx"
      shortcutKey="x"
      className="hhh-hidden"
    />
    <PinyinOptionButton
      pinyin="xxxxxx"
      shortcutKey="x"
      className="hhh-hidden"
    />
    <PinyinOptionButton
      pinyin="xxxxxx"
      shortcutKey="x"
      className="hhh-hidden"
    />
    <PinyinOptionButton
      pinyin="xxxxxx"
      shortcutKey="x"
      className="hhh-hidden"
    />
    <PinyinOptionButton
      pinyin="xxxxxx"
      shortcutKey="x"
      className="hhh-hidden"
    />
  </>
);

const FlagText = ({ flag }: { flag: QuestionFlagType }) => {
  switch (flag.kind) {
    case QuestionFlagKind.NewSkill: {
      return (
        <View className={flagViewClass({ class: `success-theme` })}>
          <Image
            source={require(`@/assets/icons/plant-filled.svg`)}
            className={flagIconClass()}
            tintColor="currentColor"
          />
          <Text className={flagTextClass()}>New skill</Text>
        </View>
      );
    }
    case QuestionFlagKind.Overdue: {
      return (
        <View className={flagViewClass({ class: `danger-theme` })}>
          <Image
            source={require(`@/assets/icons/alarm.svg`)}
            className={flagIconClass()}
            tintColor="currentColor"
          />
          <Text className={flagTextClass()}>
            Overdue by{` `}
            {
              formatDuration(intervalToDuration(flag.interval), {
                format: [
                  `years`,
                  `months`,
                  `weeks`,
                  `days`,
                  `hours`,
                  `minutes`,
                ],
                zero: false,
                delimiter: `, `,
              }).split(`, `)[0]
            }
          </Text>
        </View>
      );
    }
    case QuestionFlagKind.Retry: {
      return (
        <View className={flagViewClass({ class: `warning-theme` })}>
          <Image
            source={require(`@/assets/icons/repeat.svg`)}
            className={flagIconClass()}
            tintColor="currentColor"
          />
          <Text className={flagTextClass()}>Previous mistake</Text>
        </View>
      );
    }
    case QuestionFlagKind.WeakWord: {
      return (
        <View className={flagViewClass({ class: `danger-theme` })}>
          <Image
            source={require(`@/assets/icons/flag.svg`)}
            className={flagIconClass()}
            tintColor="currentColor"
          />
          <Text className={flagTextClass()}>Weak word</Text>
        </View>
      );
    }
  }
};

const pinyinPlaceholderClass = tv({
  base: `h-[40px] w-[60px] rounded-xl border-2 border-dashed border-body/50`,
  variants: {
    focused: {
      true: `accent-theme2`,
    },
  },
});

const flagViewClass = tv({
  base: `flex-row items-center gap-1`,
});

const flagIconClass = tv({
  base: `size-[24px] flex-shrink text-accent-10`,
});

const flagTextClass = tv({
  base: `font-bold uppercase text-accent-10`,
});

const SkillAnswer = ({
  skill,
  includeHint = false,
}: {
  skill: Skill;
  includeAlternatives?: boolean;
  includeHint?: boolean;
  hideA?: boolean;
  hideB?: boolean;
  small?: boolean;
}) => {
  switch (skillKindFromSkill(skill)) {
    case SkillKind.Deprecated_EnglishToRadical:
    case SkillKind.Deprecated_PinyinToRadical:
    case SkillKind.Deprecated_RadicalToEnglish:
    case SkillKind.Deprecated_RadicalToPinyin:
    case SkillKind.Deprecated:
    case SkillKind.GlossToHanziWord:
    case SkillKind.ImageToHanziWord:
    case SkillKind.PinyinFinalAssociation:
    case SkillKind.PinyinInitialAssociation:
    case SkillKind.PinyinToHanziWord: {
      throw new Error(
        `ShowSkillAnswer not implemented for ${skillKindFromSkill(skill)}`,
      );
    }
    case SkillKind.HanziWordToGloss: {
      skill = skill as HanziWordSkill;
      return (
        <HanziWordToGlossSkillAnswer skill={skill} includeHint={includeHint} />
      );
    }
    case SkillKind.HanziWordToPinyin:
    case SkillKind.HanziWordToPinyinFinal:
    case SkillKind.HanziWordToPinyinInitial:
    case SkillKind.HanziWordToPinyinTone: {
      skill = skill as HanziWordSkill;
      return <HanziWordToPinyinSkillAnswer skill={skill} />;
    }
  }
};

const HanziWordToGlossSkillAnswer = ({
  skill,
  includeHint = false,
}: {
  skill: HanziWordSkill;
  includeHint?: boolean;
}) => {
  const hanziWord = hanziWordFromSkill(skill);
  const meaningQuery = useHanziWordMeaning(hanziWord);

  return (
    <>
      <Hhhmark source={`{${hanziWord}}`} context="body-2xl" />

      {includeHint && meaningQuery.data?.glossHint != null ? (
        <Hhhmark source={meaningQuery.data.glossHint} context="caption" />
      ) : null}
    </>
  );
};

const HanziWordToPinyinSkillAnswer = ({ skill }: { skill: HanziWordSkill }) => {
  const hanziWord = hanziWordFromSkill(skill);

  return (
    <HanziWordRefText hanziWord={hanziWord} showPinyin context="body-2xl" />
  );
};

const Skeleton = ({
  children,
  toast,
  submitButton,
}: {
  children: ReactNode;
  toast: ReactNode | null;
  submitButton: ReactNode;
}) => {
  const insets = useSafeAreaInsets();
  const submitButtonHeight = 44;
  const submitButtonInsetBottom = insets.bottom + 20;
  const contentInsetBottom = submitButtonInsetBottom + 5 + submitButtonHeight;

  const [slideInAnim] = useState(() => new Animated.Value(0));
  const hasToast = toast !== null;

  useEffect(() => {
    if (hasToast) {
      Animated.timing(slideInAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.exp),
        useNativeDriver: false, // layout properties aren't compatible with the native driver on mobile (it works on Web though)
      }).start();
    } else {
      Animated.timing(slideInAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: false,
      }).start();
    }
  }, [slideInAnim, hasToast]);

  const slideInStyle: StyleProp<ViewStyle> = useMemo(
    () =>
      Platform.OS === `web`
        ? {
            // On web the `bottom: <percent>%` approach doesn't work when the
            // parent is `position: absolute`. But using `translateY: <percent>%`
            // DOES work (but this doesn't work on mobile native because only
            // pixel values are accepted).
            transform: [
              {
                translateY: slideInAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [`100%`, `0%`],
                }),
              },
            ],
          }
        : {
            position: `relative`,
            bottom: slideInAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [`-100%`, `0%`],
            }),
          },
    [slideInAnim],
  );

  return (
    <>
      <View
        className="flex-1 px-quiz-px"
        style={{ paddingBottom: contentInsetBottom }}
      >
        {children}
      </View>
      {toast === null ? null : (
        <View className="absolute inset-x-0 bottom-0">
          <Animated.View style={slideInStyle}>{toast}</Animated.View>
        </View>
      )}
      <View
        className="absolute inset-x-quiz-px flex-row items-stretch"
        style={{
          bottom: submitButtonInsetBottom,
          height: submitButtonHeight,
        }}
      >
        {submitButton}
      </View>
    </>
  );
};

const submitButtonStateSchema = z.enum({
  Disabled: `Disabled`,
  Check: `Check`,
  Correct: `Correct`,
  Incorrect: `Incorrect`,
});

const SubmitButtonState = submitButtonStateSchema.enum;
type SubmitButtonState = z.infer<typeof submitButtonStateSchema>;

function SubmitButton({
  state,
  onPress,
  ref,
}: {
  state: SubmitButtonState;
} & Pick<PropsOf<typeof RectButton2>, `onPress` | `ref`>) {
  let text;

  switch (state) {
    case SubmitButtonState.Disabled:
    case SubmitButtonState.Check: {
      text = `Check`;
      break;
    }
    case SubmitButtonState.Correct: {
      text = `Continue`;
      break;
    }
    case SubmitButtonState.Incorrect: {
      text = `Got it`;
      break;
    }
  }

  return (
    <RectButton2
      variant="filled"
      ref={ref}
      disabled={state === SubmitButtonState.Disabled}
      className={`flex-1 ${state === SubmitButtonState.Disabled ? `` : state === SubmitButtonState.Incorrect ? `danger-theme2` : `success-theme2`}`}
      onPress={state === SubmitButtonState.Disabled ? undefined : onPress}
    >
      {text}
    </RectButton2>
  );
}
