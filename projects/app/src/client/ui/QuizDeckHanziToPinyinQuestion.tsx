import { useHanziWordMeaning } from "@/client/hooks/useHanziWordMeaning";
import { splitHanziText } from "@/data/hanzi";
import { hanziToPinyinQuestionMistakes } from "@/data/mistakes";
import type {
  HanziToPinyinQuestion,
  MistakeType,
  NewSkillRating,
  PinyinPronunciation,
} from "@/data/model";
import { SkillKind } from "@/data/model";
import { parsePinyinSyllableTone, pinyinSyllableSearch } from "@/data/pinyin";
import type { HanziWordSkill, Skill } from "@/data/rizzleSchema";
import {
  computeSkillRating,
  hanziWordFromSkill,
  skillKindFromSkill,
} from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary/dictionary";
import { readonlyMapSet } from "@/util/collections";
import { nonNullable } from "@haohaohow/lib/invariant";
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
import { HanziWordRefText } from "./HanziWordRefText";
import { Hhhmark } from "./Hhhmark";
import { PinyinOptionButton } from "./PinyinOptionButton";
import { QuizFlagText } from "./QuizFlagText";
import { QuizSubmitButton, QuizSubmitButtonState } from "./QuizSubmitButton";
import { TextAnswerButton } from "./TextAnswerButton";
import { TextInputSingle } from "./TextInputSingle";

export function QuizDeckHanziToPinyinQuestion({
  noAutoFocus = true,
  question,
  onNext,
  onRating,
}: {
  noAutoFocus?: boolean;
  question: HanziToPinyinQuestion;
  onNext: () => void;
  onRating: (ratings: NewSkillRating[], mistakes: MistakeType[]) => void;
}) {
  const { skill, flag, answers } = question;

  const [grade, setGrade] = useState<{
    correct: boolean;
    expectedAnswer: Readonly<PinyinPronunciation>;
  }>();
  const [focusedCharIndex, setFocusedCharIndex] = useState<number | null>(0);
  const [userAnswersByIndex, setUserAnswersByIndex] = useState<
    ReadonlyMap<number, string>
  >(new Map());
  const startTime = useMemo(() => Date.now(), []);
  const hanziChars = splitHanziText(
    hanziFromHanziWord(hanziWordFromSkill(skill)),
  );

  const submit = (userAnswersByIndex: ReadonlyMap<number, string>) => {
    // First time you press the button it will grade your answer, the next time
    // it moves you to the next question.
    if (grade == null) {
      const userAnswer = hanziChars.map(
        (_, i) => userAnswersByIndex.get(i)?.trim() ?? ``,
      );

      if (!userAnswer.every((p) => p.length > 0)) {
        // all pinyin answers must be filled in to submit.
        return;
      }

      setFocusedCharIndex(null);

      const expectedAnswer =
        answers.find((answer) =>
          answer.every((pinyin, i) => userAnswer[i] === pinyin),
        ) ?? nonNullable(answers[0]);

      const correct = expectedAnswer.every(
        (pinyin, i) => userAnswer[i] === pinyin,
      );

      const mistakes = correct
        ? []
        : hanziToPinyinQuestionMistakes(question, userAnswer);

      const durationMs = Date.now() - startTime;

      const skillRatings: NewSkillRating[] = [
        computeSkillRating({
          skill,
          correct,
          durationMs,
        }),
      ];

      setGrade({ correct, expectedAnswer });
      onRating(skillRatings, mistakes);
    } else {
      onNext();
    }
  };

  let initialPinyinSearchQuery = ``;
  if (focusedCharIndex != null) {
    const pinyin = userAnswersByIndex.get(focusedCharIndex);
    const searchQuery =
      pinyin == null ? null : parsePinyinSyllableTone(pinyin)?.tonelessPinyin;
    initialPinyinSearchQuery = searchQuery ?? ``;
  }

  const isMissingAnswers = userAnswersByIndex.size < hanziChars.length;

  const inputRef = useRef<TextInput>(null);

  return (
    <Skeleton
      toast={
        grade == null ? null : (
          <View
            className={`
              flex-1 gap-[12px] overflow-hidden bg-foreground-bg10 px-quiz-px pt-3
              pb-safe-offset-[84px]

              lg:mb-2 lg:rounded-xl

              ${grade.correct ? `success-theme2` : `danger-theme2`}
            `}
          >
            {grade.correct ? (
              <View className="flex-row items-center gap-[8px]">
                <Image
                  className="size-[32px] shrink text-foreground"
                  source={require(`@/assets/icons/check-circled-filled.svg`)}
                  tintColor="currentColor"
                />
                <Text className="text-2xl font-bold text-foreground">
                  Nice!
                </Text>
              </View>
            ) : (
              <>
                <View className="flex-row items-center gap-[8px]">
                  <Image
                    className="size-[32px] shrink text-foreground"
                    source={require(`@/assets/icons/close-circled-filled.svg`)}
                    tintColor="currentColor"
                  />
                  <Text className="text-2xl font-bold text-foreground">
                    Incorrect
                  </Text>
                </View>
                <Text className="text-xl/none font-medium text-foreground">
                  Correct answer:
                </Text>

                <SkillAnswer skill={skill} includeHint includeAlternatives />
              </>
            )}
          </View>
        )
      }
      submitButton={
        <QuizSubmitButton
          autoFocus={grade != null}
          state={
            isMissingAnswers
              ? QuizSubmitButtonState.Disabled
              : grade == null
                ? QuizSubmitButtonState.Check
                : grade.correct
                  ? QuizSubmitButtonState.Correct
                  : QuizSubmitButtonState.Incorrect
          }
          onPress={() => {
            submit(userAnswersByIndex);
          }}
        />
      }
    >
      {flag == null ? null : <QuizFlagText flag={flag} />}
      <View>
        <Text className="text-xl font-bold text-foreground">
          What sound does this make?
        </Text>
      </View>
      <View className="flex-1 justify-center py-quiz-px">
        <View className="flex-1" />
        <View className="flex-row justify-center gap-2">
          {hanziChars.map((hanzi, i) => {
            const correct =
              grade == null
                ? null
                : userAnswersByIndex.get(i) === grade.expectedAnswer[i];
            return (
              <HanziPinyinAnswerBox
                key={i}
                focused={i === focusedCharIndex}
                correct={correct}
                hanzi={hanzi}
                index={i}
                onFocusRequest={(index) => {
                  // Don't allow focusing an input after the question is graded.
                  if (grade != null) {
                    return;
                  }
                  setFocusedCharIndex(index);
                  inputRef.current?.focus();
                }}
                userAnswer={userAnswersByIndex.get(i) ?? ``}
              />
            );
          })}
        </View>
        <View className="min-h-12 flex-1" />
        <View className={focusedCharIndex == null ? `hhh-hidden` : ``}>
          <PinyinSearchInput
            key={focusedCharIndex}
            autoFocus={!noAutoFocus && focusedCharIndex != null}
            initialQuery={initialPinyinSearchQuery}
            onChange={(event, text) => {
              if (focusedCharIndex == null) {
                return;
              }
              const newUserAnswers = readonlyMapSet(
                userAnswersByIndex,
                focusedCharIndex,
                text,
              );
              setUserAnswersByIndex(newUserAnswers);

              if (event === `submit`) {
                submit(newUserAnswers);
              } else if (event === `next`) {
                let nextFocusedCharIndex: number | null = null;

                // Find the next empty input.
                for (let offset = 1; offset < hanziChars.length; offset++) {
                  const index = (focusedCharIndex + offset) % hanziChars.length;
                  if ((newUserAnswers.get(index) ?? ``) === ``) {
                    nextFocusedCharIndex = index;
                    break;
                  }
                }

                setFocusedCharIndex(nextFocusedCharIndex);
              }
            }}
            onFocus={() => {
              setFocusedCharIndex((prev) => prev ?? 0);
            }}
            inputRef={inputRef}
          />
        </View>
      </View>
    </Skeleton>
  );
}

