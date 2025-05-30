import type { Rating } from "@/util/fsrs";
import type { Interval } from "date-fns";
import { z } from "zod/v4";
import type { Skill } from "./rizzleSchema";

const pinyinInitialGroupIdSchema = z.enum({
  Basic: `debug--Basic`,
  _i: `debug--_i`,
  _u: `debug--_u`,
  _v: `debug--_v`,
  Null: `debug--Null`,
  Everything: `debug--Everything`,
});
export const PinyinInitialGroupId = pinyinInitialGroupIdSchema.enum;
export type PinyinInitialGroupId = z.infer<typeof pinyinInitialGroupIdSchema>;

export const mnemonicThemeIdSchema = z.enum({
  AnimalSpecies: `debug--AnimalSpecies`,
  GreekMythologyCharacter: `debug--GreekMythologyCharacter`,
  MythologyCharacter: `debug--MythologyCharacter`,
  WesternCultureFamousMen: `debug--WesternCultureFamousMen`,
  WesternCultureFamousWomen: `debug--WesternCultureFamousWomen`,
  WesternMythologyCharacter: `debug--WesternMythologyCharacter`,
});
export const MnemonicThemeId = mnemonicThemeIdSchema.enum;
export type MnemonicThemeId = z.infer<typeof mnemonicThemeIdSchema>;

export interface BaseSrsState {
  prevReviewAt: Date;
  nextReviewAt: Date;
}

export const srsTypeSchema = z.enum({
  Mock: `debug--Mock`,
  FsrsFourPointFive: `debug--FsrsFourPointFive`,
});
export const SrsType = srsTypeSchema.enum;
export type SrsType = z.infer<typeof srsTypeSchema>;

/**
 * A placeholder to force the code to be structured to allow multiple SRS
 * algorithms. This is not used for anything.
 */
export interface SrsStateMock extends BaseSrsState {
  type: typeof SrsType.Mock;
}

/**
 * FSRS 4.5 specific parameters.
 */
export interface SrsStateFsrsFourPointFive extends BaseSrsState {
  type: typeof SrsType.FsrsFourPointFive;
  stability: number;
  difficulty: number;
}

export type SrsState = SrsStateMock | SrsStateFsrsFourPointFive;

const skillTypeSchema = z.enum({
  /**
   * When shown a hanzi word, write the english translation.
   */
  HanziWordToGloss: `debug--HanziWordToGloss`,
  /**
   * When shown a Hanzi be able to write the pinyin using the keyboard without
   * any other hints.
   */
  HanziWordToPinyin: `debug--HanziWordToPinyin`,
  HanziWordToPinyinFinal: `debug--HanziWordToPinyinFinal`,
  HanziWordToPinyinInitial: `debug--HanziWordToPinyinInitial`,
  HanziWordToPinyinTone: `debug--HanziWordToPinyinTone`,
  /**
   * When shown a gloss, write the hanzi characters.
   */
  GlossToHanziWord: `debug--GlossToHanziWord`,
  /**
   * Given a pinyin word, write the hanzi character.
   */
  PinyinToHanziWord: `debug--PinyinToHanzi`,
  ImageToHanziWord: `debug--ImageToHanzi`,
  /**
   * Given an initial like `p`, remember the name of the associated
   * character/actor/entity etc.
   */
  PinyinInitialAssociation: `debug--PinyinInitialAssociation`,
  PinyinFinalAssociation: `debug--PinyinFinalAssociation`,

  //
  // Deprecated
  //
  Deprecated: `debug--Deprecated`,
  Deprecated_RadicalToEnglish: `debug--RadicalToEnglish`,
  Deprecated_EnglishToRadical: `debug--EnglishToRadical`,
  Deprecated_RadicalToPinyin: `debug--RadicalToPinyin`,
  Deprecated_PinyinToRadical: `debug--PinyinToRadical`,
});
export const SkillType = skillTypeSchema.enum;
export type SkillType = z.infer<typeof skillTypeSchema>;

const partOfSpeechSchema = z.enum({
  Noun: `debug--Noun`,
  Verb: `debug--Verb`,
  Adjective: `debug--Adjective`,
  Adverb: `debug--Adverb`,
  Pronoun: `debug--Pronoun`,
  Preposition: `debug--Preposition`,
  Conjunction: `debug--Conjunction`,
  Interjection: `debug--Interjection`,
  MeasureWord: `debug--MeasureWord`,
  Particle: `debug--Particle`,
});
export const PartOfSpeech = partOfSpeechSchema.enum;
export type PartOfSpeech = z.infer<typeof partOfSpeechSchema>;

export type HanziWord = (string & z.BRAND<`HanziWord`>) | `${string}:${string}`; // useful when writing literal strings in tests

/**
 * Space-separated string of pinyin.
 *
 * This makes it easier to split into individual pinyin words for rendering or
 * other processing.
 */
