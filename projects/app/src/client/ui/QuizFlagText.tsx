import type { QuestionFlagType } from "@/data/model";
import { QuestionFlagKind } from "@/data/model";
import { formatDuration } from "date-fns/formatDuration";
import { intervalToDuration } from "date-fns/intervalToDuration";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export const QuizFlagText = ({ flag }: { flag: QuestionFlagType }) => {
  switch (flag.kind) {
    case QuestionFlagKind.NewSkill: {
      return (
        <View className={flagViewClass({ class: `success-theme` })}>
          <Image
            source={require(`@/assets/icons/plant-filled.svg`)}
            className={flagIconClass()}
            tintColor="currentColor"
          />
          <Text className={flagTextClass()}>New skill</Text>
        </View>
      );
    }
    case QuestionFlagKind.Overdue: {
      return (
        <View className={flagViewClass({ class: `danger-theme` })}>
          <Image
            source={require(`@/assets/icons/alarm.svg`)}
            className={flagIconClass()}
            tintColor="currentColor"
          />
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
        <View className={flagViewClass({ class: `warning-theme` })}>
          <Image
            source={require(`@/assets/icons/repeat.svg`)}
            className={flagIconClass()}
            tintColor="currentColor"
          />
          <Text className={flagTextClass()}>Previous mistake</Text>
        </View>
      );
    }
    case QuestionFlagKind.WeakWord: {
      return (
        <View className={flagViewClass({ class: `danger-theme` })}>
          <Image
            source={require(`@/assets/icons/flag.svg`)}
            className={flagIconClass()}
            tintColor="currentColor"
          />
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
  base: `size-[24px] flex-shrink text-accent-10`,
});

const flagTextClass = tv({
  base: `font-bold uppercase text-accent-10`,
});
