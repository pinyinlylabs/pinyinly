import {
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
  hanziFromHanziWord,
  HanziWordMeaning,
  lookupHanziWord,
} from "@/dictionary/dictionary";
import { invariant, uniqueInvariant } from "@haohaohow/lib/invariant";
import shuffle from "lodash/shuffle";
import { DeepReadonly } from "ts-essentials";
import {
  HanziWord,
  OneCorrectPairQuestionAnswer,
  OneCorrectPairQuestionChoice,
  Question,
  QuestionType,
  SkillType,
} from "./model";
import { HanziWordSkill, Skill } from "./rizzleSchema";
import { hanziWordFromSkill, skillType } from "./skills";

function validQuestionInvariant(question: Question) {
  switch (question.type) {
    case QuestionType.OneCorrectPair: {
      // Ensure there aren't two identical choices in the same group.
      uniqueInvariant(question.groupA.map((x) => x.value));
      uniqueInvariant(question.groupB.map((x) => x.value));
      invariant(question.groupA.includes(question.answer.a));
      invariant(question.groupB.includes(question.answer.b));
      break;
    }
    case QuestionType.MultipleChoice: {
      break;
    }
  }

  return question;
}

function glossOrThrow(
  hanziWord: HanziWord,
  meaning: DeepReadonly<HanziWordMeaning> | null,
): string {
  const gloss = meaning?.gloss[0];
  invariant(gloss != null, `missing gloss for hanzi word ${hanziWord}`);
  return gloss;
}

// generate a question to test a skill
export async function generateQuestionForSkillOrThrow(
  skill: Skill,
): Promise<Question> {
  switch (skillType(skill)) {
    case SkillType.HanziWordToEnglish: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const meaning = await lookupHanziWord(hanziWord);
      const rowCount = 5;
      const answer: OneCorrectPairQuestionAnswer = {
        a: { type: `hanzi`, value: hanziFromHanziWord(hanziWord) },
        b: { type: `gloss`, value: glossOrThrow(hanziWord, meaning) },
        skill,
      };

      const [groupAHanziWords, groupBHanziWords] = evenHalve(
        await getWrongHanziWordAnswers(hanziWord, (rowCount - 1) * 2),
      );

      const groupA: OneCorrectPairQuestionChoice[] = groupAHanziWords.map(
        ([hanziWord, _meaning]) => ({
          type: `hanzi`,
          value: hanziFromHanziWord(hanziWord),
        }),
      );
      const groupB: OneCorrectPairQuestionChoice[] = groupBHanziWords.map(
        ([hanziWord, meaning]) => ({
          type: `gloss`,
          value: glossOrThrow(hanziWord, meaning),
        }),
      );

      return validQuestionInvariant({
        type: QuestionType.OneCorrectPair,
        prompt: `Match a word with its name`,
        groupA: shuffle([...groupA, answer.a]),
        groupB: shuffle([...groupB, answer.b]),
        answer,
      });
    }
    case SkillType.Deprecated_EnglishToRadical:
    case SkillType.Deprecated_PinyinToRadical:
    case SkillType.Deprecated_RadicalToEnglish:
    case SkillType.Deprecated_RadicalToPinyin:
    case SkillType.Deprecated:
    case SkillType.EnglishToHanziWord:
    case SkillType.HanziWordToPinyinFinal:
    case SkillType.HanziWordToPinyinInitial:
    case SkillType.HanziWordToPinyinTone:
    case SkillType.ImageToHanziWord:
    case SkillType.PinyinFinalAssociation:
    case SkillType.PinyinInitialAssociation:
    case SkillType.PinyinToHanziWord: {
      throw new Error(`todo: not implemented`);
    }
  }
}

function evenHalve<T>(items: T[]): [T[], T[]] {
  const splitIndex = Math.floor(items.length / 2);
  const a = items.slice(0, splitIndex);
  const b = items.slice(splitIndex, splitIndex + a.length);
  return [a, b];
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
    ctx.result.splice(0, ctx.result.length);
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
