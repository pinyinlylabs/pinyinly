import { isHanziCharacter } from "@/data/hanzi";
import type {
  HanziCharacter,
  HanziWord,
  HanziWordSkill,
  OneCorrectPairQuestion,
  OneCorrectPairQuestionAnswer,
  OneCorrectPairQuestionChoice,
  PinyinUnit,
  Question,
  QuestionFlagType,
} from "@/data/model";
import { QuestionKind } from "@/data/model";
import {
  normalizePinyinUnit,
  splitPinyinUnitOrThrow,
  splitPinyinUnitTone,
} from "@/data/pinyin";
import { hanziWordFromSkill } from "@/data/skills";
import {
  allHanziCharacterPronunciationsForHanzi,
  allHanziCharacters,
  hanziFromHanziWord,
  loadDictionary,
} from "@/dictionary";
import { arrayFilterUnique, emptyArray } from "@pinyinly/lib/collections";
import { identicalInvariant, invariant } from "@pinyinly/lib/invariant";
import shuffle from "lodash/shuffle";
import {
  hanziOrPinyinUnitCount,
  oneCorrectPairQuestionInvariant,
} from "./oneCorrectPair";

export async function hanziWordToPinyinToneQuestionOrThrow(
  skill: HanziWordSkill,
  flag: QuestionFlagType | null,
): Promise<Question> {
  const hanziWord = hanziWordFromSkill(skill);
  const rowCount = 5;

  const ctx = await makeQuestionContext(hanziWord);
  await addDistractors(ctx, rowCount);

  const answer: OneCorrectPairQuestionAnswer = {
    as: ctx.hanziAnswers.map((hanzi) => ({ kind: `hanzi`, value: hanzi })),
    bs: ctx.pinyinAnswers.map((pinyin) => ({
      kind: `pinyin`,
      value: pinyin,
    })),
    skill,
  };
  const groupA: OneCorrectPairQuestionChoice[] = [
    ...ctx.hanziDistractors.map(
      (hanzi) => ({ kind: `hanzi`, value: hanzi }) as const,
    ),
    ...answer.as,
  ];
  const groupB: OneCorrectPairQuestionChoice[] = [
    ...ctx.pinyinDistractors.map(
      (pinyin) => ({ kind: `pinyin`, value: pinyin }) as const,
    ),
    ...answer.bs,
  ];

  return validQuestionInvariant({
    kind: QuestionKind.OneCorrectPair,
    prompt: `Match a word with its pinyin`,
    groupA: shuffle(groupA),
    groupB: shuffle(groupB),
    answer,
    flag,
  });
}

interface QuestionContext {
  /**
   * Keep track of which hanzi have been used so that we don't have multiple
   * choices with the same hanzi or meaning.
   */
  usedHanzi: Set<HanziCharacter>;
  /**
   * Keep track of which pinyin have been used so that we don't have multiple
   * choices in the quiz that have the same correct answer. Otherwise there
   * could be a pair of "wrong choices" that have overlapping pinyin and if
   * picked would be marked incorrect.
   */
  usedPinyin: Set<PinyinUnit>;

  pinyinDistractors: PinyinUnit[];
  pinyinAnswers: readonly PinyinUnit[];
  /**
   * The toneless version of the correct pinyins, so that distractors can have
   * the same bases and differ by tone
   */
  pinyinAnswersToneless: readonly PinyinUnit[];
  hanziDistractors: HanziCharacter[];
  hanziAnswers: readonly HanziCharacter[];
}

