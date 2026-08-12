import type { Rating } from "@/util/fsrs";
import type { IsEqual } from "@pinyinly/lib/types";
import type { Interval } from "date-fns";
import { z } from "zod";

const isString = (x: unknown): x is string => typeof x === `string`;

export type Skill =
  | DeprecatedSkill
  | HanziWordSkill
  | PinyinInitialAssociationSkill
  | PinyinFinalAssociationSkill;

export type DeprecatedSkill =
  | (string & z.$brand<`DeprecatedSkill`>)
  | `${`xx` | `re` | `er` | `rp` | `pr`}:${string}:${string}`;

export type HanziWordToGlossTypedSkill = `het:${string}:${string}`;
export type HanziWordToPinyinTypedSkill = `hp:${string}:${string}`;
export type HanziWordToPinyinInitialSkill = `hpi:${string}:${string}`;
export type HanziWordToPinyinToneSkill = `hpt:${string}:${string}`;
export type HanziWordToPinyinFinalSkill = `hpf:${string}:${string}`;

export type HanziWordSkill =
  | (string & z.$brand<`HanziWordSkill`>)
  | HanziWordToGlossTypedSkill
  | HanziWordToPinyinTypedSkill
  | HanziWordToPinyinInitialSkill
  | HanziWordToPinyinToneSkill
  | HanziWordToPinyinFinalSkill
  | `${`he` | `eh` | `ph` | `ih`}:${string}:${string}`;

export type PinyinInitialAssociationSkill =
  | (string & z.$brand<`PinyinInitialAssociationSkill`>)
  | `pia:${string}:${string}`;

export type PinyinFinalAssociationSkill =
  | (string & z.$brand<`PinyinFinalAssociationSkill`>)
  | `pfa:${string}:${string}`;

/**
 * A static ID for the different components/atoms of a pinyin sound, i.e. the
 * initial, final, and tone.
 *
 * - Initials: suffixed with `-`.
 * - Finals: prefixed with '-`.
 * - Tones: Single digit between 1 and 5, inclusive.
 */
export type PinyinSoundId = string & z.$brand<`PinyinSoundId`>;
export const pinyinSoundIdSchema = z
  .string()
  .regex(/^-.{1,5}|.{1,5}-|[1-5]$/gu)
  .brand<`PinyinSoundId`, `inout`>();
true satisfies IsEqual<PinyinSoundId, z.infer<typeof pinyinSoundIdSchema>>;

/**
 * An ID for a group of pinyin sounds.
 *
 * There is a default set of groups, and these groups have static IDs. In the
 * future user-defined groups may be added and these will have dynamic IDs.
 */
export type PinyinSoundGroupId = string & z.$brand<`PinyinSoundGroupId`>;
export const pinyinSoundGroupIdSchema = z.custom<PinyinSoundGroupId>(isString);

/**
 * A unique identifier for an asset stored in S3.
 *
 * Asset IDs are in the format: `sha256/<base64url-hash>`
 * where the hash is a 43-character base64url-encoded SHA-256 digest.
 */
export type AssetId = string & z.$brand<`AssetId`>;
export const assetIdSchema = z
  .string()
  .regex(/^sha256\/[A-Za-z0-9_-]{43}$/u, `Invalid AssetId format`)
  .brand<`AssetId`, `inout`>(); // `inout` makes it compatible with Inngest schemas

/**
 * A reusable actor record used by sound mnemonics.
 */
export type ActorId = string & z.$brand<`ActorId`>;
export const actorIdSchema = z.custom<ActorId>(isString);

export const openAiReasoningEffortSchema = z.enum([
  `none`,
  `minimal`,
  `low`,
  `medium`,
  `high`,
  `xhigh`,
  `max`,
]);

/**
 * A reusable place record used by pinyin finals mnemonic locations.
 */
export type LocationId = string & z.$brand<`LocationId`>;
export const locationIdSchema = z.custom<LocationId>(isString);

export const locationSetKeySchema = z.enum([
  `entrance`,
  `inside`,
  `basement`,
  `bathroom`,
  `backRoom`,
  `hiddenCloset`,
  `stairway`,
  /** @deprecated */
  `staircase`,
  /** @deprecated */
  `arrival`,
  /** @deprecated */
  `heart`,
  /** @deprecated */
  `below`,
  /** @deprecated */
  `ascent`,
  /** @deprecated */
  `summit`,
]);
export type LocationSetKey = z.infer<typeof locationSetKeySchema>;
export const locationSetKeys = locationSetKeySchema.options;

