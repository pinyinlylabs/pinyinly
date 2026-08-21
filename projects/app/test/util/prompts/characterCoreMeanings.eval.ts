import { describeEval } from "vitest-evals";
import { createResponsePromptHarness } from "./eval.ts";
import type { CharacterCoreMeaningsSpecInputType } from "#util/prompts/characterCoreMeanings.js";
import { buildCharacterCoreMeaningsSpecPrompt } from "#util/prompts/characterCoreMeanings.js";
import type { HanziCharacter, HanziText, PinyinText } from "#data/model.js";

const promptCases: CharacterCoreMeaningsSpecInputType[] = [
  {
    character: `行` as HanziCharacter,
    usages: [
      { hanzi: `并行`, pinyin: `bìng xíng` },
      { hanzi: `不行`, pinyin: `bù xíng` },
      { hanzi: `步行`, pinyin: `bù xíng` },
      { hanzi: `出行`, pinyin: `chū xíng` },
      { hanzi: `发行`, pinyin: `fā xíng` },
      { hanzi: `飞行`, pinyin: `fēi xíng` },
      { hanzi: `飞行员`, pinyin: `fēi xíng yuán` },
      { hanzi: `航行`, pinyin: `háng xíng` },
      { hanzi: `进行`, pinyin: `jìn xíng` },
      { hanzi: `举行`, pinyin: `jǔ xíng` },
      { hanzi: `可行`, pinyin: `kě xíng` },
      { hanzi: `流行`, pinyin: `liú xíng` },
      { hanzi: `旅行`, pinyin: `lǚ xíng` },
      { hanzi: `旅行社`, pinyin: `lǚ xíng shè` },
      { hanzi: `履行`, pinyin: `lǚ xíng` },
      { hanzi: `内行`, pinyin: `nèi háng` },
      { hanzi: `排行榜`, pinyin: `pái háng bǎng` },
      { hanzi: `品行`, pinyin: `pǐn xíng` },
      { hanzi: `平行`, pinyin: `píng xíng` },
      { hanzi: `强行`, pinyin: `qiáng xíng` },
      { hanzi: `绕行`, pinyin: `rào xíng` },
      { hanzi: `人行道`, pinyin: `rén xíng dào` },
      { hanzi: `盛行`, pinyin: `shèng xíng` },
      { hanzi: `施行`, pinyin: `shī xíng` },
      { hanzi: `实行`, pinyin: `shí xíng` },
      { hanzi: `试行`, pinyin: `shì xíng` },
      { hanzi: `送行`, pinyin: `sòng xíng` },
      { hanzi: `通行`, pinyin: `tōng xíng` },
      { hanzi: `通行证`, pinyin: `tōng xíng zhèng` },
      { hanzi: `同行`, pinyin: `tóng háng` },
      { hanzi: `同行`, pinyin: `tóng xíng` },
      { hanzi: `推行`, pinyin: `tuī xíng` },
      { hanzi: `外行`, pinyin: `wài háng` },
      { hanzi: `现行`, pinyin: `xiàn xíng` },
      { hanzi: `行`, pinyin: `háng` },
      { hanzi: `行`, pinyin: `xíng` },
      { hanzi: `行程`, pinyin: `xíng chéng` },
      { hanzi: `行动`, pinyin: `xíng dòng` },
      { hanzi: `行家`, pinyin: `háng jiā` },
      { hanzi: `行李`, pinyin: `xíng li` },
      { hanzi: `行李箱`, pinyin: `xíng li xiāng` },
      { hanzi: `行列`, pinyin: `háng liè` },
      { hanzi: `行情`, pinyin: `háng qíng` },
      { hanzi: `行人`, pinyin: `xíng rén` },
      { hanzi: `行使`, pinyin: `xíng shǐ` },
      { hanzi: `行驶`, pinyin: `xíng shǐ` },
      { hanzi: `行为`, pinyin: `xíng wéi` },
      { hanzi: `行业`, pinyin: `háng yè` },
      { hanzi: `行政`, pinyin: `xíng zhèng` },
      { hanzi: `行走`, pinyin: `xíng zǒu` },
      { hanzi: `言行`, pinyin: `yán xíng` },
      { hanzi: `一行`, pinyin: `yī xíng` },
      { hanzi: `一言一行`, pinyin: `yī yán yī xíng` },
      { hanzi: `衣食住行`, pinyin: `yī shí zhù xíng` },
      { hanzi: `银行`, pinyin: `yín háng` },
      { hanzi: `银行卡`, pinyin: `yín háng kǎ` },
      { hanzi: `游行`, pinyin: `yóu xíng` },
      { hanzi: `运行`, pinyin: `yùn xíng` },
      { hanzi: `执行`, pinyin: `zhí xíng` },
      { hanzi: `自行`, pinyin: `zì xíng` },
      { hanzi: `自行车`, pinyin: `zì xíng chē` },
    ] as { hanzi: HanziText; pinyin: PinyinText }[],
  },
];

describeEval(
  `buildCharacterCoreMeaningsSpecPrompt eval`,
  {
    harness: createResponsePromptHarness(buildCharacterCoreMeaningsSpecPrompt),
  },
  (it) => {
    it.for(promptCases)(`$character`, async (spec, { run }) => {
      await run(spec);
    });
  },
);
