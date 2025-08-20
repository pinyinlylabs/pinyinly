import {
  autoCheckUserSetting,
  useUserSetting,
} from "@/client/hooks/useUserSetting";
import { splitHanziText } from "@/data/hanzi";
import type {
  HanziWordToPinyinQuestion,
  MistakeType,
  PinyinPronunciation,
  UnsavedSkillRating,
} from "@/data/model";
import type {
  PinyinSyllableSuggestion,
  PinyinSyllableSuggestions,
} from "@/data/pinyin";
import {
  matchAllPinyinSyllables,
  pinyinSyllableSuggestions,
} from "@/data/pinyin";
import { hanziToPinyinQuestionMistakes } from "@/data/questions/hanziWordToPinyin";
import {
  computeSkillRating,
  hanziWordFromSkill,
} from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary/dictionary";
import { nonNullable } from "@pinyinly/lib/invariant";
import type { ReactNode, Ref } from "react";
import { useMemo, useRef, useState } from "react";
import type { TextInput } from "react-native";
import { Text, View } from "react-native";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DeepReadonly } from "ts-essentials";
import { PinyinOptionButton } from "./PinyinOptionButton";
import { QuizDeckToastContainer } from "./QuizDeckToastContainer";
import { QuizFlagText } from "./QuizFlagText";
import { QuizSubmitButton, QuizSubmitButtonState } from "./QuizSubmitButton";
import { TextInputSingle } from "./TextInputSingle";

export function QuizDeckHanziToPinyinQuestion({
  noAutoFocus = true,
  question,
  onNext,
  onRating,
}: {
  noAutoFocus?: boolean;
  question: HanziWordToPinyinQuestion;
  onNext: () => void;
  onRating: (ratings: UnsavedSkillRating[], mistakes: MistakeType[]) => void;
}) {
  const { skill, flag, answers } = question;

  const autoCheck =
    useUserSetting(autoCheckUserSetting).value?.enabled ?? false;

  const userAnswerRef = useRef(``);
  const [userAnswerEmpty, setUserAnswerEmpty] = useState(true);
  const [grade, setGrade] = useState<{
    correct: boolean;
    expectedAnswer: Readonly<PinyinPronunciation>;
  }>();

  const startTime = useMemo(() => Date.now(), []);
  const hanziGraphemes = splitHanziText(
    hanziFromHanziWord(hanziWordFromSkill(skill)),
  );

  const submit = () => {
    // First time you press the button it will grade your answer, the next time
    // it moves you to the next question.
    if (grade == null) {
      const mistakes = hanziToPinyinQuestionMistakes(
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

      // If auto-check is enabled and the answer is correct, advance immediately
      if (autoCheck && correct) {
        onNext();
      }
    } else {
      onNext();
    }
  };

  return (
    <Skeleton
      toast={null}
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
              What sound does this make?
            </Text>
          </View>
        </View>
        <View className="flex-row justify-center gap-2 pb-3">
          {hanziGraphemes.map((hanzi, i) => {
            return (
              <View className="items-center gap-2" key={i}>
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
      <PinyinTextInputSingle
        autoFocus={!noAutoFocus}
        disabled={grade != null}
        onChangeText={(text) => {
          userAnswerRef.current = text;
          setUserAnswerEmpty(text.trim().length === 0);

          if (
            autoCheck &&
            // It's important to only trigger when there's a space at the end,
            // otherwise as soon as you type "ni" it will submit, before you've
            // had a chance to change the tone.
            text.endsWith(` `)
          ) {
            const expectedSyllableCount = nonNullable(answers[0]).length;
            const actualSyllableCount = matchAllPinyinSyllables(text).length;
            if (expectedSyllableCount === actualSyllableCount) {
              submit();
            }
          }
        }}
        onSubmit={submit}
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
}: {
  autoFocus: boolean;
  disabled: boolean;
  inputRef?: Ref<TextInput>;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}) => {
  const [text, setText] = useState(``);

  const suggestions = disabled ? null : pinyinSyllableSuggestions(text);

  const updateText = (text: string) => {
    setText(text);
    onChangeText(text);
  };

  const handleChangeText = (text: string) => {
    if (suggestions !== null) {
      for (const option of suggestions.syllables) {
        if (text.endsWith(option.tone.toString())) {
          acceptSuggestion(suggestions, option);
          return;
        }
      }
    }

    updateText(text);
  };

  const acceptSuggestion = (
    suggestions: DeepReadonly<PinyinSyllableSuggestions>,
    syllable: PinyinSyllableSuggestion,
  ) => {
    const newText =
      text.slice(0, suggestions.from) +
      syllable.pinyinSyllable +
      text.slice(suggestions.to) +
      // Trailing space ensures "autoSubmit" works.
      ` `;
    updateText(newText);
  };

  return (
    <View className="gap-2">
      <TextInputSingle
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={handleChangeText}
        disabled={disabled}
        onKeyPress={(e) => {
          if (e.nativeEvent.key === `Enter`) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Type in pinyin"
        textAlign="center"
        ref={inputRef}
        value={text}
      />
      <View className="flex-row flex-wrap justify-center gap-2">
        {hiddenPlaceholderOptions}
        <View className="absolute inset-0 flex-row flex-wrap content-start justify-center gap-2">
          {suggestions?.syllables.map((syllable) => (
            <Reanimated.View
              key={`${syllable.pinyinSyllable}-${syllable.tone}`}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(100)}
            >
              <PinyinOptionButton
                pinyin={syllable.pinyinSyllable}
                shortcutKey={syllable.tone.toString()}
                onPress={() => {
                  acceptSuggestion(suggestions, syllable);
                }}
              />
            </Reanimated.View>
          ))}
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