export const locationSetKindSchema = z.enum([]);
export type LocationSetKind = z.infer<typeof locationSetKindSchema>;

/**
 * Persisted location-set schema used for reading/writing user settings.
 *
 * Keep this permissive so older and newer saved payloads remain decodable while
 * prompt-generation schemas can evolve independently.
 */
export const locationSetSpecSchema = z
  .object({
    purpose: z.string().optional(),
  })
  .loose();

export type LocationSetSpec = z.infer<typeof locationSetSpecSchema>;

/**
 * Persisted location specification schema.
 *
 * Required fields are intentionally minimal to preserve backwards
 * compatibility with older stored location-spec versions.
 */
export const locationSpecSchema = z
  .object({
    location: z
      .string()
      .describe(
        `The name of the location using normal English capitalization as it would appear inside a sentence, not title capitalization. Proper nouns retain their normal capitalization; common nouns are lowercase.`,
      ),
    sets: z
      .partialRecord(locationSetKeySchema, locationSetSpecSchema)
      .optional(),
  })
  .loose();

export type LocationSpec = z.infer<typeof locationSpecSchema>;

export const pronunciationMnemonicSpecSchema = z
  .object({
    hook: z.string().optional(),
    premise: z.string().optional(),
    beats: z.array(z.string()).optional(),
    associationStrategy: z.string().optional(),
  })
  .loose();

export type PronunciationMnemonicSpec = z.infer<
  typeof pronunciationMnemonicSpecSchema
>;

/**
 * Persisted actor specification schema.
 *
 * Required fields are intentionally minimal to preserve backwards
 * compatibility with older stored actor-spec versions.
 */
export const actorSpecSchema = z
  .object({
    nickname: z.string(),
    /**
     * Specifying the species helps avoid the image models from generating a
     * non-human character when the actor is intended to be a human. Human race
     * can be included like `Human (Asian)` or `Human (Black)` if desired, but
     * is not required.
     */
    species: z.string().optional(),
    /**
     * Specifying the gender helps image model create the correct gender, and
     * the text models to generate the correct pronouns and gendered language.
     */
    gender: z.enum([`male`, `female`]).optional(),
  })
  .loose();

export type ActorSpec = z.infer<typeof actorSpecSchema>;

export const hanziWordPinyinlyObjectIdKind = `hw` as const;
export const skillPinyinlyObjectIdKind = `sk` as const;
export const pinyinSoundIdPinyinlyObjectIdKind = `ps` as const;
export const assetIdPinyinlyObjectIdKind = `a` as const;

/**
 * A polymorphic object ID that can reference different entity types in Pinyinly.
 *
 * Prefixes (aligned with Rizzle entity key paths):
 * - `hw/` → Hanzi word (e.g., `hw/好:positive`)
 * - `sk/` → Skill ID (e.g., `sk/he:好:positive`)
 * - `ps/` → Pinyin Sound ID (e.g., `ps/n-`)
 * - `a/` → Asset ID (e.g., `a/sha256/...`)
 */
export type PinyinlyObjectId =
  | `${typeof hanziWordPinyinlyObjectIdKind}/${string}`
  | `${typeof skillPinyinlyObjectIdKind}/${string}`
  | `${typeof pinyinSoundIdPinyinlyObjectIdKind}/${string}`
  | `${typeof assetIdPinyinlyObjectIdKind}/${string}`;

export const pinyinlyObjectIdKinds = [
  hanziWordPinyinlyObjectIdKind,
  skillPinyinlyObjectIdKind,
  pinyinSoundIdPinyinlyObjectIdKind,
  assetIdPinyinlyObjectIdKind,
] as const;

export type PinyinlyObjectIdKind = (typeof pinyinlyObjectIdKinds)[number];

export function pinyinlyObjectIdKind(
  objectId: PinyinlyObjectId,
): PinyinlyObjectIdKind | null {
  for (const kind of pinyinlyObjectIdKinds) {
    if (objectId.startsWith(`${kind}/`)) {
      return kind;
    }
  }
  return null;
}

export function hanziWordFromPinyinlyObjectId(
  objectId: PinyinlyObjectId,
): HanziWord | null {
  if (!objectId.startsWith(`${hanziWordPinyinlyObjectIdKind}/`)) {
    return null;
  }
  const hanziWord = objectId.slice(3);
  return hanziWord as HanziWord;
}

export function skillIdFromPinyinlyObjectId(
  objectId: PinyinlyObjectId,
): Skill | null {
  if (!objectId.startsWith(`${skillPinyinlyObjectIdKind}/`)) {
    return null;
  }
  const skillId = objectId.slice(3);
  return skillId as Skill;
}