export type PinyinText = string & z.BRAND<`PinyinText`>;

/**
 * Non-space separated hanzi text.
 */
export type HanziText = string & z.BRAND<`HanziText`>;

/**
 * Single Hanzi character
 */
export type HanziChar = string & z.BRAND<`HanziChar`>;

export type HanziWordSkillType =
  | typeof SkillType.HanziWordToGloss
  | typeof SkillType.HanziWordToPinyin
  | typeof SkillType.HanziWordToPinyinInitial
  | typeof SkillType.HanziWordToPinyinFinal
  | typeof SkillType.HanziWordToPinyinTone
  | typeof SkillType.GlossToHanziWord
  | typeof SkillType.PinyinToHanziWord
  | typeof SkillType.ImageToHanziWord;

export const hanziWordSkillTypes: HanziWordSkillType[] = [
  SkillType.HanziWordToGloss,
  SkillType.HanziWordToPinyin,
  SkillType.HanziWordToPinyinInitial,
  SkillType.HanziWordToPinyinFinal,
  SkillType.HanziWordToPinyinTone,
];

const questionFlagTypeSchema = z.enum({
  NewSkill: `debug--NewSkill`,
  Overdue: `debug--Overdue`,
  Retry: `debug--Retry`,
  WeakWord: `debug--WeakWord`,
});
export const QuestionFlagType = questionFlagTypeSchema.enum;
export type QuestionFlagType = z.infer<typeof questionFlagTypeSchema>;

export interface QuestionFlagRetry {
  type: typeof QuestionFlagType.Retry;
}

export interface QuestionFlagOverdue {
  type: typeof QuestionFlagType.Overdue;
  interval: Interval;
}

export interface QuestionFlagWeakWord {
  type: typeof QuestionFlagType.WeakWord;
}

export interface QuestionFlagNewSkill {
  type: typeof QuestionFlagType.NewSkill;
}

export type QuestionFlag =
  | QuestionFlagWeakWord
  | QuestionFlagNewSkill
  | QuestionFlagOverdue
  | QuestionFlagRetry;

const questionTypeSchema = z.enum({
  MultipleChoice: `debug--MultipleChoice`,
  OneCorrectPair: `debug--OneCorrectPair`,
});
export const QuestionType = questionTypeSchema.enum;
export type QuestionType = z.infer<typeof questionTypeSchema>;

export interface MultipleChoiceQuestion {
  type: typeof QuestionType.MultipleChoice;
  prompt: string;
  answer: string;
  flag?: QuestionFlag;
  choices: readonly string[];
}

const mistakeTypeSchema = z.enum({
  HanziGloss: `debug--HanziGloss`,
  HanziPinyin: `debug--HanziPinyin`,
  HanziPinyinInitial: `debug--HanziPinyinInitial`,
});
export const MistakeType = mistakeTypeSchema.enum;
export type MistakeType = z.infer<typeof mistakeTypeSchema>;

export interface HanziGlossMistake {
  type: typeof MistakeType.HanziGloss;
  hanzi: HanziText;
  gloss: string;
}

export interface HanziPinyinMistake {
  type: typeof MistakeType.HanziPinyin;
  hanzi: HanziText;
  pinyin: PinyinText;
}

export interface HanziPinyinInitialMistake {
  type: typeof MistakeType.HanziPinyinInitial;
  hanzi: string;
  pinyinInitial: string;
}

export type Mistake =
  | HanziGlossMistake
  | HanziPinyinMistake
  | HanziPinyinInitialMistake;

export interface NewSkillRating {
  skill: Skill;
  rating: Rating;
  durationMs: number;
}

export type OneCorrectPairQuestionHanziChoice = {
  type: `hanzi`;
  value: HanziText;
};

export type OneCorrectPairQuestionGlossChoice = {
  type: `gloss`;
  value: string;
};

export type OneCorrectPairQuestionPinyinChoice = {
  type: `pinyin`;
  value: PinyinText;
};

export type OneCorrectPairQuestionChoice =
  | OneCorrectPairQuestionHanziChoice
  | OneCorrectPairQuestionGlossChoice
  | OneCorrectPairQuestionPinyinChoice;

export interface OneCorrectPairQuestionAnswer {
  a: OneCorrectPairQuestionChoice;
  b: OneCorrectPairQuestionChoice;
  skill: Skill;
}

export interface OneCorrectPairQuestion {
  type: typeof QuestionType.OneCorrectPair;
  prompt: string;
  answer: OneCorrectPairQuestionAnswer;
  groupA: readonly OneCorrectPairQuestionChoice[];
  groupB: readonly OneCorrectPairQuestionChoice[];
  flag?: QuestionFlag;
}

export type Question = MultipleChoiceQuestion | OneCorrectPairQuestion;

export interface PinyinInitialAssociation {
  initial: string;
  name: string;
}

export interface PinyinFinalAssociation {
  final: string;
  name: string;
}
