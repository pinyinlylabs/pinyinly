import { intersperse } from "@/client/react";
import {
  autoCheckUserSetting,
  useUserSetting,
} from "@/client/ui/hooks/useUserSetting";
import { splitHanziText } from "@/data/hanzi";
import { QuestionFlagKind } from "@/data/model";
import type {
  HanziWordToPinyinTypedQuestion,
  MistakeType,
  UnsavedSkillRating,
} from "@/data/model";
import { pinyinUnitSuggestions } from "@/data/pinyin";
import type {
  PinyinUnitSuggestion,
  PinyinUnitSuggestions,
} from "@/data/pinyin";
import {
  gradeHanziToPinyinTypedQuestion,
  shouldAutoSubmitPinyinTypedAnswer,
} from "@/data/questions/hanziWordToPinyinTyped";
import type { HanziToPinyinTypedQuestionGrade } from "@/data/questions/hanziWordToPinyinTyped";
import { hanziWordFromSkill } from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary";
import { emptyArray } from "@pinyinly/lib/collections";
import { useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { Text, View } from "react-native";
import type { TextInput } from "react-native";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DeepReadonly } from "ts-essentials";
import { PinyinOptionButton } from "./PinyinOptionButton";
import { QuizDeckResultToast } from "./QuizDeckResultToast";
import { QuizFlagText } from "./QuizFlagText";
import { QuizSubmitButton } from "./QuizSubmitButton";
import { TextAnswerInputSingle } from "./TextAnswerInputSingle";
import { ratingToInputState } from "./TextAnswerInputSingle.utils";
import type { TextAnswerInputSingleState } from "./TextAnswerInputSingle.utils";

export function QuizDeckHanziWordToPinyinTypedQuestion({
  noAutoFocus = true,
  question,
  onNext,
  onUndo,
  onRating,
}: {
  noAutoFocus?: boolean;
  question: HanziWordToPinyinTypedQuestion;
  onNext: () => void;
  onUndo: () => void;
  onRating: (
    ratings: UnsavedSkillRating[],
    mistakes: readonly MistakeType[],
  ) => void;
}) {
  const { skill, flag, answers, bannedMeaningPinyinHint } = question;

  const autoCheck =
    useUserSetting(autoCheckUserSetting).value?.enabled ?? false;

  const userAnswerRef = useRef(``);
  const [userAnswerEmpty, setUserAnswerEmpty] = useState(true);
  const [grade, setGrade] = useState<HanziToPinyinTypedQuestionGrade>();

  const [startTime] = useState(() => Date.now());
  const hanziCharacters = splitHanziText(
    hanziFromHanziWord(hanziWordFromSkill(skill)),
  );

  const submit = () => {
    // First time you press the button it will grade your answer, the next time
    // it moves you to the next question.
    if (grade == null) {
      const durationMs = Date.now() - startTime;
      const grade = gradeHanziToPinyinTypedQuestion(
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
                ? `What is the other pronunciation?`
                : `What sound does this make?`}
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
      <PinyinTextInputSingle
        autoFocus={!noAutoFocus}
        disabled={grade != null}
        onChangeText={(text, suggestionAccepted) => {
          userAnswerRef.current = text;
          setUserAnswerEmpty(text.trim().length === 0);

          if (
            autoCheck &&
            shouldAutoSubmitPinyinTypedAnswer(
              text,
              skill,
              answers,
              suggestionAccepted,
            )
          ) {
            submit();
          }
        }}
        hintText={
          bannedMeaningPinyinHint.length > 0 ? (
            <>
              You have already answered{` `}
              {intersperse(
                bannedMeaningPinyinHint.map((pinyin, i) => (
                  <Text className="pyly-bold" key={i}>
                    {pinyin}
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
        state={grade == null ? `default` : ratingToInputState(grade.rating)}
      />
    </Skeleton>
  );
}

const PinyinTextInputSingle = ({
  autoFocus,
  disabled,
  inputRef,
  onChangeText,
  onSubmit,
  hintText,
  state = `default`,
}: {
  autoFocus: boolean;
  disabled: boolean;
  inputRef?: Ref<TextInput>;
  onChangeText: (text: string, suggestionAccepted: boolean) => void;
  onSubmit: () => void;
  hintText?: ReactNode;
  state?: TextAnswerInputSingleState;
}) => {
  const [text, setText] = useState(``);

  const suggestions = disabled ? null : pinyinUnitSuggestions(text);

  const updateText = (newText: string, suggestionAccepted: boolean) => {
    setText(newText);
    onChangeText(newText, suggestionAccepted);
  };

  const handleChangeText = (newText: string) => {
    if (suggestions !== null) {
      for (const option of suggestions.units) {
        if (newText.endsWith(option.tone.toString())) {
          acceptSuggestion(suggestions, option);
          return;
        }
      }
    }

    updateText(newText, false);
  };

  const acceptSuggestion = (
    suggestions: DeepReadonly<PinyinUnitSuggestions>,
    unit: PinyinUnitSuggestion,
  ) => {
    const newText =
      text.slice(0, suggestions.from) +
      unit.pinyinUnit +
      text.slice(suggestions.to);
    updateText(newText, true);
  };

  return (
    <View className="gap-2">
      <TextAnswerInputSingle
        autoFocus={autoFocus}
        disabled={disabled}
        inputRef={inputRef}
        onChangeValue={handleChangeText}
        onSubmit={onSubmit}
        placeholder="Type in pinyin"
        state={state}
        value={text}
      />
      <View className="flex-row flex-wrap justify-center gap-2">
        {hiddenPlaceholderOptions}
        <View className="absolute inset-0 flex-row flex-wrap content-start justify-center gap-2">
          {suggestions == null ? (
            hintText == null ? null : (
              <Text className="pyly-body-caption">{hintText}</Text>
            )
          ) : (
            suggestions.units.map((unit) => (
              <Reanimated.View
                key={`${unit.pinyinUnit}-${unit.tone}`}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(100)}
              >
                <PinyinOptionButton
                  pinyin={unit.pinyinUnit}
                  shortcutKey={unit.tone.toString()}
                  onPress={() => {
                    acceptSuggestion(suggestions, unit);
                  }}
                />
              </Reanimated.View>
            ))
          )}
        </View>
      </View>
    </View>
  );
};

// Reserve the space
const hiddenPlaceholderOptions = (
  <>
    <PinyinOptionButton pinyin="xxxxxx" shortcutKey="x" className="invisible" />
    <PinyinOptionButton pinyin="xxxxxx" shortcutKey="x" className="invisible" />
    <PinyinOptionButton pinyin="xxxxxx" shortcutKey="x" className="invisible" />
    <PinyinOptionButton pinyin="xxxxxx" shortcutKey="x" className="invisible" />
    <PinyinOptionButton pinyin="xxxxxx" shortcutKey="x" className="invisible" />
  </>
);

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
