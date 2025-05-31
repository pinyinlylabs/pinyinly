import type { HanziWordMeaning } from "@/dictionary/dictionary";
import { hanziFromHanziWord, lookupHanziWord } from "@/dictionary/dictionary";
import type { DeepReadonly } from "ts-essentials";
import { hanziWordToGlossQuestionOrThrow } from "./generators/hanziWordToGloss";
import { hanziWordToPinyinFinalQuestionOrThrow } from "./generators/hanziWordToPinyinFinal";
import { hanziWordToPinyinInitialQuestionOrThrow } from "./generators/hanziWordToPinyinInitial";
import { hanziWordToPinyinToneQuestionOrThrow } from "./generators/hanziWordToPinyinTone";
import type { HanziWord, Question } from "./model";
import { SkillKind } from "./model";
import type { HanziWordSkill, Skill } from "./rizzleSchema";
import { skillKindFromSkill } from "./skills";

export async function generateQuestionForSkillOrThrow(
  skill: Skill,
): Promise<Question> {
  switch (skillKindFromSkill(skill)) {
    case SkillKind.HanziWordToGloss: {
      skill = skill as HanziWordSkill;
      return await hanziWordToGlossQuestionOrThrow(skill);
    }
    case SkillKind.HanziWordToPinyinInitial: {
      skill = skill as HanziWordSkill;
      return await hanziWordToPinyinInitialQuestionOrThrow(skill);
    }
    case SkillKind.HanziWordToPinyinFinal: {
      skill = skill as HanziWordSkill;
      return await hanziWordToPinyinFinalQuestionOrThrow(skill);
    }
    case SkillKind.HanziWordToPinyinTone: {
      skill = skill as HanziWordSkill;
      return await hanziWordToPinyinToneQuestionOrThrow(skill);
    }
    case SkillKind.Deprecated_EnglishToRadical:
    case SkillKind.Deprecated_PinyinToRadical:
    case SkillKind.Deprecated_RadicalToEnglish:
    case SkillKind.Deprecated_RadicalToPinyin:
    case SkillKind.Deprecated:
    case SkillKind.GlossToHanziWord:
    case SkillKind.HanziWordToPinyin:
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
