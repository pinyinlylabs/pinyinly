import {
  convertPinyinWithToneNumberToToneMark,
  parsePinyinSyllableOrThrow,
} from "@/data/pinyin";
import {
  allOneSyllableHanzi,
  allOneSyllablePronunciationsForHanzi,
  hanziFromHanziWord,
  loadPinyinWords,
  lookupHanziWord,
  oneSyllablePinyinOrThrow,
  pinyinOrThrow,
} from "@/dictionary/dictionary";
import {
  identicalInvariant,
  invariant,
  nonNullable,
  uniqueInvariant,
} from "@haohaohow/lib/invariant";
import shuffle from "lodash/shuffle";
import type {
  HanziChar,
  HanziText,
  HanziWord,
  OneCorrectPairQuestion,
  OneCorrectPairQuestionAnswer,
  OneCorrectPairQuestionChoice,
  PinyinSyllable,
  Question,
} from "../model";
import { QuestionKind } from "../model";
import type { HanziWordSkill } from "../rizzleSchema";
import { hanziWordFromSkill } from "../skills";
import {
  hanziOrPinyinSyllableCount,
  oneCorrectPairChoiceText,
} from "./oneCorrectPair";

export async function hanziWordToPinyinFinalQuestionOrThrow(
  skill: HanziWordSkill,
): Promise<Question> {
  const hanziWord = hanziWordFromSkill(skill);
  const meaning = await lookupHanziWord(hanziWord);
  const rowCount = 5;
  const answer: OneCorrectPairQuestionAnswer = {
    a: { kind: `hanzi`, value: hanziFromHanziWord(hanziWord) },
    b: { kind: `pinyin`, value: pinyinOrThrow(hanziWord, meaning) },
    skill,
  };

  const ctx = await makeQuestionContext(hanziWord);
  await addDistractors(ctx, rowCount - 1);

  const groupA: OneCorrectPairQuestionChoice[] = ctx.hanziDistractors.map(
    (hanzi) => ({ kind: `hanzi`, value: hanzi }),
  );
  const groupB: OneCorrectPairQuestionChoice[] = ctx.pinyinDistractors.map(
    (pinyin) => ({ kind: `pinyin`, value: [pinyin] }),
  );

  return validQuestionInvariant({
    kind: QuestionKind.OneCorrectPair,
    prompt: `Match a word with its pinyin`,
    groupA: shuffle([...groupA, answer.a]),
    groupB: shuffle([...groupB, answer.b]),
    answer,
  });
}

interface QuestionContext {
  /**
   * The tone of the correct answer, so that distractors can have the same value.
   */
  answerPinyinTone: number;
  /**
   * The initial of the correct answer, so that distractors can have the same value.
   */
  answerPinyinInitial: string;
  /**
   * Keep track of which hanzi have been used so that we don't have multiple
   * choices with the same hanzi or meaning.
   */
  usedHanzi: Set<string>;
  /**
   * Keep track of which pinyin have been used so that we don't have multiple
   * choices in the quiz that have the same correct answer. Otherwise there
   * could be a pair of "wrong choices" that have overlapping pinyin and if
   * picked would be marked incorrect.
   */
  usedPinyin: Set<string>;

  pinyinDistractors: PinyinSyllable[];
  hanziDistractors: HanziText[];
}

export async function makeQuestionContext(
  correctAnswer: HanziWord,
): Promise<QuestionContext> {
  const hanzi = hanziFromHanziWord(correctAnswer);
  const meaning = await lookupHanziWord(correctAnswer);
  const pinyin = oneSyllablePinyinOrThrow(correctAnswer, meaning);
  const parsedPinyin = parsePinyinSyllableOrThrow(pinyin);

  const ctx: QuestionContext = {
    answerPinyinInitial: parsedPinyin.initialChartLabel,
    answerPinyinTone: parsedPinyin.tone,
    usedHanzi: new Set([hanzi]),
    usedPinyin: new Set(await allOneSyllablePronunciationsForHanzi(hanzi)),
    pinyinDistractors: [],
    hanziDistractors: [],
  };

  return ctx;
}

export async function tryHanziDistractor(
  ctx: QuestionContext,
  hanzi: HanziChar,
): Promise<boolean> {
  // Don't include if there's overlapping hanzi
  if (ctx.usedHanzi.has(hanzi)) {
    return false;
  }

  // Don't use any words that have overlapping pinyin.
  for (const pinyin of await allOneSyllablePronunciationsForHanzi(hanzi)) {
    if (ctx.usedPinyin.has(pinyin)) {
      return false;
    }
  }

  // No conflicts, add it.
  ctx.hanziDistractors.push(hanzi as HanziText);

  return true;
}

