import { useMultiChoiceQuizTimer } from "@/client/hooks/useMultiChoiceQuizTimer";
import {
  autoCheckUserSetting,
  useUserSetting,
} from "@/client/hooks/useUserSetting";
import type {
  MistakeType,
  OneCorrectPairQuestion,
  OneCorrectPairQuestionChoice,
  UnsavedSkillRating,
} from "@/data/model";
import { QuestionFlagKind, SkillKind } from "@/data/model";
import {
  oneCorrectPairChoiceText,
  oneCorrectPairQuestionMistakes,
} from "@/data/questions/oneCorrectPair";
import type { HanziWordSkill, Skill } from "@/data/rizzleSchema";
import {
  computeSkillRating,
  hanziWordFromSkill,
  skillKindFromSkill,
} from "@/data/skills";
import { longestTextByGraphemes } from "@/util/unicode";
import { invariant } from "@pinyinly/lib/invariant";
import type { ReactNode } from "react";
import { Suspense, useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import Reanimated, { Easing, Keyframe } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HanziWordRefText } from "./HanziWordRefText";
import { IconImage } from "./IconImage";
import { NewSkillModal } from "./NewSkillModal";
import { Pylymark } from "./Pylymark";
import { QuizFlagText } from "./QuizFlagText";
import { QuizSubmitButton, QuizSubmitButtonState } from "./QuizSubmitButton";
import type {
  TextAnswerButtonFontSize,
  TextAnswerButtonState,
} from "./TextAnswerButton";
import { TextAnswerButton, textAnswerButtonFontSize } from "./TextAnswerButton";
import { WikiHanziModal } from "./WikiHanziModal";

const buttonThickness = 4;
const gap = 12;

