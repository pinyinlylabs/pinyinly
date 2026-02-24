import type { QuestionFlagType } from "@/data/model";
import { QuestionFlagKind } from "@/data/model";
import { formatDuration } from "date-fns/formatDuration";
import { intervalToDuration } from "date-fns/intervalToDuration";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { Icon } from "./Icon";

export const QuizFlagText = ({ flag }: { flag: QuestionFlagType }) => {
  switch (flag.kind) {
    case QuestionFlagKind.Blocked: {
      return null;
    }
    case QuestionFlagKind.NewDifficulty: {
      return (
        <View
          className={flagViewClass({
            className: `[--color-fg:var(--color-danger)]`,
          })}
        >
          <Icon className={flagIconClass()} icon="dumbbell" />
          <Text className={flagTextClass()}>Hard question</Text>
        </View>
      );
    }
    case QuestionFlagKind.NewSkill: {
      return (
        <View
          className={flagViewClass({
            className: `[--color-fg:var(--color-success)]`,
          })}
        >
          <Icon className={flagIconClass()} icon="plant-filled" />
          <Text className={flagTextClass()}>New skill</Text>
        </View>
      );
    }
    case QuestionFlagKind.OtherAnswer: {
      return (
        <View
          className={flagViewClass({
            className: `[--color-fg:var(--color-warning)]`,
          })}
        >
          <Icon className={flagIconClass()} icon="shuffle" />
          <Text className={flagTextClass()}>Other answer</Text>
        </View>
      );
    }
    case QuestionFlagKind.Overdue: {
      return (
        <View
          className={flagViewClass({
            className: `[--color-fg:var(--color-danger)]`,
          })}
        >
          <Icon className={flagIconClass()} icon="alarm" />
          <Text className={flagTextClass()}>
            Overdue by{` `}
            {
              formatDuration(intervalToDuration(flag.interval), {
                format: [
                  `years`,
                  `months`,
                  `weeks`,
                  `days`,
                  `hours`,
                  `minutes`,
                ],
                zero: false,
                delimiter: `, `,
              }).split(`, `)[0]
            }
          </Text>
        </View>
      );
    }
    case QuestionFlagKind.Retry: {
      return (
        <View
          className={flagViewClass({
            className: `[--color-fg:var(--color-warning)]`,
          })}
        >
          <Icon className={flagIconClass()} icon="repeat" />
          <Text className={flagTextClass()}>Previous mistake</Text>
        </View>
      );
    }
    case QuestionFlagKind.WeakWord: {
      return (
        <View
          className={flagViewClass({
            className: `[--color-fg:var(--color-danger)]`,
          })}
        >
          <Icon className={flagIconClass()} icon="flag" />
          <Text className={flagTextClass()}>Weak word</Text>
        </View>
      );
    }
  }
};

const flagViewClass = tv({
  base: `flex-row items-center gap-1`,
});

const flagIconClass = tv({
  base: `text-fg`,
});

const flagTextClass = tv({
  base: `font-bold uppercase text-fg`,
});
