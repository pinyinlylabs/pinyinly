import type { HanziWordMeaning } from "@/dictionary/dictionary";
import {
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
  glossOrThrow,
  hanziFromHanziWord,
  lookupHanziWord,
  pinyinOrThrow,
} from "@/dictionary/dictionary";
import { evenHalve } from "@/util/collections";
import { invariant, uniqueInvariant } from "@haohaohow/lib/invariant";
import shuffle from "lodash/shuffle";
import type { DeepReadonly } from "ts-essentials";
import type {
  HanziWord,
  OneCorrectPairQuestionAnswer,
  OneCorrectPairQuestionChoice,
  Question,
} from "../model";
import { QuestionKind, SkillKind } from "../model";
import type { HanziWordSkill, Skill } from "../rizzleSchema";
import { hanziWordFromSkill, skillKindFromSkill } from "../skills";

// generate a question to test a skill
export async function hanziWordToGlossQuestionOrThrow(
  skill: Skill,
): Promise<Question> {
  switch (skillKindFromSkill(skill)) {
    case SkillKind.HanziWordToGloss: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const meaning = await lookupHanziWord(hanziWord);
      const rowCount = 5;
      const answer: OneCorrectPairQuestionAnswer = {
        a: { kind: `hanzi`, value: hanziFromHanziWord(hanziWord) },
        b: { kind: `gloss`, value: glossOrThrow(hanziWord, meaning) },
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

      return validQuestionInvariant({
        kind: QuestionKind.OneCorrectPair,
        prompt: `Match a word with its name`,
        groupA: shuffle([...groupA, answer.a]),
        groupB: shuffle([...groupB, answer.b]),
        answer,
      });
    }
    case SkillKind.HanziWordToPinyin: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      const meaning = await lookupHanziWord(hanziWord);
      const rowCount = 5;
      const answer: OneCorrectPairQuestionAnswer = {
        a: { kind: `hanzi`, value: hanziFromHanziWord(hanziWord) },
        b: { kind: `pinyin`, value: pinyinOrThrow(hanziWord, meaning) },
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

      return validQuestionInvariant({
        kind: QuestionKind.OneCorrectPair,
        prompt: `Match a word with its name`,
        groupA: shuffle([...groupA, answer.a]),
        groupB: shuffle([...groupB, answer.b]),
        answer,
      });
    }
    case SkillKind.Deprecated_EnglishToRadical:
    case SkillKind.Deprecated_PinyinToRadical:
    case SkillKind.Deprecated_RadicalToEnglish:
    case SkillKind.Deprecated_RadicalToPinyin:
    case SkillKind.Deprecated:
    case SkillKind.GlossToHanziWord:
    case SkillKind.HanziWordToPinyinFinal:
    case SkillKind.HanziWordToPinyinInitial:
    case SkillKind.HanziWordToPinyinTone:
    case SkillKind.ImageToHanziWord:
    case SkillKind.PinyinFinalAssociation:
    case SkillKind.PinyinInitialAssociation:
    case SkillKind.PinyinToHanziWord: {
      throw new Error(`todo: not implemented`);
    }
  }
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

function validQuestionInvariant(question: Question) {
  switch (question.kind) {
    case QuestionKind.OneCorrectPair: {
      // Ensure there aren't two identical choices in the same group.
      uniqueInvariant(question.groupA.map((x) => x.value));
      uniqueInvariant(question.groupB.map((x) => x.value));
      invariant(question.groupA.includes(question.answer.a));
      invariant(question.groupB.includes(question.answer.b));
      break;
    }
    case QuestionKind.HanziToPinyin:
    case QuestionKind.MultipleChoice: {
      break;
    }
  }

  return question;
}