export function tryPinyinDistractor(
  ctx: QuestionContext,
  pinyin: PinyinSyllable,
): boolean {
  const parsedPinyin = parsePinyinSyllableOrThrow(pinyin);

  if (ctx.answerPinyinInitial !== parsedPinyin.initialChartLabel) {
    return false;
  }

  if (ctx.answerPinyinTone !== parsedPinyin.tone) {
    return false;
  }

  if (ctx.usedPinyin.has(pinyin)) {
    return false;
  }

  // No conflicts, add it.
  ctx.usedPinyin.add(pinyin);
  ctx.pinyinDistractors.push(pinyin);

  return true;
}

async function addDistractors(
  ctx: QuestionContext,
  count: number,
): Promise<void> {
  // IMPORTANT: pinyin distractors must be added first, then hanzi are added if
  // they don't conflict.
  const pinyinWords = [
    ...shuffle(await loadPinyinWords()),
    // non-existant pinyin used as fillers
    ...shuffle(fakePinyin),
  ];
  for (const tonelessPinyin of pinyinWords) {
    const pinyin = convertPinyinWithToneNumberToToneMark(
      `${tonelessPinyin}${ctx.answerPinyinTone}`,
    );

    tryPinyinDistractor(ctx, pinyin);

    if (ctx.pinyinDistractors.length === count) {
      break;
    }
  }

  invariant(
    ctx.pinyinDistractors.length == count,
    `couldn't get enough pinyin distractors ${ctx.pinyinDistractors.length} != ${count} (initial=${ctx.answerPinyinInitial}, tone=${ctx.answerPinyinTone})`,
  );

  //
  // Add hanzi distractors.
  //
  const allHanziCandiates = shuffle([...(await allOneSyllableHanzi())]);
  for (const hanzi of allHanziCandiates) {
    await tryHanziDistractor(ctx, hanzi);

    if (ctx.hanziDistractors.length === count) {
      break;
    }
  }

  invariant(
    ctx.hanziDistractors.length == count,
    `couldn't get enough hanzi distractors ${ctx.hanziDistractors.length} != ${count} (initial=${ctx.answerPinyinInitial}, tone=${ctx.answerPinyinTone})`,
  );
}

function validQuestionInvariant(question: OneCorrectPairQuestion) {
  // Ensure there aren't two identical choices in the same group.
  uniqueInvariant(question.groupA.map((x) => oneCorrectPairChoiceText(x)));
  uniqueInvariant(question.groupB.map((x) => oneCorrectPairChoiceText(x)));
  // Ensure the answer is included.
  invariant(question.groupA.includes(question.answer.a));
  invariant(question.groupB.includes(question.answer.b));
  // Ensure all choices are the same length.
  identicalInvariant([
    ...question.groupA.map((x) => hanziOrPinyinSyllableCount(x)),
    ...question.groupB.map((x) => hanziOrPinyinSyllableCount(x)),
  ]);
  // Ensure all pinyin have the same initial and tone.
  identicalInvariant(
    question.groupB.map((x) => {
      invariant(x.kind === `pinyin`);
      invariant(hanziOrPinyinSyllableCount(x) === 1);

      const syllable = nonNullable(x.value[0]);
      const { initialChartLabel: initial, tone } =
        parsePinyinSyllableOrThrow(syllable);
      return `${initial}-${tone}`;
    }),
  );

  return question;
}

/**
 * Non-existant pinyin used as distractors in quizes.
 */
export const fakePinyin = [
  // yu fake finals
  `yuen`,
  `yuo`,
  // qu fake finals
  `quan`,
  `quei`,
  `que`,
  // mu fake finals
  `muan`,
  `muei`,
  `mue`,
  `muo`,
  // ju fake finals
  `juan`,
  `juei`,
  `jue`,
  // bu fake finals
  `buan`,
  `buei`,
  `bue`,
  `buo`,
  // pu fake finals
  `puan`,
  `puei`,
  `pue`,
  `puo`,
  // xu fake finals
  `xuan`,
  `xuei`,
  // lü fake finals
  `lüan`,
  `lüei`,
  `lüo`,
  // nü fake finals
  `nüan`,
  `nüei`,
  `nüo`,
  // nu fake finals
  `nuan`,
  `nuei`,
  `nuo`,
  `nui`,
  // lu fake finals
  `luan`,
  `luei`,
  // fu fake finals
  `fuan`,
  `fuei`,
  `fui`,
  `fuo`,
];
