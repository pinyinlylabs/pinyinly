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
} from "@pinyinly/lib/invariant";
import shuffle from "lodash/shuffle";
import type {
  HanziGrapheme,
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
  oneCorrectPairQuestionInvariant,
} from "./oneCorrectPair";

export async function hanziWordToPinyinFinalQuestionOrThrow(
  skill: HanziWordSkill,
): Promise<Question> {
  const hanziWord = hanziWordFromSkill(skill);
  const meaning = await lookupHanziWord(hanziWord);
  const rowCount = 5;
  const answer: OneCorrectPairQuestionAnswer = {
    as: [{ kind: `hanzi`, value: hanziFromHanziWord(hanziWord) }],
    bs: [{ kind: `pinyin`, value: pinyinOrThrow(hanziWord, meaning) }],
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
    groupA: shuffle([...groupA, ...answer.as]),
    groupB: shuffle([...groupB, ...answer.bs]),
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
    answerPinyinInitial: parsedPinyin.initialSoundId,
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
  hanzi: HanziGrapheme,
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
  strict = true,
): boolean {
  const parsedPinyin = parsePinyinSyllableOrThrow(pinyin);

  if (strict && ctx.answerPinyinInitial !== parsedPinyin.initialSoundId) {
    return false;
  }

  if (strict && ctx.answerPinyinTone !== parsedPinyin.tone) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
  if (ctx.answerPinyinInitial[0] !== parsedPinyin.initialSoundId[0]) {
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
    // ...shuffle(fakePinyin),
  ];
  loop: for (const strict of [true, false]) {
    for (const tonelessPinyin of pinyinWords) {
      const pinyin = convertPinyinWithToneNumberToToneMark(
        `${tonelessPinyin}${ctx.answerPinyinTone}`,
      );

      tryPinyinDistractor(ctx, pinyin, strict);

      if (ctx.pinyinDistractors.length === count) {
        break loop;
      }
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
  oneCorrectPairQuestionInvariant(question);

  // Ensure all choices are the same length.
  identicalInvariant([
    ...question.groupA.map((x) => hanziOrPinyinSyllableCount(x)),
    ...question.groupB.map((x) => hanziOrPinyinSyllableCount(x)),
  ]);
  // Ensure all pinyin have the same-ish start (but not necessarily initial)
  // and tone. We can't guarantee they'll all have the same initial because in
  // non-strict mode we allow distractors with different initials (as long as
  // they have the same first letter).
  identicalInvariant(
    question.groupB.map((x) => {
      invariant(x.kind === `pinyin`);
      invariant(hanziOrPinyinSyllableCount(x) === 1);

      const syllable = nonNullable(x.value[0]);
      const { initialSoundId, tone } = parsePinyinSyllableOrThrow(syllable);
      // This is the first letter of the sound ID (NOT the first letter of the
      // pinyin). The difference here is for the "null" initial ∅-. In this case
      // we allow choices that actually have a different first letter, as long
      // as their pinyin split initial ID is `∅-`.
      const fuzzyInitialId = nonNullable(initialSoundId[0]);
      return `${fuzzyInitialId}…${tone}`;
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
