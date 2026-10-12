import type { HanziText, PinyinText } from "@/data/model";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

export function HanziPinyinText({
  hanzi,
  pinyin,
  className = ``,
  lozenges,
}: {
  hanzi: HanziText;
  pinyin?: PinyinText | null;
  className?: string;
  lozenges?: React.ReactNode;
}) {
  return (
    <View className={className}>
      <View className="flex-row items-center gap-3">
        <Text className="font-sans text-2xl font-normal text-fg-loud">
          {hanzi}
        </Text>
        {lozenges}
      </View>
      {pinyin == null ? null : (
        <Text className="font-sans text-sm text-muted-fg">{pinyin}</Text>
      )}
    </View>
  );
}
