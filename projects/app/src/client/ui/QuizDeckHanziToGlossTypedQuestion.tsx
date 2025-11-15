import { splitHanziText } from "@/data/hanzi";
import type {
  HanziWordToGlossQuestion,
  MistakeType,
  UnsavedSkillRating,
} from "@/data/model";
import { hanziToGlossTypedQuestionMistakes } from "@/data/questions/hanziWordToGlossTyped";
import { computeSkillRating, hanziWordFromSkill } from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary/dictionary";
import { nonNullable } from "@pinyinly/lib/invariant";
import type { ReactNode, Ref } from "react";
import { useMemo, useRef, useState } from "react";
import type { TextInput } from "react-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconImage } from "./IconImage";
import { QuizDeckToastContainer } from "./QuizDeckToastContainer";
import { QuizFlagText } from "./QuizFlagText";
import { QuizSubmitButton, QuizSubmitButtonState } from "./QuizSubmitButton";
import { SkillAnswerText } from "./SkillAnswerText";
import { TextInputSingle } from "./TextInputSingle";

export function QuizDeckHanziToGlossTypedQuestion({
  noAutoFocus = true,
  question,
  onNext,
  onRating,
}: {
  noAutoFocus?: boolean;
  question: HanziWordToGlossQuestion;
  onNext: () => void;
  onRating: (ratings: UnsavedSkillRating[], mistakes: MistakeType[]) => void;
}) {
  const { skill, flag, answers } = question;

  const userAnswerRef = useRef(``);
  const [userAnswerEmpty, setUserAnswerEmpty] = useState(true);
  const [grade, setGrade] = useState<{
    correct: boolean;
    expectedAnswer: string;
  }>();

  const startTime = useMemo(() => Date.now(), []);
  const hanziWord = hanziWordFromSkill(skill);
  const hanziGraphemes = splitHanziText(hanziFromHanziWord(hanziWord));

  const submit = () => {
    // First time you press the button it will grade your answer, the next time
    // it moves you to the next question.
    if (grade == null) {
      const mistakes = hanziToGlossTypedQuestionMistakes(
        question,
        userAnswerRef.current,
      );

      const correct = mistakes.length === 0;

      const durationMs = Date.now() - startTime;
      const skillRatings: UnsavedSkillRating[] = [
        computeSkillRating({
          skill,
          correct,
          durationMs,
        }),
      ];

      setGrade({
        correct,
        expectedAnswer: nonNullable(answers[0]),
      });
      onRating(skillRatings, mistakes);
    } else {
      onNext();
    }
  };

  return (
    <Skeleton
      toast={
        grade == null ? null : (
          <View
            className={`
              flex-1 gap-[12px] overflow-hidden bg-fg-bg10 px-4 pt-3 pb-safe-offset-[84px]

              lg:mb-2 lg:rounded-xl

              ${grade.correct ? `theme-success` : `theme-danger`}
            `}
          >
            {grade.correct ? (
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
                  <SkillAnswerText skill={skill} />
                </Text>
              </>
            )}
          </View>
        )
      }
      submitButton={
        <QuizSubmitButton
          autoFocus={grade != null}
          state={
            userAnswerEmpty
              ? QuizSubmitButtonState.Disabled
              : grade == null
                ? QuizSubmitButtonState.Check
                : grade.correct
                  ? QuizSubmitButtonState.Correct
                  : QuizSubmitButtonState.Incorrect
          }
          onPress={() => {
            submit();
          }}
        />
      }
    >
      <View
        className={
          // 200px is the space left above a text input on mobile when the
          // on-screen keyboard is open (e.g. on iOS). By setting it 200px it
          // means only this element will remain visible when the keyboard is
          // open. It creates a clean look by completely hiding the content above
          // it.
          `h-[200px] justify-between`
        }
      >
        <View>
          {flag == null ? null : <QuizFlagText flag={flag} />}
          <View>
            <Text className="text-xl font-bold text-fg">
              What does this mean?
            </Text>
          </View>
        </View>
        <View className="flex-row justify-center gap-2 pb-3">
          {hanziGraphemes.map((hanzi, i) => {
            return (
              <View className="items-center gap-2" key={i}>
                {/* TODO: add pinyin to disambiguate the hanzi */}
                <Text className="text-[80px] font-medium text-fg">{hanzi}</Text>
              </View>
            );
          })}
        </View>
        <View
          // Invisible element at the bottom so that the `justify-between`
          // applys space at the bottom too, whilst still keeping this whole
          // thing at 200px.
          className="h-0"
        />
      </View>
      <GlossTextInputSingle
        autoFocus={!noAutoFocus}
        disabled={grade != null}
        onChangeText={(text) => {
          userAnswerRef.current = text;
          setUserAnswerEmpty(text.trim().length === 0);
        }}
        onSubmit={submit}
      />
    </Skeleton>
  );
}

const GlossTextInputSingle = ({
  autoFocus,
  disabled,
  inputRef,
  onChangeText,
  onSubmit,
}: {
  autoFocus: boolean;
  disabled: boolean;
  inputRef?: Ref<TextInput>;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}) => {
  const [text, setText] = useState(``);

  const updateText = (text: string) => {
    setText(text);
    onChangeText(text);
  };

  const handleChangeText = (text: string) => {
    updateText(text);
  };

  return (
    <View className="gap-2">
      <TextInputSingle
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={
          // Using the system auto-correct should make writing in English
          // faster.
          true
        }
        onChangeText={handleChangeText}
        disabled={disabled}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === `Enter`) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Type in English"
        textAlign="center"
        ref={inputRef}
        value={text}
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

  return (
    <>
      <View
        className="flex-1 px-4"
        style={{ paddingBottom: submitButtonInsetBottom }}
      >
        {children}
        <View
          // Placeholder to reserve space for the submit button that's absolute
          // positioned.
          className="mt-[5px]"
          style={{ height: submitButtonHeight }}
        />
      </View>
      {toast === null ? null : (
        <QuizDeckToastContainer>{toast}</QuizDeckToastContainer>
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
