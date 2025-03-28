import { useHanziWordMeaning } from "@/client/query";
import {
  Mistake,
  OneCorrectPairQuestion,
  OneCorrectPairQuestionChoice,
  QuestionFlag,
  QuestionFlagType,
  SkillRating,
  SkillType,
} from "@/data/model";
import { HanziWordSkill, Skill } from "@/data/rizzleSchema";
import {
  hanziWordFromSkill,
  oneCorrectPairQuestionChoiceMistakes,
  skillType,
} from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary/dictionary";
import { Rating } from "@/util/fsrs";
import { invariant } from "@haohaohow/lib/invariant";
import { formatDuration } from "date-fns/formatDuration";
import { intervalToDuration } from "date-fns/intervalToDuration";
import { Image } from "expo-image";
import {
  ElementRef,
  ReactNode,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tv } from "tailwind-variants";
import { GlossHint } from "./GlossHint";
import { HanziText, PinyinText } from "./HanziText";
import { HanziWordModal } from "./HanziWordModal";
import { Hhhmark } from "./Hhhmark";
import { NewSkillModal } from "./NewSkillModal";
import { RectButton2 } from "./RectButton2";
import { TextAnswerButton, TextAnswerButtonState } from "./TextAnswerButton";
import { PropsOf } from "./types";

const buttonThickness = 4;
const gap = 12;

