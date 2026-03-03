import type { PinyinSoundId } from "@/data/model";
import { getPinyinSoundLabel, loadPylyPinyinChart } from "@/data/pinyin";

export function PinyinSoundNameText({
  pinyinSoundId,
}: {
  pinyinSoundId: PinyinSoundId;
}) {
  const chart = loadPylyPinyinChart();
  const label = getPinyinSoundLabel(pinyinSoundId, chart);

  return label;
}
