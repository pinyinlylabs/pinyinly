import { Rating } from "@/util/fsrs";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import type { Interval } from "date-fns";
import { z } from "zod";
import { Skill } from "./rizzleSchema";

export enum PinyinInitialGroupId {
  Basic,
  _i,
  _u,
  _v,
  Null,
  Everything,
}

export enum MnemonicThemeId {
  AnimalSpecies,
  GreekMythologyCharacter,
  MythologyCharacter,
  WesternCultureFamousMen,
  WesternCultureFamousWomen,
  WesternMythologyCharacter,
}

export interface BaseSrsState {
  prevReviewAt: Date;
  nextReviewAt: Date;
}

export enum SrsType {
  Mock,
  FsrsFourPointFive,
}

/**
 * A placeholder to force the code to be structured to allow multiple SRS
 * algorithms. This is not used for anything.
 */
export interface SrsStateMock extends BaseSrsState {
  type: SrsType.Mock;
}

/**
 * FSRS 4.5 specific parameters.
 */
export interface SrsStateFsrsFourPointFive extends BaseSrsState {
  type: SrsType.FsrsFourPointFive;
  stability: number;
  difficulty: number;
}

export type SrsState = SrsStateMock | SrsStateFsrsFourPointFive;

// The values of this enum should only be used for debugging, they should never
// be persisted.
export enum SkillType {
  /**
   * When shown a hanzi word, write the english translation.
   */
  HanziWordToEnglish = `HanziWordToEnglish`,
  HanziWordToPinyinInitial = `HanziWordToPinyinInitial`,
  HanziWordToPinyinFinal = `HanziWordToPinyinFinal`,
  HanziWordToPinyinTone = `HanziWordToPinyinTone`,
  /**
   * When shown an english word, write the hanzi characters.
   */
  EnglishToHanziWord = `EnglishToHanzi`,
  /**
   * Given a pinyin word, write the hanzi character.
   */
  PinyinToHanziWord = `PinyinToHanzi`,
  ImageToHanziWord = `ImageToHanzi`,
  /**
   * Given an initial like `p`, remember the name of the associated
   * character/actor/entity etc.
   */
  PinyinInitialAssociation = `PinyinInitialAssociation`,
  PinyinFinalAssociation = `PinyinFinalAssociation`,

  //
  // Deprecated
  //
  Deprecated = `Deprecated`,
  Deprecated_RadicalToEnglish = `RadicalToEnglish`,
  Deprecated_EnglishToRadical = `EnglishToRadical`,
  Deprecated_RadicalToPinyin = `RadicalToPinyin`,
  Deprecated_PinyinToRadical = `PinyinToRadical`,
}

export enum PartOfSpeech {
  Noun,
  Verb,
  Adjective,
  Adverb,
  Pronoun,
  Preposition,
  Conjunction,
  Interjection,
  MeasureWord,
  Particle,
}

export type HanziWord = (string & z.BRAND<`HanziWord`>) | `${string}:${string}`; // useful when writing literal strings in tests

export type HanziWordSkillType =
  | SkillType.HanziWordToEnglish
  | SkillType.HanziWordToPinyinInitial
  | SkillType.HanziWordToPinyinFinal
  | SkillType.HanziWordToPinyinTone
  | SkillType.EnglishToHanziWord
  | SkillType.PinyinToHanziWord
  | SkillType.ImageToHanziWord;

export enum QuestionFlagType {
  NewSkill,
  Overdue,
  PreviousMistake,
  WeakWord,
}

export interface QuestionFlagPreviousMistake {
  type: QuestionFlagType.PreviousMistake;
}

export interface QuestionFlagOverdue {
  type: QuestionFlagType.Overdue;
  interval: Interval;
}

export interface QuestionFlagWeakWord {
  type: QuestionFlagType.WeakWord;
}

export interface QuestionFlagNewSkill {
  type: QuestionFlagType.NewSkill;
}

export type QuestionFlag =
  | QuestionFlagWeakWord
  | QuestionFlagNewSkill
  | QuestionFlagOverdue
  | QuestionFlagPreviousMistake;

export enum QuestionType {
  MultipleChoice,
  OneCorrectPair,
}

export interface MultipleChoiceQuestion {
  type: QuestionType.MultipleChoice;
  prompt: string;
  answer: string;
  flag?: QuestionFlag;
  choices: readonly string[];
}

// The values of this enum should only be used for debugging, they should never
// be persisted.
export enum MistakeType {
  HanziGloss = `HanziGloss`,
  HanziPinyinInitial = `HanziPinyinInitial`,
}

export interface HanziGlossMistake {
  type: MistakeType.HanziGloss;
  hanzi: string;
  gloss: string;
}

export interface HanziPinyinInitialMistake {
  type: MistakeType.HanziPinyinInitial;
  hanzi: string;
  pinyinInitial: string;
}

export type Mistake = HanziGlossMistake | HanziPinyinInitialMistake;

export interface SkillRating {
  skill: Skill;
  rating: Rating;
}

export type OneCorrectPairQuestionChoice = {
  type: `hanzi` | `gloss` | `pinyin`;
  value: string;
};

export interface OneCorrectPairQuestionAnswer {
  a: OneCorrectPairQuestionChoice;
  b: OneCorrectPairQuestionChoice;
  skill: Skill;
}

export interface OneCorrectPairQuestion {
  type: QuestionType.OneCorrectPair;
  prompt: string;
  answer: OneCorrectPairQuestionAnswer;
  groupA: readonly OneCorrectPairQuestionChoice[];
  groupB: readonly OneCorrectPairQuestionChoice[];
  hint?: string;
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
