import { WikiTitledBox } from "@/client/ui/WikiTitledBox";
import type { PinyinSoundId } from "@/data/model";
import { loadPylyPinyinChart, normalizePinyinUnit } from "@/data/pinyin";
import { loadFinalToneFrequencies } from "@/dictionary";
import { use } from "react";
import { Text, View } from "react-native";

const TONE_IDS = [`1`, `2`, `3`, `4`, `5`] as const;

interface PinyinFinalToneEditorProps {
  finalSoundId: PinyinSoundId;
}

export function PinyinFinalToneEditor({
  finalSoundId,
}: PinyinFinalToneEditorProps) {
  const chart = loadPylyPinyinChart();
  const finalLabel = chart.soundToCustomLabel[finalSoundId] ?? finalSoundId;
  const frequencies = use(loadFinalToneFrequencies());
  const finalFrequencies = frequencies.get(finalSoundId);
  const finalLabelWithoutPrefix = finalLabel.startsWith(`-`)
    ? finalLabel.slice(1)
    : finalLabel;
  const maxToneCount = Math.max(
    1,
    ...TONE_IDS.map((tone) => finalFrequencies?.get(Number(tone)) ?? 0),
  );
  const toneHistogramRows = TONE_IDS.map((tone) => ({
    tone,
    pinyinLabel: `-${normalizePinyinUnit(`${finalLabelWithoutPrefix}${tone}`)}`,
    count: finalFrequencies?.get(Number(tone)) ?? 0,
  }));

  return (
    <View>
      <WikiTitledBox title="Tone Histogram">
        <View className="gap-2 p-3">
          {toneHistogramRows.map(({ tone, pinyinLabel, count }) => (
            <View key={tone} className="gap-1">
              <View className="flex-row items-baseline justify-between">
                <View className="flex-row items-baseline gap-2">
                  <Text className="font-sans text-sm text-fg">
                    {pinyinLabel}
                  </Text>
                  <Text className="font-sans text-xs text-muted-fg">
                    Tone {tone}
                  </Text>
                </View>
                <Text className="font-sans text-xs text-muted-fg">{count}</Text>
              </View>
              <View className="h-2 rounded-full bg-fg/10">
                <View
                  className="h-2 rounded-full bg-cyan"
                  style={{ width: `${(count / maxToneCount) * 100}%` }}
                />
              </View>
            </View>
          ))}
        </View>
      </WikiTitledBox>
    </View>
  );
}
