import { Rating } from "@/util/fsrs";
import type { Interval } from "date-fns";
import { z } from "zod";

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

export enum SrsType {
  Null,
  FsrsFourPointFive,
}

export interface SrsNullState {
  type: SrsType.Null;
}

export interface SrsFourPointFiveState {
  type: SrsType.FsrsFourPointFive;
  stability: number;
  difficulty: number;
}

export type SrsState = SrsNullState | SrsFourPointFiveState;

// TODO: "SkillUpcomingReview" maybe?
export interface SkillState {
  // TODO: this shoudl be "last reviewed"
  createdAt: Date;
  /** When null, it means it's never been reviewed. */
  srs: SrsState | null;
  due: Date;
}

export interface SkillRating {
  rating: Rating;
}

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

/**
 * A hanzi character or word with a specific meaning.
 * @deprecated Use {@link HanziWord} instead.
 */
export interface HanziWordObj {
  hanzi: string;
  meaningKey: string;
}

export type HanziWord = (string & z.BRAND<`HanziWord`>) | `${string}:${string}`; // useful when writing literal strings in tests

export interface HanziWordSkill {
  type:
    | SkillType.HanziWordToEnglish
    | SkillType.HanziWordToPinyinInitial
    | SkillType.HanziWordToPinyinFinal
    | SkillType.HanziWordToPinyinTone
    | SkillType.EnglishToHanziWord
    | SkillType.PinyinToHanziWord
    | SkillType.ImageToHanziWord;
  hanziWord: HanziWord;
}

export interface PinyinInitialAssociationSkill {
  type: SkillType.PinyinInitialAssociation;
  initial: string;
}

export interface PinyinFinalAssociationSkill {
  type: SkillType.PinyinFinalAssociation;
  final: string;
}

export interface DeprecatedSkill {
  type: SkillType.Deprecated;
}

export type PinyinAssociationSkill =
  | PinyinInitialAssociationSkill
  | PinyinFinalAssociationSkill;

export type Skill = HanziWordSkill | PinyinAssociationSkill | DeprecatedSkill;

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

export interface SkillRating {
  skill: Skill;
  rating: Rating;
}

// export interface OneCorrectPairQuestionRadicalAnswer {
//   type: `radical`;
//   hanzi: string;
//   nameOrPinyin: string;
// }

// export interface OneCorrectPairQuestionWordAnswer {
//   type: `word`;
//   hanzi: string;
//   definition: string;
// }

export type OneCorrectPairQuestionChoice =
  | {
      type: `hanzi`;
      hanzi: string;
      skill?: Skill;
    }
  | {
      type: `name`;
      english: string;
      skill?: Skill;
    }
  | {
      type: `pinyin`;
      pinyin: string;
      skill?: Skill;
    }
  | {
      type: `definition`;
      english: string;
      skill?: Skill;
    };

export interface OneCorrectPairQuestionAnswer {
  a: OneCorrectPairQuestionChoice;
  b: OneCorrectPairQuestionChoice;
}

export interface OneCorrectPairQuestion {
  type: QuestionType.OneCorrectPair;
  prompt: string;
  answer: OneCorrectPairQuestionAnswer;
  groupA: readonly OneCorrectPairQuestionAnswer[];
  groupB: readonly OneCorrectPairQuestionAnswer[];
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
