import {
  OneCorrectPairQuestion,
  OneCorrectPairQuestionAnswer,
  OneCorrectPairQuestionChoice,
  QuestionFlag,
  SkillRating,
} from "@/data/model";
import {
  loadStandardPinyinChart,
  lookupRadicalByHanzi,
  lookupWord,
  splitPinyin,
} from "@/dictionary/dictionary";
import { arrayFilterUniqueWithKey } from "@/util/collections";
import { Rating } from "@/util/fsrs";
import { invariant } from "@haohaohow/lib/invariant";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import {
  ElementRef,
  Fragment,
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
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tv } from "tailwind-variants";
import { AnswerButton } from "./AnswerButton";
import { HanziText } from "./HanziText";
import { RadicalText } from "./RadicalText";
import { RectButton2 } from "./RectButton2";
import { useRizzleQuery } from "./ReplicacheContext";
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
    ) => void;
  }) {
    const { prompt, answer, hint, groupA, groupB } = question;
    const [selectedAAnswer, setSelectedAAnswer] =
      useState<OneCorrectPairQuestionAnswer>();
    const [selectedBAnswer, setSelectedBAnswer] =
      useState<OneCorrectPairQuestionAnswer>();
    const [rating, setRating] = useState<Rating>();

    const choiceRowCount = Math.max(groupA.length, groupB.length);
    const choiceRows: {
      a: OneCorrectPairQuestionAnswer;
      b: OneCorrectPairQuestionAnswer;
    }[] = [];

    for (let i = 0; i < choiceRowCount; i++) {
      const a = groupA[i];
      const b = groupB[i];
      invariant(a !== undefined && b !== undefined, `missing choice`);
      choiceRows.push({ a, b });
    }

    invariant(groupA.includes(answer));

    const handleSubmit = () => {
      if (rating === undefined) {
        const rating =
          selectedAAnswer === answer && selectedBAnswer === answer
            ? Rating.Good
            : Rating.Again;

        const skillRatings: SkillRating[] = [
          selectedAAnswer?.a.skill,
          selectedAAnswer?.b.skill,
          selectedBAnswer?.a.skill,
          selectedBAnswer?.b.skill,
        ]
          .filter((x) => x != null)
          .map((skill) => ({ skill, rating }))
          .filter(arrayFilterUniqueWithKey((x) => JSON.stringify(x.skill)));

        setRating(rating);
        onRating(question, skillRatings);
      } else {
        onNext();
      }
    };

    const showResult = rating !== undefined;
    const isCorrect = rating !== Rating.Again;

    const pinyinChartQuery = useQuery({
      queryKey: [QuizDeckOneCorrectPairQuestion.name, `pinyinChart`],
      queryFn: async () => {
        return await loadStandardPinyinChart();
      },
      throwOnError: true,
    });

    const answerPinyin = answer.b.type === `pinyin` ? answer.b.pinyin : null;
    const splitAnswerPinyin =
      answerPinyin != null && pinyinChartQuery.data
        ? splitPinyin(answerPinyin, pinyinChartQuery.data)
        : null;

    const pinyinNewHintQuery = useRizzleQuery(
      [
        QuizDeckOneCorrectPairQuestion.name,
        `association`,
        splitAnswerPinyin?.join(`.`),
      ],
      async (r, tx) => {
        if (splitAnswerPinyin != null) {
          const [initial, final, tone] = splitAnswerPinyin;
          const initialRes = await r.query.pinyinInitialAssociation.get(tx, {
            initial: `${initial}-`,
          });
          const finalRes = await r.query.pinyinFinalAssociation.get(tx, {
            final: `-${final}`,
          });
          return {
            initial,
            initialMnemonic: initialRes?.name,
            final,
            finalMnemonic: finalRes?.name,
            tone,
            toneMnemonic: null as unknown as string | undefined, // TODO: implement
          };
        }
        return null;
      },
    );

    const pinyinHint =
      pinyinNewHintQuery.data != null
        ? `${pinyinNewHintQuery.data.initial}${pinyinNewHintQuery.data.initialMnemonic != null ? ` (${pinyinNewHintQuery.data.initialMnemonic})` : ``} + ${pinyinNewHintQuery.data.final}${pinyinNewHintQuery.data.finalMnemonic != null ? ` (${pinyinNewHintQuery.data.finalMnemonic})` : ``} + ${pinyinNewHintQuery.data.tone}${pinyinNewHintQuery.data.toneMnemonic != null ? ` (${pinyinNewHintQuery.data.toneMnemonic})` : ``}.`
        : null;

    return (
      <Skeleton
        toast={
          showResult ? (
            <View
              className={`flex-1 gap-[12px] ${isCorrect ? `success-theme` : `danger-theme`} bg-primary-5 px-quiz-px pt-3 pb-safe-offset-[84px]`}
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
                  <Text className="text-xl font-bold leading-none text-accent-10">
                    Correct answer:
                  </Text>

                  <ShowAnswer answer={answer} includeAlternatives />

                  {hint != null || pinyinHint != null ? (
                    <Text className="text-md leading-snug text-accent-10">
                      <Text className="font-bold">Hint:</Text> {pinyinHint}
                      {` `}
                      {hint}
                    </Text>
                  ) : null}
                  {selectedAAnswer != null && selectedBAnswer != null ? (
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="text-md flex-shrink-0 font-bold leading-snug text-accent-10">
                        Your answer:
                      </Text>
                      <View className="flex-1 flex-row flex-wrap items-center">
                        <ShowAnswer answer={selectedAAnswer} small />
                        <Text className="text-md flex-shrink-0 flex-grow-0 px-1 leading-snug text-accent-10 opacity-50">
                          +
                        </Text>
                        <ShowAnswer answer={selectedBAnswer} small />
                      </View>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          ) : null
        }
        submitButton={
          <SubmitButton
            state={
              selectedAAnswer === undefined || selectedBAnswer === undefined
                ? SubmitButtonState.Disabled
                : !showResult
                  ? SubmitButtonState.Check
                  : isCorrect
                    ? SubmitButtonState.Correct
                    : SubmitButtonState.Incorrect
            }
            onPress={handleSubmit}
          />
        }
      >
        {flag != null ? (
          <View className="flex-row items-center gap-[10px]">
            {flag === QuestionFlag.WeakWord ? (
              <>
                {/* <Image
              source={require("@/assets/target-red.svg")}
              style={{ flexShrink: 1, width: 33, height: 30 }}
            /> */}
                <View className="danger-theme">
                  <Text className="text-md font-bold uppercase text-accent-10">
                    Weak word
                  </Text>
                </View>
              </>
            ) : null}
            {flag === QuestionFlag.PreviousMistake ? (
              <View className="warning-theme">
                <Text className="text-md font-bold uppercase text-accent-10">
                  Previous mistake
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
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
                  choice={a.a}
                  selected={a === selectedAAnswer}
                  onPress={() => {
                    if (!showResult) {
                      setSelectedAAnswer(a);
                    }
                  }}
                />
                <ChoiceButton
                  choice={b.b}
                  selected={b === selectedBAnswer}
                  onPress={() => {
                    if (!showResult) {
                      setSelectedBAnswer(b);
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

const ShowChoice = ({
  choice,
  includeAlternatives = false,
  small = false,
}: {
  choice: OneCorrectPairQuestionChoice;
  includeAlternatives?: boolean;
  small?: boolean;
}) => {
  const radical = choice.type === `radical` ? choice.hanzi : null;
  const hanzi = choice.type === `hanzi` ? choice.hanzi : null;

  const radicalQuery = useQuery({
    queryKey: [`radical`, radical],
    queryFn: async () => {
      if (radical != null) {
        return await lookupRadicalByHanzi(radical);
      }
    },
    enabled: radical != null,
  });

  const hanziQuery = useQuery({
    queryKey: [`hanzi`, hanzi],
    queryFn: async () => {
      if (hanzi != null) {
        return await lookupWord(hanzi);
      }
    },
    enabled: hanzi != null,
  });

  if (radicalQuery.isLoading || hanziQuery.isLoading) {
    return null;
  }

  switch (choice.type) {
    case `radical`: {
      const hanzis = (includeAlternatives
        ? radicalQuery.data?.hanzi
        : null) ?? [choice.hanzi];
      const pinyin = radicalQuery.data?.pinyin[0];
      return (
        <View className="flex-row items-end gap-1">
          {hanzis.map((hanzi, i) => {
            return (
              <View
                key={i}
                className={hanzi !== choice.hanzi ? `opacity-50` : undefined}
              >
                <RadicalText
                  pinyin={!small && hanzi === choice.hanzi ? pinyin : undefined}
                  radical={hanzi}
                  accented
                />
              </View>
            );
          })}
        </View>
      );
    }
    case `name`: {
      const names = (includeAlternatives ? radicalQuery.data?.name : null) ?? [
        choice.english,
      ];
      return (
        <Text className={choiceEnglishText({ small })}>
          {names.map((n, i, { length }) => (
            <Fragment key={i}>
              {i > 0 ? `, ` : null}
              <Text
                className={
                  length > 1 && n === choice.english ? `underline` : undefined
                }
              >
                {n}
              </Text>
            </Fragment>
          ))}
        </Text>
      );
    }
    case `hanzi`: {
      const pinyin = small ? undefined : hanziQuery.data?.pinyin;
      return (
        <HanziText
          pinyin={pinyin?.join(` `)}
          hanzi={choice.hanzi}
          accented
          hanziClassName={small ? `text-md` : undefined}
        />
      );
    }
    case `pinyin`:
    case `definition`:
      return (
        <Text className={choiceEnglishText({ small })}>
          {choiceText(choice)}
        </Text>
      );
  }
};

const choiceEnglishText = tv({
  base: `text-xl leading-none text-accent-10`,
  variants: {
    small: {
      true: `text-md`,
    },
  },
});

const choicesWithPinyinRendering = new Set([`radical`, `hanzi`]);

const ShowAnswer = ({
  answer: { a, b },
  includeAlternatives = false,
  small = false,
}: {
  answer: OneCorrectPairQuestionAnswer;
  includeAlternatives?: boolean;
  small?: boolean;
}) => {
  const needPaddingForFloatingPinyin =
    !small &&
    (choicesWithPinyinRendering.has(a.type) ||
      choicesWithPinyinRendering.has(b.type));
  return (
    <View
      className={`flex-row items-center ${small ? `gap-1` : `gap-2`} ${needPaddingForFloatingPinyin ? `pt-4` : ``}`}
    >
      <ShowChoice
        choice={a}
        includeAlternatives={includeAlternatives}
        small={small}
      />
      <ShowChoice
        choice={b}
        includeAlternatives={includeAlternatives}
        small={small}
      />
    </View>
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
      {toast !== null ? (
        <View className="absolute inset-x-0 bottom-0">
          <Animated.View style={slideInStyle}>{toast}</Animated.View>
        </View>
      ) : null}
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
    case SubmitButtonState.Check:
      text = `Check`;
      break;
    case SubmitButtonState.Correct:
      text = `Continue`;
      break;
    case SubmitButtonState.Incorrect:
      text = `Got it`;
      break;
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

function choiceText(choice: OneCorrectPairQuestionChoice): string {
  switch (choice.type) {
    case `radical`:
      return choice.hanzi;
    case `hanzi`:
      return choice.hanzi;
    case `pinyin`:
      return choice.pinyin;
    case `definition`:
      return choice.english;
    case `name`:
      return choice.english;
  }
}

const ChoiceButton = ({
  selected,
  choice,
  onPress,
}: {
  selected: boolean;
  choice: OneCorrectPairQuestionChoice;
  onPress: (choice: OneCorrectPairQuestionChoice) => void;
}) => {
  const handlePress = useCallback(() => {
    onPress(choice);
  }, [onPress, choice]);

  const text = choiceText(choice);

  return (
    <AnswerButton
      onPress={handlePress}
      state={selected ? `selected` : `default`}
      className="flex-1"
      textClassName={choiceButtonText({
        isRadical: choice.type === `radical`,
        length:
          text.length <= 20 ? `short` : text.length <= 40 ? `medium` : `long`,
      })}
    >
      {text}
    </AnswerButton>
  );
};

const choiceButtonText = tv({
  // px-1: Horizontal padding is necessary to give first and last letters on a
  // line with accents enough space to not be clipped. Without this words like
  // "lǐ" will have half the accent clipped.
  base: `text-lg lg:text-xl px-1`,
  variants: {
    length: {
      short: `text-lg lg:text-xl`,
      medium: `text-md lg:text-lg`,
      long: `text-xs lg:text-md`,
    },
    isRadical: {
      true: `border-[1px] border-primary-10 border-dashed px-1`,
    },
  },
});