export function soundIdFromPinyinlyObjectId(
  objectId: PinyinlyObjectId,
): PinyinSoundId | null {
  if (!objectId.startsWith(`${pinyinSoundIdPinyinlyObjectIdKind}/`)) {
    return null;
  }
  const soundId = objectId.slice(3);
  return soundId as PinyinSoundId;
}

export function assetIdFromPinyinlyObjectId(
  objectId: PinyinlyObjectId,
): AssetId | null {
  if (!objectId.startsWith(`${assetIdPinyinlyObjectIdKind}/`)) {
    return null;
  }
  const assetId = objectId.slice(2);
  return assetId as AssetId;
}

export function hanziWordPinyinlyObjectId(
  hanziWord: HanziWord,
): PinyinlyObjectId {
  return `${hanziWordPinyinlyObjectIdKind}/${hanziWord}`;
}

export function skillPinyinlyObjectId(skill: Skill): PinyinlyObjectId {
  return `${skillPinyinlyObjectIdKind}/${skill}`;
}

export function pinyinSoundIdPinyinlyObjectId(
  soundId: PinyinSoundId,
): PinyinlyObjectId {
  return `${pinyinSoundIdPinyinlyObjectIdKind}/${soundId}`;
}

export function assetIdPinyinlyObjectId(assetId: AssetId): PinyinlyObjectId {
  return `${assetIdPinyinlyObjectIdKind}/${assetId}`;
}

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
 * Asset upload status for tracking optimistic uploads.
 *
 * - `pending`: Asset upload has been initiated but not confirmed
 * - `uploaded`: Asset has been successfully uploaded to storage
 * - `failed`: Asset upload failed
 */
export const assetStatusKindSchema = z.enum({
  Pending: `debug--Pending`,
  Uploaded: `debug--Uploaded`,
  Failed: `debug--Failed`,
});
export const AssetStatusKind = assetStatusKindSchema.enum;
export type AssetStatusKind = z.infer<typeof assetStatusKindSchema>;

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
   * When shown a hanzi word, pick the english translation from a list (easy).
   */
  HanziWordToGloss: `debug--HanziWordToGloss`,
  /**
   * When shown a hanzi word, type the english translation (hard).
   */
  HanziWordToGlossTyped: `debug--HanziWordToGlossTyped`,
  /**
   * When shown a Hanzi be able to write the pinyin using the keyboard without
   * any other hints or multiple choice options.
   */
  HanziWordToPinyinTyped: `debug--HanziWordToPinyinTyped`,
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
  PinyinToHanziWord: `debug--PinyinToHanziWord`,
  ImageToHanziWord: `debug--ImageToHanziWord`,
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
  Deprecated_RadicalToEnglish: `debug--Deprecated_RadicalToEnglish`,
  Deprecated_EnglishToRadical: `debug--Deprecated_EnglishToRadical`,
  Deprecated_RadicalToPinyin: `debug--Deprecated_RadicalToPinyin`,
  Deprecated_PinyinToRadical: `debug--Deprecated_PinyinToRadical`,
});
export const SkillKind = skillKindSchema.enum;
export type SkillKind = z.infer<typeof skillKindSchema>;

export const hskLevelSchema = z.enum({
  "1": `1`,
  "2": `2`,
  "3": `3`,
  "4": `4`,
  "5": `5`,
  "6": `6`,
  "7-9": `7-9`,
});
export const HskLevel = hskLevelSchema.enum;
export type HskLevel = z.infer<typeof hskLevelSchema>;

// Adopted from https://github.com/ivankra/hsk30
export const partOfSpeechSchema = z.enum({
  Noun: `debug--Noun (名)`, // noun
  Verb: `debug--Verb (动)`, // verb
  Adjective: `debug--Adjective (形)`, // adjective; usually `Vs` (state verb, 狀態動詞) in taiwanese linguistical tradition and TOCFL
  Adverb: `debug--Adverb (副)`, // adverb
  Pronoun: `debug--Pronoun (代)`, // pronoun; usually `Det` in TOCFL
  Numeral: `debug--Numeral (数)`, // numeral
  MeasureWordOrClassifier: `debug--MeasureWordOrClassifier (量)`, // measure word/classifier
  Preposition: `debug--Preposition (介)`, // preposition
  Conjunction: `debug--Conjunction (连)`, // conjunction
  AuxiliaryWordOrParticle: `debug--AuxiliaryWordOrParticle (助)`, // auxiliary word/particle; usually `Ptc` in TOCFL
  Interjection: `debug--Interjection (叹)`, // interjection/exclamation/particle, e.g. 喂, 啊, 哎呀
  Prefix: `debug--Prefix (前缀)`, // prefix bound forms
  Suffix: `debug--Suffix (后缀)`, // suffix bound forms
  Phonetic: `debug--Phonetic (拟声)`, // e.g. 哈哈 [hāhā]
});
export const PartOfSpeech = partOfSpeechSchema.enum;
export type PartOfSpeech = z.infer<typeof partOfSpeechSchema>;

