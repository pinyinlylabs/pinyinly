import { useHanziWordMeaning } from "@/client/hooks/useHanziWordMeaning";
import { useMultiChoiceQuizTimer } from "@/client/hooks/useMultiChoiceQuizTimer";
import { oneCorrectPairQuestionChoiceMistakes } from "@/data/mistakes";
import type {
  MistakeType,
  NewSkillRating,
  OneCorrectPairQuestion,
  OneCorrectPairQuestionChoice,
  QuestionFlagType,
} from "@/data/model";
import { QuestionFlagKind, SkillKind } from "@/data/model";
import { oneCorrectPairChoiceText } from "@/data/questions/util";
import type { HanziWordSkill, Skill } from "@/data/rizzleSchema";
import {
  computeSkillRating,
  hanziWordFromSkill,
  skillKindFromSkill,
} from "@/data/skills";
import { invariant } from "@haohaohow/lib/invariant";
import { formatDuration } from "date-fns/formatDuration";
import { intervalToDuration } from "date-fns/intervalToDuration";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  // eslint-disable-next-line @typescript-eslint/no-restricted-imports
  Animated,
  Easing,
  Platform,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tv } from "tailwind-variants";
import z from "zod/v4";
import { HanziWordRefText } from "./HanziWordRefText";
import { Hhhmark } from "./Hhhmark";
import { NewSkillModal } from "./NewSkillModal";
import { RectButton2 } from "./RectButton2";
import type { TextAnswerButtonState } from "./TextAnswerButton";
import { TextAnswerButton } from "./TextAnswerButton";
import type { PropsOf } from "./types";

const buttonThickness = 4;
const gap = 12;
const autoSubmit = false as boolean;

export function QuizDeckOneCorrectPairQuestion({
  question,
  onNext,
  onRating,
}: {
  question: OneCorrectPairQuestion;
  onNext: () => void;
  onRating: (ratings: NewSkillRating[], mistakes: MistakeType[]) => void;
}) {
  const { prompt, answer, groupA, groupB, flag } = question;

  const [selectedAChoice, setSelectedAChoice] =
    useState<OneCorrectPairQuestionChoice>();
  const [selectedBChoice, setSelectedBChoice] =
    useState<OneCorrectPairQuestionChoice>();
  const [isCorrect, setIsCorrect] = useState<boolean>();

  // Setup the timer to measure how fast they answer the question.
  const timer = useMultiChoiceQuizTimer();

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

  if (__DEV__) {
    invariant(groupA.includes(answer.a));
    invariant(groupB.includes(answer.b));
  }

  const submitChoices = (
    aChoice: OneCorrectPairQuestionChoice,
    bChoice: OneCorrectPairQuestionChoice,
  ) => {
    const isCorrect = aChoice === answer.a && bChoice === answer.b;

    const mistakes = isCorrect
      ? []
      : oneCorrectPairQuestionChoiceMistakes(aChoice, bChoice);

    const durationMs = (timer.endTime ?? Date.now()) - timer.startTime;
    const skillRatings: NewSkillRating[] = [
      computeSkillRating({
        skill: answer.skill,
        correct: isCorrect,
        durationMs,
      }),
    ];

    setIsCorrect(isCorrect);
    onRating(skillRatings, mistakes);
  };

  return (
    <Skeleton
      toast={
        isCorrect == null ? null : (
          <View
            className={`flex-1 ${isCorrect ? `success-theme2` : `danger-theme2`} gap-[12px] overflow-hidden bg-foreground-bg10 px-quiz-px pt-3 pb-safe-offset-[84px] lg:mb-2 lg:rounded-xl`}
          >
            {isCorrect ? (
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

                <SkillAnswer
                  skill={answer.skill}
                  includeHint
                  includeAlternatives
                />

                {selectedAChoice != null && selectedBChoice != null ? (
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="shrink-0 font-bold leading-snug text-foreground">
                      Your answer:
                    </Text>
                    <View className="flex-1 flex-row flex-wrap items-center">
                      <Hhhmark
                        source={`${choiceToHhhmark(selectedAChoice)} + ${choiceToHhhmark(selectedBChoice)}`}
                        context="caption"
                      />
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
          onPress={() => {
            if (selectedAChoice == null || selectedBChoice == null) {
              return;
            } else if (isCorrect == null) {
              submitChoices(selectedAChoice, selectedBChoice);
            } else {
              onNext();
            }
          }}
        />
      }
    >
      {flag?.kind === QuestionFlagKind.NewSkill ? (
        <NewSkillModal passivePresentation skill={question.answer.skill} />
      ) : null}

      {flag == null ? null : <FlagText flag={flag} />}
      <View>
        <Text className="text-xl font-bold text-foreground">{prompt}</Text>
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
                    const newSelectedAChoice =
                      selectedAChoice === a ? undefined : a;
                    setSelectedAChoice(newSelectedAChoice);
                    timer.recordChoice(newSelectedAChoice === answer.a);

                    // Support auto-submit
                    if (
                      autoSubmit &&
                      newSelectedAChoice != null &&
                      selectedBChoice != null
                    ) {
                      submitChoices(newSelectedAChoice, selectedBChoice);
                    }
                  } else if (isCorrect) {
                    // If the answer is correct, this is a shortcut to the next
                    // question to avoid moving the mouse.
                    onNext();
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
                    const newSelectedBChoice =
                      selectedBChoice === b ? undefined : b;
                    setSelectedBChoice(newSelectedBChoice);
                    timer.recordChoice(newSelectedBChoice === answer.b);

                    // Support auto-submit
                    if (
                      autoSubmit &&
                      selectedAChoice != null &&
                      newSelectedBChoice != null
                    ) {
                      submitChoices(selectedAChoice, newSelectedBChoice);
                    }
                  } else if (isCorrect) {
                    // If the answer is correct, this is a shortcut to the next
                    // question to avoid moving the mouse.
                    onNext();
                  }
                }}
              />
            </View>
          ))}
        </View>
      </View>
    </Skeleton>
  );
}

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

const flagViewClass = tv({
  base: `flex-row items-center gap-1`,
});

const flagIconClass = tv({
  base: `size-[24px] flex-shrink text-accent-10`,
});

const flagTextClass = tv({
  base: `font-bold uppercase text-accent-10`,
});

function choiceToHhhmark(choice: OneCorrectPairQuestionChoice): string {
  return `**${oneCorrectPairChoiceText(choice)}**`;
}

const SkillAnswer = ({
  skill,
  includeHint = false,
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
      text={oneCorrectPairChoiceText(choice)}
    />
  );
};
