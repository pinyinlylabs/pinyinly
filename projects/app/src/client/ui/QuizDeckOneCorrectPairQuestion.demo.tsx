import { QuizDeckOneCorrectPairQuestion } from "@/client/ui/QuizDeckOneCorrectPairQuestion";
import { View } from "@/client/ui/View";
import { hanziTextSchema, hanziWordSchema, QuestionKind } from "@/data/model";
import type { OneCorrectPairQuestion } from "@/data/model";
import { hanziWordToGloss } from "@/data/skills";

const you = { kind: `hanzi`, value: hanziTextSchema.parse(`你`) } as const;
const good = { kind: `hanzi`, value: hanziTextSchema.parse(`好`) } as const;
const youGloss = { kind: `gloss`, value: `you` } as const;
const goodGloss = { kind: `gloss`, value: `good` } as const;

const question: OneCorrectPairQuestion = {
  kind: QuestionKind.OneCorrectPair,
  prompt: `Match each character to its meaning`,
  answer: {
    as: [you],
    bs: [youGloss],
    skill: hanziWordToGloss(hanziWordSchema.parse(`你:you`)),
  },
  groupA: [you, good],
  groupB: [youGloss, goodGloss],
  flag: null,
};

export default function QuizDeckOneCorrectPairQuestionDemo() {
  return (
    <View className="min-h-0 flex-1">
      <QuizDeckOneCorrectPairQuestion
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
