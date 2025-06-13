import type { Rating } from "@/util/fsrs";
import type { Interval } from "date-fns";
import { z } from "zod/v4";
import type { HanziWordSkill, Skill } from "./rizzleSchema";

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
 * A single pinyin syllable (e.g. `hǎo`).
 *
 * An syllable is a single sound (e.g. nǐ), so `nǐ hǎo` would be two syllables: `nǐ` and `hǎo`.
 */
export type PinyinSyllable = string & z.BRAND<`PinyinSyllable`>;

/**
 * A sequence of pinyin syllables that make up a pronunciation.
 *
 * Differs from being generic "pinyin" in that punctuation is not included so
 * it's not intended to describe a full sentence, but rather a single
 * pronunciation of a word or phrase.
 */
export type PinyinPronunciation = PinyinSyllable[];

/**
 * Space-separated pinyin syllables, used for efficient storage.
 *
 * Being space-separated (rather than no-separation) makes it simpler to split
 * back into individual pinyin syllables rather than parsing valid pinyin
 * syllable boundaries.
 */
export type PinyinPronunciationSpaceSeparated = string &
  z.BRAND<`PinyinPronunciationSpaceSeparated`>;

/**
 * Single Hanzi character.
 *
 * This is the hanzi companion to {@link PinyinSyllable}.
 */
export type HanziChar = string & z.BRAND<`HanziChar`>;

/**
 * Non-space separated hanzi text.
 */
export type HanziText = (string & z.BRAND<`HanziText`>) | HanziChar;

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
  OneCorrectPair: `debug--OneCorrectPair`,
  HanziWordToPinyin: `debug--HanziWordToPinyin`,
});
export const QuestionKind = questionKindSchema.enum;
export type QuestionKind = z.infer<typeof questionKindSchema>;

const mistakeKindSchema = z.enum({
  /**
   * Mistakenly matching a hanzi with the wrong gloss.
   */
  HanziGloss: `debug--HanziGloss`,
  /**
   * Mistakenly matching a hanzi with the wrong pinyin. This can be used for
   * both HanziWord and plain Hanzi mistakes.
   */
  HanziPinyin: `debug--HanziPinyin`,
  /**
   * Mistakenly matching a hanzi with the wrong pinyin initial.
   *
   * This **is not specific** to a particular HanziWord.
   */
  HanziPinyinInitial: `debug--HanziPinyinInitial`,
});
export const MistakeKind = mistakeKindSchema.enum;
export type MistakeKind = z.infer<typeof mistakeKindSchema>;

export interface HanziGlossMistakeType {
  kind: typeof MistakeKind.HanziGloss;
  /**
   * This can be either a HanziWord or a plain Hanzi character.
   *
   * It should be a HanziWord when the user was shown a specific HanziWord and
   * they answered with the wrong pinyin. The Pinyin might have been correct for
   * another meaning of the same hanzi, but it was incorrect for the meaning
   * they were shown.
   */
  hanziOrHanziWord: HanziWord | HanziText;
  gloss: string;
}

export interface HanziPinyinMistakeType {
  kind: typeof MistakeKind.HanziPinyin;
  /**
   * This can be either a HanziWord or a plain Hanzi character,
   * {@link HanziGlossMistakeType} for a rationale.
   */
  hanziOrHanziWord: HanziWord | HanziText;
  /**
   * This is intentionally **not** a {@link PinyinPronunciation} and instead a
   * string because the user might have answered with junk and there's no
   * guarantee what it is.
   */
  pinyin: readonly string[];
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

export interface UnsavedSkillRating {
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
  value: Readonly<PinyinPronunciation>;
};

export type OneCorrectPairQuestionChoice =
  | OneCorrectPairQuestionHanziChoice
  | OneCorrectPairQuestionGlossChoice
  | OneCorrectPairQuestionPinyinChoice;

export interface OneCorrectPairQuestionAnswer {
  as: readonly OneCorrectPairQuestionChoice[];
  bs: readonly OneCorrectPairQuestionChoice[];
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

export interface HanziWordToPinyinQuestion {
  kind: typeof QuestionKind.HanziWordToPinyin;
  /**
   * There can be multiple correct answers, e.g. for a word like `好` which
   * can be pronounced as `hǎo` or `hào`.
   */
  answers: readonly Readonly<PinyinPronunciation>[];
  skill: HanziWordSkill;
  flag?: QuestionFlagType;
}

export type Question = OneCorrectPairQuestion | HanziWordToPinyinQuestion;

export interface PinyinInitialAssociation {
  initial: string;
  name: string;
}

export interface PinyinFinalAssociation {
  final: string;
  name: string;
}