/**
 * A hanzi and meaning pair, e.g. `好:good`.
 *
 * Hanzi can have multiple meanings, so this offers a way to represent a word
 * with a specific meaning.
 */
export type HanziWord =
  | (string & z.$brand<`HanziWord`>)
  | `${string}:${string}`; // useful when writing literal strings in tests

/**
 * A branded type to represent a pinyin unit that's safe for use as an ID
 * because it's been normalized to a canonical form. This is used for keys in
 * the database and other places where a consistent representation of pinyin is
 * needed.
 *
 * The normalization is converting erhua to the canonical form, and converting
 * numeric tone notation to diacritic tone notation. For example, `hao3` would
 * be normalized to `hǎo`, and `er5` would be normalized to `ér`.
 *
 * This is only supported for PinyinUnit and not PinyinText, because PinyinText
 * can contain multiple units, spaces, punctuation, and anything else that could
 * be in a piece of text and it's not clear how to safely normalize that.
 */
export type PinyinUnitId = string & z.$brand<`PinyinUnitId`>;
export const pinyinUnitIdSchema = z.custom<PinyinUnitId>(isString);

/**
 * A single pinyin diacritic unit (e.g. `hǎo`). This should not include numeric
 * notation, use `normalizePinyin__` functions to convert numeric to diacritic
 * forms.
 *
 * A unit is a single sound or component (e.g. nǐ, or 儿 in 一点儿), so `nǐ hǎo`
 * would be two units: `nǐ` and `hǎo`. Erhua is considered two Pinyin units, so
 * `yìdiǎnr` would be three units: `yì`, `diǎn`, and `r`.
 */
export type PinyinUnit = PinyinUnitId | (string & z.$brand<`PinyinUnit`>);

export type PinyinText = PinyinUnit | (string & z.$brand<`PinyinText`>);

/**
 * A single pinyin unit in numeric tone form (e.g. `hao3`).
 *
 * A unit is a single sound or component (e.g. ni3, or r5 for 儿), so `ni3 hao3`
 * would be two units: `ni3` and `hao3`.
 */
export type PinyinNumericUnit = string & z.$brand<`PinyinNumericUnit`>;
export type PinyinNumericText =
  | PinyinNumericUnit
  | (string & z.$brand<`PinyinNumericText`>);

/**
 * Space-separated pinyin units, used for efficient storage.
 *
 * Being space-separated (rather than no-separation) makes it simpler to split
 * back into individual pinyin units rather than parsing valid pinyin
 * unit boundaries.
 */
export type PinyinPronunciationSpaceSeparated = string &
  z.$brand<`PinyinPronunciationSpaceSeparated`>;

/**
 * Single Hanzi character (in the Unicode sense).
 *
 * This is the hanzi companion to {@link PinyinUnit}.
 */
export type HanziCharacter = string & z.$brand<`HanziCharacter`>;

/**
 * Non-space separated hanzi text.
 */
export type HanziText = (string & z.$brand<`HanziText`>) | HanziCharacter;

export const hanziTextSchema = z.custom<HanziText>(isString);
export const pylyMarkSchema = z.string();
export const hanziWordSchema = z.custom<HanziWord>(isString);
export const hanziCharacterSchema = z.custom<HanziCharacter>(isString);
export const pinyinTextSchema = z.string() as unknown as z.ZodCustom<
  PinyinText,
  PinyinText
>;
export const pinyinUnitSchema = z.custom<PinyinUnit>(isString);

export type HanziWordSkillKind =
  | typeof SkillKind.HanziWordToGloss
  | typeof SkillKind.HanziWordToGlossTyped
  | typeof SkillKind.HanziWordToPinyinTyped
  | typeof SkillKind.HanziWordToPinyinInitial
  | typeof SkillKind.HanziWordToPinyinFinal
  | typeof SkillKind.HanziWordToPinyinTone
  | typeof SkillKind.GlossToHanziWord
  | typeof SkillKind.PinyinToHanziWord
  | typeof SkillKind.ImageToHanziWord;

