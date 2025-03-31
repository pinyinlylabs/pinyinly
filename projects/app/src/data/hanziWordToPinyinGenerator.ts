import {
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
  glyphCount,
  hanziFromHanziWord,
  HanziWordMeaning,
  lookupHanziWord,
  splitHanziText,
  splitPinyinText,
} from "@/dictionary/dictionary";
import { evenHalve } from "@/util/collections";
import {
  identicalInvariant,
  invariant,
  uniqueInvariant,
} from "@haohaohow/lib/invariant";
import shuffle from "lodash/shuffle";
import { DeepReadonly } from "ts-essentials";
import {
  HanziWord,
  OneCorrectPairQuestionAnswer,
  OneCorrectPairQuestionChoice,
  PinyinText,
  Question,
  QuestionType,
} from "./model";
import { HanziWordSkill } from "./rizzleSchema";
import { hanziWordFromSkill } from "./skills";

export async function generateHanziWordToPinyinQuestionOrThrow(
  skill: HanziWordSkill,
): Promise<Question> {
  const hanziWord = hanziWordFromSkill(skill);
  const meaning = await lookupHanziWord(hanziWord);
  const rowCount = 5;
  const answer: OneCorrectPairQuestionAnswer = {
    a: { type: `hanzi`, value: hanziFromHanziWord(hanziWord) },
    b: { type: `pinyin`, value: pinyinOrThrow(hanziWord, meaning) },
    skill,
  };

  const [groupAHanziWords, groupBHanziWords] = evenHalve(
    await getDistractors(hanziWord, (rowCount - 1) * 2),
  );

  const groupA: OneCorrectPairQuestionChoice[] = groupAHanziWords.map(
    ([hanziWord, _meaning]) => ({
      type: `hanzi`,
      value: hanziFromHanziWord(hanziWord),
    }),
  );
  const groupB: OneCorrectPairQuestionChoice[] = groupBHanziWords.map(
    ([hanziWord, meaning]) => ({
      type: `pinyin`,
      value: pinyinOrThrow(hanziWord, meaning),
    }),
  );

  return validQuestionInvariant({
    type: QuestionType.OneCorrectPair,
    prompt: `Match a word with its pinyin`,
    groupA: shuffle([...groupA, answer.a]),
    groupB: shuffle([...groupB, answer.b]),
    answer,
  });
}

type Distractor = [HanziWord, DeepReadonly<HanziWordMeaning>][];

interface QuestionContext {
  /**
   * The number of words in the correct answer, so that distraction words can be
   * of the same length.
   */
  answerWordCount: number;
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
  /**
   * The final set of wrong choices to distract the user.
   */
  distractors: Distractor;
}

export async function shouldOmitHanziWord(
  ctx: QuestionContext,
  hanziWord: HanziWord,
): Promise<boolean> {
  const meaning = await lookupHanziWord(hanziWord);
  if (meaning == null) {
    return true;
  }

  // Only include words that have a pinyin.
  if (meaning.pinyin == null) {
    return true;
  }

  // Don't include if there's overlapping hanzi
  const hanzi = hanziFromHanziWord(hanziWord);
  if (ctx.usedHanzi.has(hanzi)) {
    return true;
  }

  // Don't use any words that have overlapping pinyin.
  for (const pinyin of meaning.pinyin) {
    if (ctx.usedPinyin.has(pinyin)) {
      return true;
    }
  }

  // Don't include if it's a different length to the correct answer.
  if (glyphCount(hanzi) !== ctx.answerWordCount) {
    return true;
  }

  return false;
}

export async function makeQuestionContext(
  correctAnswer: HanziWord,
): Promise<QuestionContext> {
  const ctx: QuestionContext = {
    answerWordCount: glyphCount(hanziFromHanziWord(correctAnswer)),
    usedHanzi: new Set(),
    usedPinyin: new Set(),
    distractors: [],
  };

  await addToContext(ctx, correctAnswer);
  ctx.distractors.splice(0, ctx.distractors.length); // remove the correct answer from the result

  return ctx;
}

export async function addToContext(
  ctx: QuestionContext,
  hanziWord: HanziWord,
): Promise<void> {
  const hanziWordMeaning = await lookupHanziWord(hanziWord);
  if (!hanziWordMeaning) {
    return;
  }

  if (hanziWordMeaning.pinyin) {
    for (const pinyin of hanziWordMeaning.pinyin) {
      ctx.usedPinyin.add(pinyin);
    }
  }

  ctx.usedHanzi.add(hanziFromHanziWord(hanziWord));

  ctx.distractors.push([hanziWord, hanziWordMeaning]);
}

async function getDistractors(
  hanziWord: HanziWord,
  count: number,
): Promise<Distractor> {
  const ctx = await makeQuestionContext(hanziWord);

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
    if (!(await shouldOmitHanziWord(ctx, x))) {
      await addToContext(ctx, x);

      if (ctx.distractors.length === count) {
        break;
      }
    }
  }

  invariant(
    ctx.distractors.length == count,
    `couldn't get enough other choices ${ctx.distractors.length} != ${count}`,
  );

  return ctx.distractors;
}

function validQuestionInvariant(question: Question) {
  switch (question.type) {
    case QuestionType.OneCorrectPair: {
      // Ensure there aren't two identical choices in the same group.
      uniqueInvariant(question.groupA.map((x) => x.value));
      uniqueInvariant(question.groupB.map((x) => x.value));
      // Ensure the answer is included.
      invariant(question.groupA.includes(question.answer.a));
      invariant(question.groupB.includes(question.answer.b));
      // Ensure all choices are the same length.
      identicalInvariant([
        ...question.groupA.map((x) => hanziOrPinyinWordCount(x)),
        ...question.groupB.map((x) => hanziOrPinyinWordCount(x)),
      ]);
      break;
    }
    case QuestionType.MultipleChoice: {
      break;
    }
  }

  return question;
}

function hanziOrPinyinWordCount(choice: OneCorrectPairQuestionChoice): number {
  switch (choice.type) {
    case `hanzi`: {
      return splitHanziText(choice.value).length;
    }
    case `pinyin`: {
      return splitPinyinText(choice.value).length;
    }
    case `gloss`: {
      throw new Error(`unexpected gloss choice in HanziWordToPinyin`);
    }
  }
}

function pinyinOrThrow(
  hanziWord: HanziWord,
  meaning: DeepReadonly<HanziWordMeaning> | null,
): PinyinText {
  const pinyin = meaning?.pinyin?.[0];
  invariant(pinyin != null, `missing pinyin for hanzi word ${hanziWord}`);
  return pinyin;
}
