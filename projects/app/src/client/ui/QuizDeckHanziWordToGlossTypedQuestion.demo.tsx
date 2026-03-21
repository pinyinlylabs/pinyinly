import { DemoHanziWordKnob } from "@/client/ui/demo/components";
import { useDemoHanziWordKnob } from "@/client/ui/demo/utils";
import { QuizDeckHanziWordToGlossTypedQuestion } from "@/client/ui/QuizDeckHanziWordToGlossTypedQuestion";
import { Use } from "@/client/ui/Use";
import { QuestionFlagKind } from "@/data/model";
import { hanziWordToGlossTypedQuestionOrThrow } from "@/data/questions/hanziWordToGlossTyped";
import { hanziWordToGlossTyped } from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { View } from "react-native";
import { useDb } from "./hooks/useDb";

export default () => {
  const db = useDb();
  const { hanziWord } = useDemoHanziWordKnob(`你好:hello`);
  const skill = hanziWordToGlossTyped(hanziWord);
  const { data: meanings } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, hanziFromHanziWord(hanziWord)))
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .select(({ entry }) => ({ hanziWord: entry.hanziWord }))
        .distinct(),
    [db.dictionarySearch, hanziWord],
  );
  const flag =
    meanings.length > 1
      ? {
          kind: QuestionFlagKind.OtherAnswer,
          previousHanziWords: meanings
            .map((entry) => entry.hanziWord)
            .filter((h) => h !== hanziWord),
        }
      : null;
  const questionPromise = hanziWordToGlossTypedQuestionOrThrow(skill, flag);

  return (
    <View className="flex-1 gap-4">
      <DemoHanziWordKnob hanziWords={[`你好:hello`, `长:grow`]} />
      <Use
        key={skill}
        promise={questionPromise}
        render={(question) => (
          <View className="pb-[150px]">
            <QuizDeckHanziWordToGlossTypedQuestion
              noAutoFocus
              onNext={() => {
                console.log(`onNext()`);
              }}
              onRating={() => {
                console.log(`onRating()`);
              }}
              onUndo={() => {
                console.log(`onUndo()`);
              }}
              question={question}
            />
          </View>
        )}
      />
    </View>
  );
};
