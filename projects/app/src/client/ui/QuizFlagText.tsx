import type { QuestionFlagType } from "@/data/model";
import { QuestionFlagKind } from "@/data/model";
import { formatDuration } from "date-fns/formatDuration";
import { intervalToDuration } from "date-fns/intervalToDuration";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { tv } from "tailwind-variants";
import { Icon } from "./Icon";
import { ScopedVariables } from "./ScopedVariables";

export const QuizFlagText = ({ flag }: { flag: QuestionFlagType }) => {
  switch (flag.kind) {
    case QuestionFlagKind.Blocked: {
      return null;
    }
    case QuestionFlagKind.NewDifficulty: {
      return (
        <ScopedVariables variables={{ "--color-fg": `var(--color-danger)` }}>
          <View className={flagViewClass()}>
            <Icon icon="dumbbell" />
            <Text className={flagTextClass()}>Hard question</Text>
          </View>
        </ScopedVariables>
      );
    }
    case QuestionFlagKind.NewSkill: {
      return (
        <ScopedVariables variables={{ "--color-fg": `var(--color-success)` }}>
          <View className={flagViewClass()}>
            <Icon icon="plant-filled" />
            <Text className={flagTextClass()}>New skill</Text>
          </View>
        </ScopedVariables>
      );
    }
    case QuestionFlagKind.OtherAnswer: {
      return (
        <ScopedVariables variables={{ "--color-fg": `var(--color-warning)` }}>
          <View className={flagViewClass()}>
            <Icon icon="shuffle" />
            <Text className={flagTextClass()}>Other answer</Text>
          </View>
        </ScopedVariables>
      );
    }
    case QuestionFlagKind.Overdue: {
      const formattedOverdueDuration = formatDuration(
        intervalToDuration(flag.interval),
        {
          format: [`years`, `months`, `weeks`, `days`, `hours`, `minutes`],
          zero: false,
          delimiter: `, `,
        },
      );
      const overdueBy =
        formattedOverdueDuration.length > 0
          ? formattedOverdueDuration.split(`, `)[0]
          : `1 minute`;

      return (
        <ScopedVariables variables={{ "--color-fg": `var(--color-danger)` }}>
          <View className={flagViewClass()}>
            <Icon icon="alarm" />
            <Text className={flagTextClass()}>
              Overdue by{` `}
              {overdueBy}
            </Text>
          </View>
        </ScopedVariables>
      );
    }
    case QuestionFlagKind.Retry: {
      return (
        <ScopedVariables variables={{ "--color-fg": `var(--color-warning)` }}>
          <View className={flagViewClass()}>
            <Icon icon="repeat" />
            <Text className={flagTextClass()}>Previous mistake</Text>
          </View>
        </ScopedVariables>
      );
    }
    case QuestionFlagKind.WeakWord: {
      return (
        <ScopedVariables variables={{ "--color-fg": `var(--color-danger)` }}>
          <View className={flagViewClass()}>
            <Icon icon="flag" />
            <Text className={flagTextClass()}>Weak word</Text>
          </View>
        </ScopedVariables>
      );
    }
  }
};

const flagViewClass = tv({
  base: `flex-row items-center gap-1`,
});

const flagTextClass = tv({
  base: `font-sans font-bold text-fg uppercase`,
});