export const QuizDeckOneCorrectPairQuestion = memo(
  function QuizDeckOneCorrectPairQuestion({
    question,
    flag,
    onNext,
    onRating,
  }: {
    question: OneCorrectPairQuestion;
    flag?: QuestionFlag;
    onNext: () => void;
    onRating: (
      question: OneCorrectPairQuestion,
      ratings: SkillRating[],
      mistakes: Mistake[],
    ) => void;
  }) {
    const { prompt, answer, hint, groupA, groupB } = question;

    const [selectedAChoice, setSelectedAChoice] =
      useState<OneCorrectPairQuestionChoice>();
    const [selectedBChoice, setSelectedBChoice] =
      useState<OneCorrectPairQuestionChoice>();
    const [isCorrect, setIsCorrect] = useState<boolean>();

    const choiceRowCount = Math.max(groupA.length, groupB.length);
    const choiceRows: {
      a: OneCorrectPairQuestionChoice;
      b: OneCorrectPairQuestionChoice;
    }[] = [];

    for (let i = 0; i < choiceRowCount; i++) {
      const a = groupA[i];
      const b = groupB[i];
      invariant(a !== undefined && b !== undefined, `missing choice`);
      choiceRows.push({ a, b });
    }

    invariant(groupA.includes(answer.a));
    invariant(groupB.includes(answer.b));

    const handleSubmit = () => {
      if (
        isCorrect === undefined &&
        selectedAChoice != null &&
        selectedBChoice != null
      ) {
        const isCorrect =
          selectedAChoice === answer.a && selectedBChoice === answer.b;

        const mistakes = isCorrect
          ? []
          : oneCorrectPairQuestionChoiceMistakes(
              selectedAChoice,
              selectedBChoice,
            );

        const skillRatings: SkillRating[] = [
          {
            skill: answer.skill,
            rating: isCorrect ? Rating.Good : Rating.Again,
          },
        ];

        setIsCorrect(isCorrect);
        onRating(question, skillRatings, mistakes);
      } else {
        onNext();
      }
    };

    return (
      <Skeleton
        toast={
          isCorrect == null ? null : (
            <View
              className={`flex-1 gap-[12px] ${isCorrect ? `success-theme` : `danger-theme`} bg-primary-5 px-quiz-px pt-3 pb-safe-offset-[84px] lg:mb-2 lg:rounded-xl`}
            >
              {isCorrect ? (
                <View className="flex-row items-center gap-[8px]">
                  <Image
                    className="h-[32px] w-[32px] flex-shrink text-accent-10"
                    source={require(`@/assets/icons/check-circled-filled.svg`)}
                    tintColor="currentColor"
                  />
                  <Text className="text-2xl font-bold text-accent-10">
                    Nice!
                  </Text>
                </View>
              ) : (
                <>
                  <View className="flex-row items-center gap-[8px]">
                    <Image
                      className="h-[32px] w-[32px] flex-shrink text-accent-10"
                      source={require(
                        `@/assets/icons/close-circled-filled.svg`,
                      )}
                      tintColor="currentColor"
                    />
                    <Text className="text-2xl font-bold text-accent-10">
                      Incorrect
                    </Text>
                  </View>
                  <Text className="text-xl/none font-bold text-accent-10">
                    Correct answer:
                  </Text>

                  <SkillAnswer
                    skill={answer.skill}
                    includeHint
                    includeAlternatives
                  />

                  {hint == null ? null : (
                    <Text className="leading-snug text-accent-10">
                      <Text className="font-bold">Hint:</Text>
                      {hint}
                    </Text>
                  )}

                  {selectedAChoice != null && selectedBChoice != null ? (
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="flex-shrink-0 font-bold leading-snug text-accent-10">
                        Your answer:
                      </Text>
                      <View className="flex-1 flex-row flex-wrap items-center">
                        <SkillChoice choice={selectedAChoice} />
                        <Text className="flex-shrink-0 flex-grow-0 px-1 leading-snug text-accent-10 opacity-50">
                          +
                        </Text>
                        <SkillChoice choice={selectedBChoice} />
                      </View>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          )
        }
        submitButton={
          <SubmitButton
            state={
              selectedAChoice === undefined || selectedBChoice === undefined
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
        {flag?.type === QuestionFlagType.NewSkill ? (
          <NewSkillModal passivePresentation skill={question.answer.skill} />
        ) : null}

        {flag == null ? null : <FlagText flag={flag} />}
        <View>
          <Text className="text-xl font-bold text-text">{prompt}</Text>
        </View>
        <View className="flex-1 justify-center py-quiz-px">
          <View
            className="flex-1"
            style={{
              gap: gap + buttonThickness,
              maxHeight:
                choiceRowCount * 80 +
                (choiceRowCount - 1) * gap +
                buttonThickness,
            }}
          >
            {choiceRows.map(({ a, b }, i) => (
              <View className="flex-1 flex-row gap-[28px]" key={i}>
                <ChoiceButton
                  choice={a}
                  state={
                    selectedAChoice === undefined
                      ? `default`
                      : a === selectedAChoice
                        ? isCorrect == null
                          ? `selected`
                          : isCorrect
                            ? `success`
                            : `error`
                        : selectedBChoice === undefined
                          ? `default`
                          : `dimmed`
                  }
                  onPress={() => {
                    if (isCorrect == null) {
                      setSelectedAChoice((x) => (x === a ? undefined : a));
                    }
                  }}
                />
                <ChoiceButton
                  choice={b}
                  state={
                    selectedBChoice === undefined
                      ? `default`
                      : b === selectedBChoice
                        ? isCorrect == null
                          ? `selected`
                          : isCorrect
                            ? `success`
                            : `error`
                        : selectedAChoice === undefined
                          ? `default`
                          : `dimmed`
                  }
                  onPress={() => {
                    if (isCorrect == null) {
                      setSelectedBChoice((x) => (x === b ? undefined : b));
                    }
                  }}
                />
              </View>
            ))}
          </View>
        </View>
      </Skeleton>
    );
  },
);

const FlagText = ({ flag }: { flag: QuestionFlag }) => {
  switch (flag.type) {
    case QuestionFlagType.NewSkill: {
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
    case QuestionFlagType.Overdue: {
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
    case QuestionFlagType.PreviousMistake: {
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
    case QuestionFlagType.WeakWord: {
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

const flagViewClass = tv({
  base: `flex-row items-center gap-1`,
});

const flagIconClass = tv({
  base: `h-[24px] w-[24px] flex-shrink text-accent-10`,
});

const flagTextClass = tv({
  base: `font-bold uppercase text-accent-10`,
});

const choiceEnglishText = tv({
  base: `text-xl/none text-accent-10`,
  variants: {
    small: {
      true: `text-md`,
    },
    underline: {
      true: ``,
    },
  },
});

const SkillChoice = ({ choice }: { choice: OneCorrectPairQuestionChoice }) => {
  switch (choice.type) {
    case `gloss`: {
      return (
        <Text className={choiceEnglishText({ small: true })}>
          <Hhhmark source={choice.value} />
        </Text>
      );
    }
    case `hanzi`: {
      return <HanziText hanzi={choice.value} small accented />;
    }
    case `pinyin`: {
      return <PinyinText pinyin={choice.value} small accented />;
    }
  }
};

const SkillAnswer = ({
  skill,
  includeAlternatives = false,
  includeHint = false,
  small = false,
  // hideA = false,
  // hideB = false,
}: {
  skill: Skill;
  includeAlternatives?: boolean;
  includeHint?: boolean;
  hideA?: boolean;
  hideB?: boolean;
  small?: boolean;
}) => {
  switch (skillType(skill)) {
    case SkillType.HanziWordToPinyinInitial: {
      skill = skill as HanziWordSkill;
      return (
        <HanziWordToPinyinInitialSkillAnswer
          skill={skill}
          includeAlternatives={includeAlternatives}
          includeHint={includeHint}
          small={small}
        />
      );
    }
    case SkillType.Deprecated_EnglishToRadical:
    case SkillType.Deprecated_PinyinToRadical:
    case SkillType.Deprecated_RadicalToEnglish:
    case SkillType.Deprecated_RadicalToPinyin:
    case SkillType.Deprecated:
    case SkillType.EnglishToHanziWord:
    case SkillType.HanziWordToPinyinFinal:
    case SkillType.HanziWordToPinyinTone:
    case SkillType.ImageToHanziWord:
    case SkillType.PinyinFinalAssociation:
    case SkillType.PinyinInitialAssociation:
    case SkillType.PinyinToHanziWord: {
      throw new Error(
        `ShowSkillAnswer not implemented for ${skillType(skill)}`,
      );
    }
    case SkillType.HanziWordToEnglish: {
      skill = skill as HanziWordSkill;
      return (
        <HanziWordToEnglishSkillAnswer
          skill={skill}
          includeAlternatives={includeAlternatives}
          includeHint={includeHint}
          small={small}
        />
      );
    }
  }
};

const HanziWordToEnglishSkillAnswer = ({
  skill,
  includeAlternatives = false,
  includeHint = false,
  includeGloss = true,
  includeHanzi = true,
  small = false,
}: {
  skill: HanziWordSkill;
  includeHint?: boolean;
  includeAlternatives?: boolean;
  includeGloss?: boolean;
  includeHanzi?: boolean;
  small?: boolean;
}) => {
  const hanziWord = hanziWordFromSkill(skill);
  const meaningQuery = useHanziWordMeaning(hanziWord);
  const [showModal, setShowModal] = useState(false);

  const meaning = meaningQuery.data;

  if (meaning == null) {
    return null;
  }

  const primaryHanzi = hanziFromHanziWord(hanziWord);
  const gloss = meaning.gloss[0];
  const hanzis = [primaryHanzi];
  if (includeAlternatives && meaning.visualVariants != null) {
    hanzis.push(...meaning.visualVariants);
  }

  return (
    <>
      <Pressable
        onPress={() => {
          setShowModal(true);
        }}
        className={`flex-row items-center ${small ? `gap-1` : `gap-2`}`}
      >
        {includeHanzi
          ? hanzis.map((hanzi, i) => (
              <View
                key={i}
                className={hanzi === primaryHanzi ? undefined : `opacity-50`}
              >
                <HanziText hanzi={hanzi} small={small} underline accented />
              </View>
            ))
          : null}
        {includeGloss && gloss != null ? (
          <Text className={choiceEnglishText({ small, underline: true })}>
            {gloss}
          </Text>
        ) : null}
      </Pressable>

      {includeHint && meaning.glossHint != null ? (
        <GlossHint
          glossHint={meaning.glossHint}
          hideExplanation
          headlineClassName="leading-snug text-accent-10"
          explanationClassName="leading-snug text-accent-9"
        />
      ) : null}

      {showModal ? (
        <HanziWordModal
          hanziWord={hanziWord}
          onDismiss={() => {
            setShowModal(false);
          }}
        />
      ) : null}
    </>
  );
};

const HanziWordToPinyinInitialSkillAnswer = ({
  skill,
  includeAlternatives = false,
  includeHint = false,
  small = false,
}: {
  skill: HanziWordSkill;
  includeHint?: boolean;
  includeAlternatives?: boolean;
  small?: boolean;
}) => {
  const hanziWord = hanziWordFromSkill(skill);
  const meaningQuery = useHanziWordMeaning(hanziWord);

  const meaning = meaningQuery.data;

  if (meaning == null) {
    return null;
  }

  const primaryHanzi = hanziFromHanziWord(hanziWord);
  const pinyin = meaning.pinyin?.[0];
  const gloss = meaning.gloss[0];
  const hanzis = [primaryHanzi];
  if (includeAlternatives && meaning.visualVariants != null) {
    hanzis.push(...meaning.visualVariants);
  }

  return (
    <>
      <View className={`flex-row items-center ${small ? `gap-1` : `gap-2`}`}>
        {hanzis.map((hanzi, i) => (
          <View
            key={i}
            className={hanzi === primaryHanzi ? undefined : `opacity-50`}
          >
            <HanziText
              pinyin={hanzi === primaryHanzi ? pinyin : undefined}
              hanzi={hanzi}
              small={small}
              accented
            />
          </View>
        ))}
        <Text className={choiceEnglishText({ small })}>{gloss}</Text>
      </View>
      {includeHint && meaning.glossHint != null ? (
        <Text className="leading-snug text-accent-10">
          <Text className="font-bold">Hint:</Text>
          {meaning.glossHint}
        </Text>
      ) : null}
    </>
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

enum SubmitButtonState {
  Disabled,
  Check,
  Correct,
  Incorrect,
}

const SubmitButton = forwardRef<
  ElementRef<typeof RectButton2>,
  { state: SubmitButtonState } & Pick<PropsOf<typeof RectButton2>, `onPress`>
>(function SubmitButton({ state, onPress }, ref) {
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
      className={`flex-1 ${state === SubmitButtonState.Incorrect ? `danger-theme` : `success-theme`}`}
      accent
      onPress={state === SubmitButtonState.Disabled ? undefined : onPress}
    >
      {text}
    </RectButton2>
  );
});

const ChoiceButton = ({
  state,
  choice,
  onPress,
}: {
  state: TextAnswerButtonState;
  choice: OneCorrectPairQuestionChoice;
  onPress: (choice: OneCorrectPairQuestionChoice) => void;
}) => {
  const handlePress = useCallback(() => {
    onPress(choice);
  }, [onPress, choice]);

  return (
    <TextAnswerButton
      onPress={handlePress}
      state={state}
      className="flex-1"
      textClassName={choice.type === `hanzi` ? `font-normal` : undefined}
      text={choice.value}
    />
  );
};