export const hanziWordSkillKinds: readonly HanziWordSkillKind[] = [
  SkillKind.HanziWordToGloss,
  SkillKind.HanziWordToGlossTyped,
  SkillKind.HanziWordToPinyinInitial,
  SkillKind.HanziWordToPinyinFinal,
  SkillKind.HanziWordToPinyinTone,
  SkillKind.HanziWordToPinyinTyped,
  SkillKind.GlossToHanziWord,
];

const questionFlagKindSchema = z.enum({
  Blocked: `debug--Blocked`,
  NewDifficulty: `debug--NewDifficulty`,
  NewSkill: `debug--NewSkill`,
  OtherAnswer: `debug--OtherAnswer`,
  Overdue: `debug--Overdue`,
  Retry: `debug--Retry`,
  WeakWord: `debug--WeakWord`,
});
export const QuestionFlagKind = questionFlagKindSchema.enum;
export type QuestionFlagKind = z.infer<typeof questionFlagKindSchema>;

export interface QuestionFlagBlockedType {
  kind: typeof QuestionFlagKind.Blocked;
}

export interface QuestionFlagRetryType {
  kind: typeof QuestionFlagKind.Retry;
}

export interface QuestionFlagOverdueType {
  kind: typeof QuestionFlagKind.Overdue;
  interval: Interval;
}

export interface QuestionFlagOtherAnswerType {
  kind: typeof QuestionFlagKind.OtherAnswer;
  /**
   * When there are multiple meanings for a hanzi word, the previously given
   * meanings should be avoided when answering the question again.
   */
  previousHanziWords?: readonly HanziWord[];
}

export interface QuestionFlagNewDifficultyType {
  kind: typeof QuestionFlagKind.NewDifficulty;
}

export interface QuestionFlagNewSkillType {
  kind: typeof QuestionFlagKind.NewSkill;
}

export interface QuestionFlagWeakWordType {
  kind: typeof QuestionFlagKind.WeakWord;
}

export type QuestionFlagType =
  | QuestionFlagBlockedType
  | QuestionFlagNewDifficultyType
  | QuestionFlagNewSkillType
  | QuestionFlagOtherAnswerType
  | QuestionFlagOverdueType
  | QuestionFlagRetryType
  | QuestionFlagWeakWordType;

