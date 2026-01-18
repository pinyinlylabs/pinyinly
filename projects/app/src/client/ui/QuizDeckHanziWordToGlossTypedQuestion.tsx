import { intersperse } from "@/client/react";
import { splitHanziText } from "@/data/hanzi";
import type {
  HanziWordToGlossTypedQuestion,
  MistakeType,
  UnsavedSkillRating,
} from "@/data/model";
import { QuestionFlagKind } from "@/data/model";
import type { HanziToGlossTypedQuestionGrade } from "@/data/questions/hanziWordToGlossTyped";
import { gradeHanziToGlossTypedQuestion } from "@/data/questions/hanziWordToGlossTyped";
import { hanziWordFromSkill } from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary";
import { emptyArray } from "@pinyinly/lib/collections";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QuizDeckResultToast } from "./QuizDeckResultToast";
import { QuizFlagText } from "./QuizFlagText";
import { QuizSubmitButton } from "./QuizSubmitButton";
import { TextAnswerInputSingle } from "./TextAnswerInputSingle";

export function QuizDeckHanziWordToGlossTypedQuestion({
  noAutoFocus = true,
  question,
  onNext,
  onRating,
  onUndo,
}: {
  noAutoFocus?: boolean;
  question: HanziWordToGlossTypedQuestion;
  onNext: () => void;
  onRating: (
    ratings: UnsavedSkillRating[],
    mistakes: readonly MistakeType[],
  ) => void;
  onUndo: () => void;
}) {
  const { skill, flag, bannedMeaningPrimaryGlossHint } = question;

  const userAnswerRef = useRef(``);
  const [userAnswerEmpty, setUserAnswerEmpty] = useState(true);
  const [grade, setGrade] = useState<HanziToGlossTypedQuestionGrade>();

  const startTime = useMemo(() => Date.now(), []);
  const hanziWord = hanziWordFromSkill(skill);
  const hanziCharacters = splitHanziText(hanziFromHanziWord(hanziWord));

  const submit = () => {
    // First time you press the button it will grade your answer, the next time
    // it moves you to the next question.
    if (grade == null) {
      const durationMs = Date.now() - startTime;

      const grade = gradeHanziToGlossTypedQuestion(
        question,
        userAnswerRef.current,
        durationMs,
      );

      setGrade(grade);
      onRating(grade.skillRatings, grade.correct ? emptyArray : grade.mistakes);
    } else {
      onNext();
    }
  };

  return (
    <Skeleton
      toast={
        grade == null ? null : (
          <QuizDeckResultToast
            skill={skill}
            rating={grade.rating}
            onUndo={onUndo}
          />
        )
      }
      submitButton={
        <QuizSubmitButton
          autoFocus={grade != null}
          disabled={userAnswerEmpty}
          rating={grade?.rating}
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
            <Text className="text-xl font-bold text-fg-loud">
              {flag?.kind === QuestionFlagKind.OtherAnswer
                ? `What is another meaning?`
                : `What does this mean?`}
            </Text>
          </View>
        </View>
        <View className="flex-row justify-center gap-2 pb-3">
          {hanziCharacters.map((hanzi, i) => {
            return (
              <View className="items-center gap-2" key={i}>
                <Text className="text-[80px] font-medium text-fg-loud">
                  {hanzi}
                </Text>
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
      <TextAnswerInputSingle
        autoFocus={!noAutoFocus}
        disabled={grade != null}
        onChangeValue={(text) => {
          userAnswerRef.current = text.trim();
          setUserAnswerEmpty(text.trim().length === 0);
        }}
        hintText={
          bannedMeaningPrimaryGlossHint.length > 0 ? (
            <>
              You have already answered{` `}
              {intersperse(
                bannedMeaningPrimaryGlossHint.map((gloss, i) => (
                  <Text className="pyly-bold" key={i}>
                    {gloss}
                  </Text>
                )),
                <Text>
                  {` `}and{` `}
                </Text>,
              )}
              .
            </>
          ) : undefined
        }
        onSubmit={submit}
        state={grade == null ? `default` : grade.correct ? `success` : `error`}
        placeholder="Type in English"
        autoCorrect
      />
    </Skeleton>
  );
}

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
      {toast}
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
