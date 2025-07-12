import { ExampleStack } from "@/app/dev/ui/_helpers";
import { QuizFlagText } from "@/client/ui/QuizFlagText";
import { QuestionFlagKind } from "@/data/model";
import { subMinutes } from "date-fns/subMinutes";

export default () => {
  return (
    <ExampleStack title="flags">
      <QuizFlagText flag={{ kind: QuestionFlagKind.WeakWord }} />
      <QuizFlagText flag={{ kind: QuestionFlagKind.NewSkill }} />
      <QuizFlagText
        flag={{
          kind: QuestionFlagKind.Overdue,
          interval: { start: subMinutes(new Date(), 59), end: new Date() },
        }}
      />
      <QuizFlagText flag={{ kind: QuestionFlagKind.Retry }} />
    </ExampleStack>
  );
};
