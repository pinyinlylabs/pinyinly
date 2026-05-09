import { intersperse } from "@/client/react";
import { splitHanziText } from "@/data/hanzi";
import { QuestionFlagKind } from "@/data/model";
import type {
  HanziWordToGlossTypedQuestion,
  MistakeType,
  UnsavedSkillRating,
} from "@/data/model";
import { gradeHanziToGlossTypedQuestion } from "@/data/questions/hanziWordToGlossTyped";
import type { HanziToGlossTypedQuestionGrade } from "@/data/questions/hanziWordToGlossTyped";
import { hanziWordFromSkill } from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary";
import { emptyArray } from "@pinyinly/lib/collections";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { QuizFlagText } from "./QuizFlagText";
import { QuizDeckQuestionSkeleton } from "./QuizDeckQuestionSkeleton";
import { TextAnswerInputSingle } from "./TextAnswerInputSingle";
import { ratingToInputState } from "./TextAnswerInputSingle.utils";

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
  const [isUserAnswerEmpty, setIsUserAnswerEmpty] = useState(true);
  const [grade, setGrade] = useState<HanziToGlossTypedQuestionGrade>();

  const [startTime] = useState(() => Date.now());
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
    <QuizDeckQuestionSkeleton
      grade={grade}
      isUserAnswerProvided={!isUserAnswerEmpty}
      onSubmit={submit}
      onUndo={onUndo}
      showIdkButton
      skill={skill}
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
            <Text className="font-sans text-xl font-bold text-fg-loud">
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
                <Text className="font-sans text-[80px] font-medium text-fg-loud">
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
          setIsUserAnswerEmpty(text.trim().length === 0);
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
        state={ratingToInputState(isUserAnswerEmpty, grade?.rating)}
        placeholder="Type in English"
        autoCorrect
      />
    </QuizDeckQuestionSkeleton>
  );
}