export async function makeQuestionContext(
  correctAnswer: HanziWord,
): Promise<QuestionContext> {
  const hanzi = hanziFromHanziWord(correctAnswer);
  invariant(isHanziCharacter(hanzi), `expected single-character hanzi`);
  const dictionary = await loadDictionary();
  const meaning = dictionary.lookupHanziWord(correctAnswer);

  const hanziAnswers = [hanzi];
  const pinyinAnswers =
    meaning?.pinyin?.map((p) => p as PinyinUnit) ?? emptyArray;
  invariant(
    pinyinAnswers.length > 0,
    `hanzi word ${correctAnswer} has no pinyin`,
  );

  const pinyinAnswersToneless = pinyinAnswers
    .map((p) => splitPinyinUnitTone(p).tonelessUnit)
    .filter(arrayFilterUnique());

  const ctx: QuestionContext = {
    usedHanzi: new Set([hanzi]),
    usedPinyin: new Set(await allHanziCharacterPronunciationsForHanzi(hanzi)),
    pinyinAnswers,
    pinyinAnswersToneless,
    pinyinDistractors: [],
    hanziAnswers,
    hanziDistractors: [],
  };

  return ctx;
}

export async function tryHanziDistractor(
  ctx: QuestionContext,
  hanzi: HanziCharacter,
): Promise<boolean> {
  // Don't include if there's overlapping hanzi
  if (ctx.usedHanzi.has(hanzi)) {
    return false;
  }

  // Don't use any words that have overlapping pinyin.
  for (const pinyin of await allHanziCharacterPronunciationsForHanzi(hanzi)) {
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
  pinyin: PinyinUnit,
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

async function addDistractors(
  ctx: QuestionContext,
  targetTotalRows: number,
): Promise<void> {
  // IMPORTANT: pinyin distractors must be added first, then hanzi are added if
  // they don't conflict.

  // const tonelessPinyins = [ctx.answerPinyinToneless];
  const { pinyinAnswers, hanziAnswers } = ctx;
  const debugInfo = JSON.stringify({ pinyinAnswers, hanziAnswers });

  loop: for (const tonelessPinyin of ctx.pinyinAnswersToneless) {
    for (const tone of shuffle(toneSuffixes)) {
      const pinyin = normalizePinyinUnit(`${tonelessPinyin}${tone}`);

      tryPinyinDistractor(ctx, pinyin);

      if (
        ctx.pinyinAnswers.length + ctx.pinyinDistractors.length ===
        targetTotalRows
      ) {
        break loop;
      }
    }
  }

  invariant(
    ctx.pinyinDistractors.length > 0,
    `couldn't find at least one pinyin distractors (${debugInfo})`,
  );

  //
  // Add hanzi distractors.
  //
  const allHanziCandiates = shuffle([...(await allHanziCharacters())]);
  for (const hanzi of allHanziCandiates) {
    await tryHanziDistractor(ctx, hanzi);

    if (
      ctx.hanziAnswers.length + ctx.hanziDistractors.length ===
      targetTotalRows
    ) {
      break;
    }
  }

  invariant(
    ctx.hanziDistractors.length > 0,
    `couldn't find at least one hanzi distractor (${debugInfo})`,
  );
}

function validQuestionInvariant(question: OneCorrectPairQuestion) {
  oneCorrectPairQuestionInvariant(question);

  // Ensure all choices are single units.
  identicalInvariant([
    1, // require 1 unit
    ...question.groupA.map((a) => hanziOrPinyinUnitCount(a)),
    ...question.groupB.map((b) => hanziOrPinyinUnitCount(b)),
  ]);

  // Ensure all pinyin have the same initial and final as one of the answers.
  // They might all be identical because some hanzi have different pinyin finals
  // (e.g. 似:resemble is shì/sì).
  const answerPinyinParts = question.answer.bs.map((x) => {
    invariant(x.kind === `pinyin`);
    return splitPinyinUnitOrThrow(x.value as PinyinUnit);
  });
  for (const b of question.groupB) {
    invariant(b.kind === `pinyin`);
    const { initialSoundId: initialChartLabel, finalSoundId: finalChartLabel } =
      splitPinyinUnitOrThrow(b.value as PinyinUnit);
    invariant(
      answerPinyinParts.some(
        (x) =>
          x.initialSoundId === initialChartLabel &&
          x.finalSoundId === finalChartLabel,
      ),
    );
  }
  return question;
}
