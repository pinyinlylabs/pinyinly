import type { HanziWordMeaning } from "@/dictionary/dictionary";
import {
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
  glossOrThrow,
  hanziFromHanziWord,
  lookupHanziWord,
} from "@/dictionary/dictionary";
import { evenHalve } from "@pinyinly/lib/collections";
import { invariant } from "@pinyinly/lib/invariant";
import shuffle from "lodash/shuffle";
import type { DeepReadonly } from "ts-essentials";
import type {
  HanziWord,
  OneCorrectPairQuestionAnswer,
  OneCorrectPairQuestionChoice,
  Question,
} from "../model";
import { QuestionKind } from "../model";
import type { HanziWordSkill } from "../rizzleSchema";
import { hanziWordFromSkill } from "../skills";
import { oneCorrectPairQuestionInvariant } from "./oneCorrectPair";

export async function hanziWordToGlossQuestionOrThrow(
  skill: HanziWordSkill,
): Promise<Question> {
  const hanziWord = hanziWordFromSkill(skill);
  const meaning = await lookupHanziWord(hanziWord);
  const rowCount = 5;
  const answer: OneCorrectPairQuestionAnswer = {
    as: [{ kind: `hanzi`, value: hanziFromHanziWord(hanziWord) }],
    bs: [{ kind: `gloss`, value: glossOrThrow(hanziWord, meaning) }],
    skill,
  };

  const [groupAHanziWords, groupBHanziWords] = evenHalve(
    await getWrongHanziWordAnswers(hanziWord, (rowCount - 1) * 2),
  );

  const groupA: OneCorrectPairQuestionChoice[] = groupAHanziWords.map(
    ([hanziWord, _meaning]) => ({
      kind: `hanzi`,
      value: hanziFromHanziWord(hanziWord),
    }),
  );
  const groupB: OneCorrectPairQuestionChoice[] = groupBHanziWords.map(
    ([hanziWord, meaning]) => ({
      kind: `gloss`,
      value: glossOrThrow(hanziWord, meaning),
    }),
  );

  const question = {
    kind: QuestionKind.OneCorrectPair,
    prompt: `Match a word with its meaning`,
    groupA: shuffle([...groupA, ...answer.as]),
    groupB: shuffle([...groupB, ...answer.bs]),
    answer,
  };
  oneCorrectPairQuestionInvariant(question);
  return question;
}

type OtherHanziResult = [HanziWord, DeepReadonly<HanziWordMeaning>][];

interface WrongAnswersQuizContext {
  /**
   * Keep track of which hanzi have been used so that we don't have multiple
   * choices with the same hanzi or meaning.
   */
  usedHanzi: Set<string>;
  /**
   * Keep track of which glosses have been used so that we don't have multiple
   * choices in the quiz that have the same meaning. Otherwise there could be a
   * pair of "wrong choices" that have overlapping meanings and if picked would
   * be marked incorrect.
   */
  usedGlosses: Set<string>;
  /**
   * The final set of wrong answers.
   */
  result: OtherHanziResult;
}

export async function shouldOmitHanziWord(
  hanziWord: HanziWord,
  ctx: WrongAnswersQuizContext,
): Promise<boolean> {
  const meaning = await lookupHanziWord(hanziWord);
  if (meaning == null) {
    return true;
  }

  const hanzi = hanziFromHanziWord(hanziWord);
  if (ctx.usedHanzi.has(hanzi)) {
    return true;
  }

  // Don't use any words that have meanings that are too similar and could be
  // confusing.
  for (const gloss of meaning.gloss) {
    if (ctx.usedGlosses.has(gloss)) {
      return true;
    }
  }

  return false;
}

export async function makeQuizContext(
  correctAnswer?: HanziWord,
): Promise<WrongAnswersQuizContext> {
  const ctx: WrongAnswersQuizContext = {
    usedHanzi: new Set(),
    usedGlosses: new Set(),
    result: [],
  };

  if (correctAnswer != null) {
    await addToQuizContext(correctAnswer, ctx);
    ctx.result.splice(0);
  }

  return ctx;
}

export async function addToQuizContext(
  hanziWord: HanziWord,
  ctx: WrongAnswersQuizContext,
): Promise<void> {
  const hanziWordMeaning = await lookupHanziWord(hanziWord);
  if (!hanziWordMeaning) {
    return;
  }

  for (const gloss of hanziWordMeaning.gloss) {
    ctx.usedGlosses.add(gloss);
  }

  ctx.usedHanzi.add(hanziFromHanziWord(hanziWord));

  ctx.result.push([hanziWord, hanziWordMeaning]);
}

async function getWrongHanziWordAnswers(
  hanziWord: HanziWord,
  count: number,
): Promise<OtherHanziResult> {
  // Don't have anything conflict with the correct answer.
  const ctx = await makeQuizContext(hanziWord);

  const [hsk1HanziWords, hsk2HanziWords, hsk3HanziWords] = await Promise.all([
    allHsk1HanziWords(),
    allHsk2HanziWords(),
    allHsk3HanziWords(),
  ]);

  // Use words from the same HSK word list if possible, so that they're more
  // likely to be familiar by being in a similar skill level. Otherwise fallback
  // all HSK words.
  const allHanziWords = [hsk1HanziWords, hsk2HanziWords, hsk3HanziWords].find(
    (words) => words.includes(hanziWord),
  ) ?? [...hsk1HanziWords, ...hsk2HanziWords, ...hsk3HanziWords];

  for (const x of shuffle(allHanziWords)) {
    if (!(await shouldOmitHanziWord(x, ctx))) {
      await addToQuizContext(x, ctx);

      if (ctx.result.length === count) {
        break;
      }
    }
  }

  invariant(
    ctx.result.length == count,
    `couldn't get enough other choices ${ctx.result.length} != ${count}`,
  );

  return ctx.result;
}
