import { QuizDeckHanziCharacterWritingQuestion } from "@/client/ui/QuizDeckHanziCharacterWritingQuestion";
import { View } from "@/client/ui/View";
import {
  hanziCharacterSchema,
  pinyinTextSchema,
  QuestionKind,
} from "@/data/model";
import type { HanziCharacterWritingQuestion } from "@/data/model";
import { hanziCharacterToWriting } from "@/data/skills";

const hanzi = hanziCharacterSchema.parse(`好`);
const question: HanziCharacterWritingQuestion = {
  kind: QuestionKind.HanziCharacterWriting,
  skill: hanziCharacterToWriting(hanzi),
  hanzi,
  gloss: `good`,
  pinyin: pinyinTextSchema.parse(`hǎo`),
  flag: null,
};

export default function QuizDeckHanziCharacterWritingQuestionDemo() {
  return (
    <View className="min-h-0 flex-1">
      <QuizDeckHanziCharacterWritingQuestion
        onNext={() => {
          console.log(`onNext()`);
        }}
        onRating={() => {
          console.log(`onRating()`);
        }}
        onChangeAnswer={() => {
          console.log(`onChangeAnswer()`);
        }}
        question={question}
      />
    </View>
  );
}