export function QuizDeckOneCorrectPairQuestion({
  question,
  onNext,
  onRating,
}: {
  question: OneCorrectPairQuestion;
  onNext: () => void;
  onRating: (
    ratings: readonly UnsavedSkillRating[],
    mistakes: readonly MistakeType[],
  ) => void;
}) {
  const { prompt, answer, groupA, groupB, flag } = question;

  const autoCheck =
    useUserSetting(autoCheckUserSetting).value?.enabled ?? false;

  const [selectedAChoice, setSelectedAChoice] =
    useState<OneCorrectPairQuestionChoice>();
  const [selectedBChoice, setSelectedBChoice] =
    useState<OneCorrectPairQuestionChoice>();
  const [isCorrect, setIsCorrect] = useState<boolean>();

  // Setup the timer to measure how fast they answer the question.
  const timer = useMultiChoiceQuizTimer();

  const choiceRowCount = Math.max(groupA.length, groupB.length);

  if (__DEV__) {
    invariant(answer.as.every((a) => groupA.includes(a)));
    invariant(answer.bs.every((b) => groupB.includes(b)));
  }

  const submitChoices = (
    aChoice: OneCorrectPairQuestionChoice,
    bChoice: OneCorrectPairQuestionChoice,
  ) => {
    const mistakes = oneCorrectPairQuestionMistakes(answer, aChoice, bChoice);
    const isCorrect = mistakes.length === 0;

    const durationMs = (timer.endTime ?? Date.now()) - timer.startTime;
    const skillRatings: UnsavedSkillRating[] = [
      computeSkillRating({
        skill: answer.skill,
        correct: isCorrect,
        durationMs,
      }),
    ];

    setIsCorrect(isCorrect);
    onRating(skillRatings, mistakes);
  };

  const groupAFontSize = textAnswerButtonFontSize(
    longestTextByGraphemes(
      groupA.map((choice) => oneCorrectPairChoiceText(choice)),
    ),
  );
  const groupBFontSize = textAnswerButtonFontSize(
    longestTextByGraphemes(
      groupB.map((choice) => oneCorrectPairChoiceText(choice)),
    ),
  );

  return (
    <Skeleton
      toast={
        isCorrect == null ? null : (
          <View
            className={`
              ${isCorrect ? `theme-success` : `theme-danger`}

              flex-1 gap-[12px] overflow-hidden bg-fg-bg10 px-4 pt-3 pb-safe-offset-[84px]

              lg:mb-2 lg:rounded-xl
            `}
          >
            {isCorrect ? (
              <View className="flex-row items-center gap-[8px]">
                <IconImage
                  size={32}
                  source={require(`@/assets/icons/check-circled-filled.svg`)}
                />
                <Text className="text-2xl font-bold text-fg">Nice!</Text>
              </View>
            ) : (
              <>
                <View className="flex-row items-center gap-[8px]">
                  <IconImage
                    size={32}
                    source={require(`@/assets/icons/close-circled-filled.svg`)}
                  />
                  <Text className="text-2xl font-bold text-fg">Incorrect</Text>
                </View>
                <Text className="text-xl/none font-medium text-fg">
                  Correct answer:
                </Text>

                <Text className="text-fg">
                  <SkillAnswerText skill={answer.skill} />
                </Text>
              </>
            )}
          </View>
        )
      }
      submitButton={
        <QuizSubmitButton
          state={
            selectedAChoice === undefined || selectedBChoice === undefined
              ? QuizSubmitButtonState.Disabled
              : isCorrect == null
                ? QuizSubmitButtonState.Check
                : isCorrect
                  ? QuizSubmitButtonState.Correct
                  : QuizSubmitButtonState.Incorrect
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

      {flag == null ? null : <QuizFlagText flag={flag} />}
      <View>
        <Text className="text-xl font-bold text-fg">{prompt}</Text>
      </View>
      <View className="flex-1 justify-center py-4">
        <View
          className="flex-1 flex-row gap-[28px]"
          style={{
            maxHeight:
              choiceRowCount * 80 +
              (choiceRowCount - 1) * gap +
              buttonThickness,
          }}
        >
          {/* Group A */}
          <View className="flex-1" style={{ gap: gap + buttonThickness }}>
            {groupA.map((a, i) => (
              <ChoiceButton
                key={i}
                choice={a}
                fontSize={groupAFontSize}
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
                    timer.recordChoice(
                      newSelectedAChoice != null &&
                        answer.as.includes(newSelectedAChoice),
                    );

                    // Support auto-submit
                    if (
                      autoCheck &&
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
            ))}
          </View>
          {/* Group B */}
          <View className="flex-1" style={{ gap: gap + buttonThickness }}>
            {groupB.map((b, i) => (
              <ChoiceButton
                key={i}
                choice={b}
                fontSize={groupBFontSize}
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
                    timer.recordChoice(
                      newSelectedBChoice != null &&
                        answer.bs.includes(newSelectedBChoice),
                    );

                    // Support auto-submit
                    if (
                      autoCheck &&
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
            ))}
          </View>
        </View>
      </View>
    </Skeleton>
  );
}

const SkillAnswerText = ({ skill }: { skill: Skill; small?: boolean }) => {
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
      return <HanziWordToGlossSkillAnswerText skill={skill} />;
    }
    case SkillKind.HanziWordToPinyin:
    case SkillKind.HanziWordToPinyinFinal:
    case SkillKind.HanziWordToPinyinInitial:
    case SkillKind.HanziWordToPinyinTone: {
      skill = skill as HanziWordSkill;
      return <HanziWordToPinyinSkillAnswerText skill={skill} />;
    }
  }
};

const HanziWordToGlossSkillAnswerText = ({
  skill,
}: {
  skill: HanziWordSkill;
}) => {
  const hanziWord = hanziWordFromSkill(skill);

  return (
    <>
      <Text className="pyly-body-2xl">
        <Pylymark source={`{${hanziWord}}`} />
      </Text>
    </>
  );
};

const HanziWordToPinyinSkillAnswerText = ({
  skill,
}: {
  skill: HanziWordSkill;
}) => {
  const hanziWord = hanziWordFromSkill(skill);

  return (
    <Text className="pyly-body-2xl">
      <HanziWordRefText hanziWord={hanziWord} showPinyin />
    </Text>
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

  const keyframe = Platform.select({
    // On web the `bottom: <percent>%` approach doesn't work when the
    // parent is `position: absolute`. But using `translateY: <percent>%`
    // DOES work (but this doesn't work on mobile native because only
    // pixel values are accepted).
    web: new Keyframe({
      0: {
        transform: [{ translateY: `100%` }],
      },
      100: {
        transform: [{ translateY: `0%` }],
        easing: Easing.exp,
      },
    }),
    default: new Keyframe({
      0: {
        position: `relative`,
        bottom: `-100%`,
      },
      100: {
        position: `relative`,
        bottom: 0,
        easing: Easing.exp,
      },
    }),
  });

  return (
    <>
      <View
        className="flex-1 px-4"
        style={{ paddingBottom: contentInsetBottom }}
      >
        {children}
      </View>
      {toast === null ? null : (
        <Suspense fallback={null}>
          <View className="absolute inset-x-0 bottom-0">
            <Reanimated.View entering={keyframe}>{toast}</Reanimated.View>
          </View>
        </Suspense>
      )}
      <View
        className="absolute inset-x-4 flex-row items-stretch"
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

const ChoiceButton = ({
  state,
  choice,
  fontSize,
  onPress,
}: {
  state: TextAnswerButtonState;
  choice: OneCorrectPairQuestionChoice;
  fontSize: TextAnswerButtonFontSize;
  onPress: (choice: OneCorrectPairQuestionChoice) => void;
}) => {
  const shouldShowWikiModal =
    (state === `success` || state === `error`) && choice.kind === `hanzi`;

  return (
    <TextAnswerButton
      onPress={() => {
        onPress(choice);
      }}
      fontSize={fontSize}
      state={state}
      className="flex-1"
      text={oneCorrectPairChoiceText(choice)}
      renderWikiModal={
        shouldShowWikiModal
          ? (onDismiss) => (
              <WikiHanziModal hanzi={choice.value} onDismiss={onDismiss} />
            )
          : undefined
      }
    />
  );
};
