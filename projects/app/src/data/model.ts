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

export const srsKindSchema = z.enum({
  Mock: `debug--Mock`,
  FsrsFourPointFive: `debug--FsrsFourPointFive`,
});
export const SrsKind = srsKindSchema.enum;
export type SrsKind = z.infer<typeof srsKindSchema>;

/**
 * A placeholder to force the code to be structured to allow multiple SRS
 * algorithms. This is not used for anything.
 */
export interface SrsStateMockType extends BaseSrsState {
  kind: typeof SrsKind.Mock;
}

/**
 * FSRS 4.5 specific parameters.
 */
export interface SrsStateFsrsFourPointFiveType extends BaseSrsState {
  kind: typeof SrsKind.FsrsFourPointFive;
  stability: number;
  difficulty: number;
}

export type SrsStateType = SrsStateMockType | SrsStateFsrsFourPointFiveType;

const skillKindSchema = z.enum({
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
export const SkillKind = skillKindSchema.enum;
export type SkillKind = z.infer<typeof skillKindSchema>;

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

/**
 * A hanzi and meaning pair, e.g. `好:good`.
 *
 * Hanzi can have multiple meanings, so this offers a way to represent a word
 * with a specific meaning.
 */
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

export type HanziWordSkillKind =
  | typeof SkillKind.HanziWordToGloss
  | typeof SkillKind.HanziWordToPinyin
  | typeof SkillKind.HanziWordToPinyinInitial
  | typeof SkillKind.HanziWordToPinyinFinal
  | typeof SkillKind.HanziWordToPinyinTone
  | typeof SkillKind.GlossToHanziWord
  | typeof SkillKind.PinyinToHanziWord
  | typeof SkillKind.ImageToHanziWord;

export const hanziWordSkillKinds: HanziWordSkillKind[] = [
  SkillKind.HanziWordToGloss,
  SkillKind.HanziWordToPinyin,
  SkillKind.HanziWordToPinyinInitial,
  SkillKind.HanziWordToPinyinFinal,
  SkillKind.HanziWordToPinyinTone,
];

const questionFlagKindSchema = z.enum({
  NewSkill: `debug--NewSkill`,
  Overdue: `debug--Overdue`,
  Retry: `debug--Retry`,
  WeakWord: `debug--WeakWord`,
});
export const QuestionFlagKind = questionFlagKindSchema.enum;
export type QuestionFlagKind = z.infer<typeof questionFlagKindSchema>;

export interface QuestionFlagRetryType {
  kind: typeof QuestionFlagKind.Retry;
}

export interface QuestionFlagOverdueType {
  kind: typeof QuestionFlagKind.Overdue;
  interval: Interval;
}

export interface QuestionFlagWeakWordType {
  kind: typeof QuestionFlagKind.WeakWord;
}

export interface QuestionFlagNewSkillType {
  kind: typeof QuestionFlagKind.NewSkill;
}

export type QuestionFlagType =
  | QuestionFlagWeakWordType
  | QuestionFlagNewSkillType
  | QuestionFlagOverdueType
  | QuestionFlagRetryType;

const questionKindSchema = z.enum({
  MultipleChoice: `debug--MultipleChoice`,
  OneCorrectPair: `debug--OneCorrectPair`,
  HanziToPinyin: `debug--HanziToPinyin`,
});
export const QuestionKind = questionKindSchema.enum;
export type QuestionKind = z.infer<typeof questionKindSchema>;

export interface MultipleChoiceQuestion {
  kind: typeof QuestionKind.MultipleChoice;
  prompt: string;
  answer: string;
  flag?: QuestionFlagType;
  choices: readonly string[];
}

const mistakeKindSchema = z.enum({
  HanziGloss: `debug--HanziGloss`,
  HanziPinyin: `debug--HanziPinyin`,
  HanziPinyinInitial: `debug--HanziPinyinInitial`,
});
export const MistakeKind = mistakeKindSchema.enum;
export type MistakeKind = z.infer<typeof mistakeKindSchema>;

export interface HanziGlossMistakeType {
  kind: typeof MistakeKind.HanziGloss;
  hanzi: HanziText;
  gloss: string;
}

export interface HanziPinyinMistakeType {
  kind: typeof MistakeKind.HanziPinyin;
  hanzi: HanziText;
  pinyin: PinyinText;
}

export interface HanziPinyinInitialMistakeType {
  kind: typeof MistakeKind.HanziPinyinInitial;
  hanzi: string;
  pinyinInitial: string;
}

export type MistakeType =
  | HanziGlossMistakeType
  | HanziPinyinMistakeType
  | HanziPinyinInitialMistakeType;

export interface NewSkillRating {
  skill: Skill;
  rating: Rating;
  durationMs: number;
}

export type OneCorrectPairQuestionHanziChoice = {
  kind: `hanzi`;
  value: HanziText;
};

export type OneCorrectPairQuestionGlossChoice = {
  kind: `gloss`;
  value: string;
};

export type OneCorrectPairQuestionPinyinChoice = {
  kind: `pinyin`;
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
  kind: typeof QuestionKind.OneCorrectPair;
  prompt: string;
  answer: OneCorrectPairQuestionAnswer;
  groupA: readonly OneCorrectPairQuestionChoice[];
  groupB: readonly OneCorrectPairQuestionChoice[];
  flag?: QuestionFlagType;
}

export interface HanziToPinyinQuestion {
  kind: typeof QuestionKind.HanziToPinyin;
  prompt: string;
  answer: readonly (readonly [HanziChar, /* pinyin */ string])[];
  skill: Skill;
  flag?: QuestionFlagType;
}

export type Question =
  | MultipleChoiceQuestion
  | OneCorrectPairQuestion
  | HanziToPinyinQuestion;

export interface PinyinInitialAssociation {
  initial: string;
  name: string;
}

export interface PinyinFinalAssociation {
  final: string;
  name: string;
}