const questionKindSchema = z.enum({
  OneCorrectPair: `debug--OneCorrectPair`,
  HanziWordToPinyinTyped: `debug--HanziWordToPinyinTyped`,
  HanziWordToGlossTyped: `debug--HanziWordToGlossTyped`,
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
   * This is intentionally **not** a {@link PinyinText} and instead a
   * string because the user might have answered with junk and there's no
   * guarantee what it is.
   */
  pinyin: string;
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
  value: PinyinText;
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
  flag: QuestionFlagType | null;
}

export interface HanziWordToGlossTypedQuestion {
  kind: typeof QuestionKind.HanziWordToGlossTyped;
  /**
   * There can be multiple correct answers, e.g. for a hanzi word like `好:good`
   * has multiple correct glosses i.e. "good", "nice", "friendly".
   */
  answers: { skill: HanziWordSkill; glosses: string[] }[];
  /**
   * Previous glosses that should be avoided.
   */
  bannedMeaningPrimaryGlossHint: readonly string[];
  /**
   * The skill being quizzed, used for rating a wrong answer.
   */
  skill: HanziWordSkill;
  flag: QuestionFlagType | null;
}

export interface HanziWordToPinyinTypedQuestion {
  kind: typeof QuestionKind.HanziWordToPinyinTyped;
  /**
   * There can be multiple correct answers, e.g. for a hanzi that has multiple
   * meanings with different pronunciations.
   */
  answers: {
    skill: HanziWordSkill;
    pinyin: readonly PinyinText[];
  }[];
  /**
   * Previous pinyin that should be avoided.
   */
  bannedMeaningPinyinHint: readonly PinyinText[];
  /**
   * The skill being quizzed, used for rating a wrong answer.
   */
  skill: HanziWordSkill;
  flag: QuestionFlagType | null;
}

export type Question =
  | OneCorrectPairQuestion
  | HanziWordToGlossTypedQuestion
  | HanziWordToPinyinTypedQuestion;

export interface PinyinInitialAssociation {
  initial: string;
  name: string;
}

export interface PinyinFinalAssociation {
  final: string;
  name: string;
}

export type StrokeSpecString = string & z.$brand<`StrokeSpecString`>;
export const strokeSpecStringSchema = z
  .string()
  .regex(/^[\d#[\]:+,%.-]*$/gu)
  .brand<`StrokeSpecString`, `inout`>();
true satisfies IsEqual<
  StrokeSpecString,
  z.infer<typeof strokeSpecStringSchema>
>;

/**
 * A Hanzi IDS string.
 */
export type HanziIds = string & z.$brand<`HanziIds`>;
export const hanziIdsSchema = z
  .string()
  .regex(
    // 1. combining characters
    // 2. enclosed alphanumerics
    // 3. Han script
    // 4. CJK strokes
    /^(?:[⿰⿱⿲⿳⿴⿵⿶⿷⿼⿸⿹⿺⿽⿻⿾⿿]|[\u2460-\u2473]|\p{Script=Han}|[\u31C0-\u31EFコュス])+$/gu,
  )
  .brand<`HanziIds`, `inout`>();
true satisfies IsEqual<HanziIds, z.infer<typeof hanziIdsSchema>>;

export const idsOperatorSchema = z.enum({
  LeftToRight: `⿰`,
  AboveToBelow: `⿱`,
  LeftToMiddleToRight: `⿲`,
  AboveToMiddleAndBelow: `⿳`,
  FullSurround: `⿴`,
  SurroundFromAbove: `⿵`,
  SurroundFromBelow: `⿶`,
  SurroundFromLeft: `⿷`,
  SurroundFromRight: `⿼`,
  SurroundFromUpperLeft: `⿸`,
  SurroundFromUpperRight: `⿹`,
  SurroundFromLowerLeft: `⿺`,
  SurroundFromLowerRight: `⿽`,
  Overlaid: `⿻`,
  HorizontalReflection: `⿾`,
  Rotation: `⿿`,
});

const IdsOperator = idsOperatorSchema.enum;
type IdsOperator = z.infer<typeof idsOperatorSchema>;

export { IdsOperator };

const idsOperatorArity1 = z.union([
  z.literal(IdsOperator.HorizontalReflection),
  z.literal(IdsOperator.Rotation),
]);

const idsOperatorArity2 = z.union([
  z.literal(IdsOperator.LeftToRight),
  z.literal(IdsOperator.AboveToBelow),
  z.literal(IdsOperator.FullSurround),
  z.literal(IdsOperator.SurroundFromAbove),
  z.literal(IdsOperator.SurroundFromBelow),
  z.literal(IdsOperator.SurroundFromLeft),
  z.literal(IdsOperator.SurroundFromRight),
  z.literal(IdsOperator.SurroundFromUpperLeft),
  z.literal(IdsOperator.SurroundFromUpperRight),
  z.literal(IdsOperator.SurroundFromLowerLeft),
  z.literal(IdsOperator.SurroundFromLowerRight),
  z.literal(IdsOperator.Overlaid),
]);

const idsOperatorArity3 = z.union([
  z.literal(IdsOperator.LeftToMiddleToRight),
  z.literal(IdsOperator.AboveToMiddleAndBelow),
]);

export type IdsOperatorArity1 = z.infer<typeof idsOperatorArity1>;
export type IdsOperatorArity2 = z.infer<typeof idsOperatorArity2>;
export type IdsOperatorArity3 = z.infer<typeof idsOperatorArity3>;

export type IdsNode<T> =
  | [typeof IdsOperator.LeftToRight, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.AboveToBelow, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.LeftToMiddleToRight, IdsNode<T>, IdsNode<T>, IdsNode<T>]
  | [
      typeof IdsOperator.AboveToMiddleAndBelow,
      IdsNode<T>,
      IdsNode<T>,
      IdsNode<T>,
    ]
  | [typeof IdsOperator.FullSurround, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromAbove, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromBelow, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromLeft, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromRight, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromUpperLeft, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromUpperRight, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromLowerLeft, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.SurroundFromLowerRight, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.Overlaid, IdsNode<T>, IdsNode<T>]
  | [typeof IdsOperator.HorizontalReflection, IdsNode<T>]
  | [typeof IdsOperator.Rotation, IdsNode<T>]
  | T;

export function buildIdsNodeSchema<T extends z.ZodType>(
  leafSchema: T,
): z.ZodType<IdsNode<z.infer<T>>> {
  const depth0Schema = leafSchema;

  const depth1Schema = z.union([
    depth0Schema,
    z.tuple([idsOperatorArity1, depth0Schema]),
    z.tuple([idsOperatorArity2, depth0Schema, depth0Schema]),
    z.tuple([idsOperatorArity3, depth0Schema, depth0Schema, depth0Schema]),
  ]);

  const depth2Schema = z.union([
    depth1Schema,
    z.tuple([idsOperatorArity1, depth1Schema]),
    z.tuple([idsOperatorArity2, depth1Schema, depth1Schema]),
    z.tuple([idsOperatorArity3, depth1Schema, depth1Schema, depth1Schema]),
  ]);

  const depth3Schema = z.union([
    depth2Schema,
    z.tuple([idsOperatorArity1, depth2Schema]),
    z.tuple([idsOperatorArity2, depth2Schema, depth2Schema]),
    z.tuple([idsOperatorArity3, depth2Schema, depth2Schema, depth2Schema]),
  ]);

  const depth4Schema = z.union([
    depth3Schema,
    z.tuple([idsOperatorArity1, depth3Schema]),
    z.tuple([idsOperatorArity2, depth3Schema, depth3Schema]),
    z.tuple([idsOperatorArity3, depth3Schema, depth3Schema, depth3Schema]),
  ]);

  const depth5Schema = z.union([
    depth4Schema,
    z.tuple([idsOperatorArity1, depth4Schema]),
    z.tuple([idsOperatorArity2, depth4Schema, depth4Schema]),
    z.tuple([idsOperatorArity3, depth4Schema, depth4Schema, depth4Schema]),
  ]);

  return depth5Schema as z.ZodType<IdsNode<z.infer<T>>>;
}

export const hanziStrokeColorSchema = z.enum([
  `blue`,
  `yellow`,
  `amber`,
  `cyanold`,
  `fg`,
]);

export type HanziStrokeColor = z.infer<typeof hanziStrokeColorSchema>;

export function hanziStrokeCountAsNumber(str: string): number | undefined {
  if (str.length === 1) {
    const codePoint = str.codePointAt(0);
    if (
      codePoint != null &&
      codePoint >= /* ① */ 9312 &&
      codePoint <= /* ⑳ */ 9331
    ) {
      return codePoint - 9311;
    }
  }
  return undefined;
}

export function isHanziStrokeCountChar(
  str: string,
): str is HanziStrokeCountChar {
  return hanziStrokeCountAsNumber(str) != null;
}

/**
 * A single hanzi character that represents a stroke count (①, ②, ③, …, ⑳).
 *
 * This is used in IDS strings to represent the number of strokes in a component
 * when the component itself does not have a single-character representation.
 */
export const hanziStrokeCountCharSchema = z
  .string()
  .refine((str) => hanziStrokeCountAsNumber(str) != null)
  .brand<`HanziStrokeCountChar`, `inout`>();

export type HanziStrokeCountChar = z.infer<typeof hanziStrokeCountCharSchema>;

export type HanziIdsLeaf = HanziCharacter | HanziStrokeCountChar;

export interface CharacterDecompositionRow {
  hanzi: HanziCharacter;
  ids: HanziIds;
  strokeSpecs: readonly StrokeSpecString[];
}

export interface CharacterComponentUsageRow {
  component: HanziCharacter;
  usedInHanzi: readonly HanziCharacter[];
}

export interface CharacterMnemonicIdsRow {
  hanzi: HanziCharacter;
  ids: HanziIds;
}

export interface MnemonicHanziComponent {
  /**
   * Could be `null` if there's no unicode character to represent this component
   * (might be a radical or other component that doesn't have a single
   * character).
   */
  hanzi: HanziCharacter | null;
  strokeSpec?: StrokeSpecString | null;
  label?: string | null;
  color?: HanziStrokeColor | null;
}

export const wikiCharacterSvgSchema = z.strictObject({
  /**
   * Stroke information, ideally SVG paths but otherwise just the count.
   */
  strokes: z.union([
    z.number().describe(`Stroke count`),
    z.array(z.string()).describe(`SVG paths for each stroke (in order)`),
  ]),
  /**
   * Median points for each stroke, stored as compact strings so JSON parsing
   * does not eagerly allocate nested point arrays.
   *
   * Format for each stroke: "x,y;x,y;..."
   */
  medians: z
    .array(z.string())
    .optional()
    .describe(
      `Stroke medians (in order), encoded as compact strings per stroke: x,y;x,y;...`,
    ),
  /**
   * Precomputed SVG paths for slice atoms keyed by canonical StrokeSpec atom text.
   *
   * Example key: "4[1:2]"
   */
  segments: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      `Precomputed SVG segment paths keyed by canonical StrokeSpec slice atom.`,
    ),
});

export type WikiCharacterSvg = z.infer<typeof wikiCharacterSvgSchema>;

/**
 * Schema for character.json files.
 */
export const wikiCharacterDataSchema = z.strictObject({
  /**
   * The hanzi character represented by this character (e.g. 看).
   */
  hanzi: hanziCharacterSchema,
  /**
   * SVG-related data (strokes, medians, and precomputed segment paths).
   */
  svg: wikiCharacterSvgSchema,
  /**
   * The simplified form of this character, if it is a traditional form.
   *
   * The property is used on traditional characters because it's expected there
   * are fewer of those in the dataset since this app focuses on Mandarin.
   */
  simplifiedForm: hanziCharacterSchema.optional(),
  /**
   * If this character is a component form of another character, that hanzi.
   */
  componentFormOf: hanziCharacterSchema.optional(),
  /**
   * If this is variant of another character (for the purposes of learning),
   * point to the canonical form.
   *
   * e.g. ⺁ -> 厂
   */
  canonicalForm: hanziCharacterSchema.optional(),
  isStructural: z
    .literal(true)
    .optional()
    .describe(
      `is used as a component in regular Hanzi characters (e.g. parts of 兰, 兴, etc.), but never used independently as a full word or character in modern Mandarin.`,
    ),
  /**
   * Alternative IDS decompositions
   *
   * TODO: rename to `decompositions` grep the code base for other instances too
   */
  decompositions: z
    .record(
      hanziIdsSchema.describe(`partial or full IDS decomposition`),
      z
        .array(strokeSpecStringSchema)
        .describe(`strokeSpec for each leaf hanzi, in DFS order`),
    )
    .optional(),
  /**
   * The meaning mnemonic for the character. This doesn't necessarily correspond
   * to the etymological components, and their meanings can differ too. It's
   * intended for beginner learners and optimised for mnemonic usefulness.
   */
  mnemonic: z
    .strictObject({
      /**
       * Can be `null` if none of the decompositions should be used for the
       * mnemonic (to avoid unnecessarily learning a component that is not
       * relevant to the mnemonic).
       */
      decomposition: hanziIdsSchema
        .describe(`reference an IDS key in decompositions`)
        .nullable()
        .optional(),
      /**
       * Override annotations for the components. Keys are component hanzi, values are the modifiers.
       */
      components: z
        .record(
          hanziCharacterSchema,
          z
            .object({
              /**
               * Override the normal gloss for the component.
               */
              label: z.string().optional(),
              /**
               * What color to render this component in the decomposition illustration. This
               * allows highlighting different components in different colors for clarity.
               */
              color: z.string().optional(),
            })
            .strict(),
        )
        .optional(),
      hints: z
        .array(
          z.strictObject({
            meaningKey: z.string(),
            hint: z.string(),
            explanation: z.string().optional(),
            imageAssetIds: z.array(z.string()).optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type WikiCharacterData = z.infer<typeof wikiCharacterDataSchema>;

export const charactersSchema = z.array(
  z.tuple([
    hanziCharacterSchema,
    z.object({
      mnemonic: hanziIdsSchema
        .describe(`IDS used by the mnemonic, affects learning order`)
        .nullable()
        .optional(),
      decompositions: z
        .record(
          hanziIdsSchema.describe(`IDS (can include stroke count characters)`),
          z.array(strokeSpecStringSchema),
        )
        .describe(`all IDS decompositions`)
        .optional(),
      componentFormOf: hanziCharacterSchema
        .describe(
          `the primary form of this hanzi (only relevant for component-form hanzi)`,
        )
        .optional(),
      isStructural: z
        .literal(true)
        .optional()
        .describe(
          `is used as a component in regular Hanzi characters (e.g. parts of 兰, 兴, etc.), but never used independently as a full word or character in modern Mandarin.`,
        ),
      canonicalForm: hanziCharacterSchema.optional(),
    }),
  ]),
);

export type CharactersKey = z.infer<typeof charactersSchema.element>[0];
export type CharactersValue = z.infer<typeof charactersSchema.element>[1];

/**
 * Allowed image MIME types for uploads and AI generation.
 */
export const allowedImageMimeTypeEnum = z.enum([
  `image/jpeg`,
  `image/png`,
  `image/webp`,
  `image/gif`,
]);

export type AllowedImageMimeType = z.infer<typeof allowedImageMimeTypeEnum>;

/**
 * A reference image to be included in AI generation requests.
 * Contains a descriptive label, base64-encoded image data, and MIME type.
 */
export interface AiReferenceImage {
  label?: string;
  data: string; // Base64-encoded image data
  mimeType: AllowedImageMimeType;
}