function HanziPinyinAnswerBox({
  focused,
  correct,
  hanzi,
  index,
  onFocusRequest,
  userAnswer,
}: {
  focused: boolean;
  correct: boolean | null;
  hanzi: string;
  index: number;
  onFocusRequest: (index: number) => void;
  userAnswer: string;
}) {
  const handlePress = () => {
    onFocusRequest(index);
  };

  return (
    <View className="items-center gap-2">
      <Text className="text-[80px] font-medium text-foreground">{hanzi}</Text>
      <View className={`h-[40px]`}>
        {userAnswer === `` || focused ? (
          <Pressable
            className={pinyinPlaceholderClass({ focused })}
            onPress={handlePress}
          >
            <Text className="hhh-text-button-option">{userAnswer}</Text>
          </Pressable>
        ) : (
          <TextAnswerButton
            // variant={
            //   correct == null ? `option` : correct ? `filled` : `outline`
            // }
            state={correct == null ? `default` : correct ? `success` : `error`}
            onPress={handlePress}
            text={userAnswer}
          />
        )}
      </View>
    </View>
  );
}

type PinyinSearchInputEvent = `change` | `next` | `submit`;

const PinyinSearchInput = ({
  autoFocus,
  initialQuery,
  inputRef,
  onFocus,
  onChange,
}: {
  autoFocus: boolean;
  initialQuery: string;
  inputRef?: Ref<TextInput>;
  onFocus: () => void;
  onChange: (event: PinyinSearchInputEvent, text: string) => void;
}) => {
  const [query, setQuery] = useState(initialQuery);

  const options = pinyinSyllableSearch(query.replaceAll(/\d/g, ``));

  const update = (query: string, event?: PinyinSearchInputEvent) => {
    setQuery(query);

    event ??=
      // Pressing "space" indicates moving to the next word.
      /\s$/.test(query) ? `next` : `change`;

    let text = query.trim();

    for (const option of options) {
      if (text.endsWith(option.tone.toString())) {
        text = option.pinyinSyllable;
        break;
      }
    }

    onChange(event, text);
  };

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap justify-center gap-2">
        {hiddenPlaceholderOptions}
        <View className="absolute inset-0 flex-row flex-wrap content-end justify-center gap-2">
          {options.map((option) => (
            <Reanimated.View
              key={`${option.pinyinSyllable}-${option.tone}`}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(100)}
            >
              <PinyinOptionButton
                pinyin={option.pinyinSyllable}
                shortcutKey={option.tone.toString()}
                onPress={(pinyin) => {
                  update(pinyin, `submit`);
                }}
              />
            </Reanimated.View>
          ))}
        </View>
      </View>
      <TextInputSingle
        autoFocus={autoFocus}
        onChangeText={update}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === `Enter`) {
            e.preventDefault();
            update(query, `submit`);
          }
        }}
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

const pinyinPlaceholderClass = tv({
  base: `
    h-[40px] min-w-[60px] items-center justify-center rounded-xl border border-transparent px-3
    outline-dashed outline-2 outline-foreground/50 transition-[outline-color]
  `,
  variants: {
    focused: {
      true: `accent-theme2`,
    },
  },
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
