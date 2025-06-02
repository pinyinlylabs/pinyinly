import {
  convertPinyinWithToneNumberToToneMark,
  parsePinyinSyllableTone,
} from "@/data/pinyin";
import {
  allOneSyllableHanzi,
  allOneSyllablePronunciationsForHanzi,
  characterCount,
  hanziFromHanziWord,
  lookupHanziWord,
  parsePinyinSyllableOrThrow,
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
  oneSyllablePinyinOrThrow,
} from "./util";

export async function hanziWordToPinyinToneQuestionOrThrow(
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
   * The toneless version of the correct pinyin, so that distractors can have
   * the same base and differ by tone
   */
  answerPinyinToneless: string;
  answerPinyinInitial: string;
  /**
   * Keep track of which hanzi have been used so that we don't have multiple
   * choices with the same hanzi or meaning.
   */
  usedHanzi: Set<HanziChar>;
  /**
   * Keep track of which pinyin have been used so that we don't have multiple
   * choices in the quiz that have the same correct answer. Otherwise there
   * could be a pair of "wrong choices" that have overlapping pinyin and if
   * picked would be marked incorrect.
   */
  usedPinyin: Set<PinyinSyllable>;

  pinyinDistractors: PinyinSyllable[];
  hanziDistractors: HanziChar[];
}

export async function makeQuestionContext(
  correctAnswer: HanziWord,
): Promise<QuestionContext> {
  const hanzi = hanziFromHanziWord(correctAnswer);
  const meaning = await lookupHanziWord(correctAnswer);
  const pinyin = oneSyllablePinyinOrThrow(correctAnswer, meaning);
  const parsedPinyin = parsePinyinSyllableTone(pinyin);
  const { initial } = parsePinyinSyllableOrThrow(pinyin);
  invariant(
    parsedPinyin != null,
    `couldn't parse pinyin ${pinyin} for ${correctAnswer}`,
  );
  const [answerPinyinToneless] = parsedPinyin;

  const ctx: QuestionContext = {
    answerPinyinToneless,
    answerPinyinInitial: initial,
    usedHanzi: new Set([hanzi as unknown as HanziChar]),
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

  if (characterCount(hanzi) !== 1) {
    return false;
  }

  // Don't use any words that have overlapping pinyin.
  for (const pinyin of await allOneSyllablePronunciationsForHanzi(hanzi)) {
    if (ctx.usedPinyin.has(pinyin)) {
      return false;
    }
  }

  // No conflicts, add it.
  ctx.hanziDistractors.push(hanzi);

  return true;
}

export function tryPinyinDistractor(
  ctx: QuestionContext,
  pinyin: PinyinSyllable,
): boolean {
  if (ctx.usedPinyin.has(pinyin)) {
    return false;
  }

  // No conflicts, add it.
  ctx.usedPinyin.add(pinyin);
  ctx.pinyinDistractors.push(pinyin);

  return true;
}

const toneSuffixes = [``, 1, 2, 3, 4, 5];
const extraVowelVariations: [string, string][] = [
  [`u`, `ü`],
  [`ü`, `u`],
  [`e`, `ë`],
  [`ë`, `e`],
  [`a`, `ä`],
  [`i`, `ï`],
  [`ï`, `i`],
];

async function addDistractors(
  ctx: QuestionContext,
  count: number,
): Promise<void> {
  // IMPORTANT: pinyin distractors must be added first, then hanzi are added if
  // they don't conflict.

  const tonelessPinyins = [ctx.answerPinyinToneless];

  // In some cases the answer has multiple correct pinyin (e.g. "wǔ" and "wū")
  // and there are not enough pinyin distractors that can be generated, so we
  // add some extra variations.
  for (const [vowel, replacement] of extraVowelVariations) {
    if (ctx.answerPinyinToneless.includes(vowel)) {
      tonelessPinyins.push(
        ctx.answerPinyinToneless.replace(vowel, replacement),
      );
    }
  }

  loop: for (const tonelessPinyin of tonelessPinyins) {
    for (const tone of shuffle(toneSuffixes)) {
      const pinyin = convertPinyinWithToneNumberToToneMark(
        `${tonelessPinyin}${tone}`,
      );

      tryPinyinDistractor(ctx, pinyin);

      if (ctx.pinyinDistractors.length === count) {
        break loop;
      }
    }
  }

  invariant(
    ctx.pinyinDistractors.length == count,
    `couldn't get enough pinyin distractors ${ctx.pinyinDistractors.length} != ${count} (answerPinyinToneless=${ctx.answerPinyinToneless})`,
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
    `couldn't get enough hanzi distractors ${ctx.hanziDistractors.length} != ${count} (answerPinyinToneless=${ctx.answerPinyinToneless})`,
  );
}

function validQuestionInvariant(question: OneCorrectPairQuestion) {
  // Ensure there aren't two identical choices in the same group.
  uniqueInvariant(question.groupA.map((x) => oneCorrectPairChoiceText(x)));
  uniqueInvariant(question.groupB.map((x) => oneCorrectPairChoiceText(x)));
  // Ensure the answer is included.
  invariant(question.groupA.includes(question.answer.a));
  invariant(question.groupB.includes(question.answer.b));
  // Ensure all choices are single syllable.
  identicalInvariant([
    ...question.groupA.map((x) => hanziOrPinyinSyllableCount(x)),
    ...question.groupB.map((x) => hanziOrPinyinSyllableCount(x)),
  ]);
  // Ensure all pinyin have the same initial and final
  identicalInvariant(
    question.groupB.map((x) => {
      invariant(x.kind === `pinyin`);
      invariant(hanziOrPinyinSyllableCount(x) === 1);

      const syllable = nonNullable(x.value[0]);
      const { initial, final } =
        parsePinyinSyllableWithVowelVariationsOrThrow(syllable);
      return `${initial}-${final}`;
    }),
  );

  return question;
}

function parsePinyinSyllableWithVowelVariationsOrThrow(
  syllable: PinyinSyllable,
): ReturnType<typeof parsePinyinSyllableOrThrow> {
  try {
    // Standard pinyin should work.
    return parsePinyinSyllableOrThrow(syllable);
  } catch {
    // Maybe it failed because of extra vowel variations, reverse that and try again.
    const toneResult = parsePinyinSyllableTone(syllable);
    let [base] = nonNullable(toneResult);

    for (const [vowel, replacement] of extraVowelVariations) {
      if (base.includes(replacement)) {
        base = base.replace(replacement, vowel);
        break;
      }
    }

    return parsePinyinSyllableOrThrow(base);
  }
}
