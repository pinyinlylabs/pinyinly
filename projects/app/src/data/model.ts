import type { Rating } from "@/util/fsrs";
import type { Interval } from "date-fns";
import { z } from "zod/v4";

export type Skill =
  | DeprecatedSkill
  | HanziWordSkill
  | PinyinInitialAssociationSkill
  | PinyinFinalAssociationSkill;

export type DeprecatedSkill =
  | (string & z.BRAND<`DeprecatedSkill`>)
  | `${`xx` | `re` | `er` | `rp` | `pr`}:${string}:${string}`;

export type HanziWordSkill =
  | (string & z.BRAND<`HanziWordSkill`>)
  | `${`he` | `het` | `hp` | `hpi` | `hpf` | `hpt` | `eh` | `ph` | `ih`}:${string}:${string}`;

export type PinyinInitialAssociationSkill =
  | (string & z.BRAND<`PinyinInitialAssociationSkill`>)
  | `pia:${string}:${string}`;

export type PinyinFinalAssociationSkill =
  | (string & z.BRAND<`PinyinFinalAssociationSkill`>)
  | `pfa:${string}:${string}`;

/**
 * A static ID for the different components of a pinyin sound, including the
 * initial, final, and tone.
 *
 * - Initials: suffixed with `-`.
 * - Finals: prefixed with '-`.
 * - Tones: Single digit between 1 and 5, inclusive.
 */
export type PinyinSoundId = string & z.BRAND<`PinyinSoundId`>;
/**
 * An ID for a group of pinyin sounds.
 *
 * There is a default set of groups, and these groups have static IDs. In the
 * future user-defined groups may be added and these will have dynamic IDs.
 */
export type PinyinSoundGroupId = string & z.BRAND<`PinyinSoundGroupId`>;

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
 * Single Hanzi character (in the Unicode sense).
 *
 * This is the hanzi companion to {@link PinyinSyllable}.
 */
export type HanziCharacter = string & z.BRAND<`HanziCharacter`>;

/**
 * Non-space separated hanzi text.
 */
export type HanziText = (string & z.BRAND<`HanziText`>) | HanziCharacter;

export const hanziTextSchema = z.custom<HanziText>(
  (x) => typeof x === `string`,
);
export const pylyMarkSchema = z.string();
export const hanziWordSchema = z.custom<HanziWord>(
  (x) => typeof x === `string`,
);
export const hanziCharacterSchema = z.custom<HanziCharacter>(
  (x) => typeof x === `string`,
);

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
  OtherMeaning: `debug--OtherMeaning`,
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

export interface QuestionFlagOtherMeaningType {
  kind: typeof QuestionFlagKind.OtherMeaning;
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
  | QuestionFlagOtherMeaningType
  | QuestionFlagOverdueType
  | QuestionFlagRetryType
  | QuestionFlagWeakWordType;

const questionKindSchema = z.enum({
  OneCorrectPair: `debug--OneCorrectPair`,
  HanziWordToPinyin: `debug--HanziWordToPinyin`,
  HanziWordToGloss: `debug--HanziWordToGloss`,
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

export interface HanziWordToGlossQuestion {
  kind: typeof QuestionKind.HanziWordToGloss;
  /**
   * There can be multiple correct answers, e.g. for a word like `好` which
   * can be translated as `good` or `okay`.
   */
  answers: readonly string[];
  skill: HanziWordSkill;
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

export type Question =
  | OneCorrectPairQuestion
  | HanziWordToGlossQuestion
  | HanziWordToPinyinQuestion;

export interface PinyinInitialAssociation {
  initial: string;
  name: string;
}

export interface PinyinFinalAssociation {
  final: string;
  name: string;
}

const wikiCharacterComponentSchema = z.strictObject({
  /**
   * The hanzi character (if any) formed by the strokes. Usually this can
   * be populated, but in some cases the strokes don't form a valid
   * character and instead are combined for more creative visual reasons.
   */
  hanzi: hanziCharacterSchema.optional(),
  label: z.string().optional(),
  /**
   * Comma-separated list of stroke indices (0-based) for strokes that are
   * part of this character. Allows shorthand ranges (e.g. 0-2,5 is the same as
   * 0,1,2,5).
   */
  strokes: z.string().default(``),
  /**
   * When the component uses a different number of strokes than `hanzi` it's
   * normally marked as a bug. However in cases when it's intentional (e.g. 禸)
   * this field can be used to specify the different in stroke count.
   */
  strokeDiff: z.number().optional(),
  /**
   * What color to render this component in the decomposition illustration. This
   * allows highlighting different components in different colors for clarity.
   */
  color: z.string().optional(),
});

export type WikiCharacterComponent = z.infer<
  typeof wikiCharacterComponentSchema
>;

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

// TODO [zod@>=4.1.12] try refactor to use https://github.com/colinhacks/zod/issues/5089
const wikiCharacterDecompositionSchema = buildIdsNodeSchema(
  wikiCharacterComponentSchema,
);

export type WikiCharacterDecomposition = IdsNode<WikiCharacterComponent>;

/**
 * Schema for character.json files.
 */
export const wikiCharacterDataSchema = z.strictObject({
  /**
   * The hanzi character represented by this character (e.g. 看).
   */
  hanzi: hanziCharacterSchema,
  /**
   * Stroke information, ideally SVG paths but otherwise just the count.
   */
  strokes: z.union([
    z.number().describe(`Stroke count`),
    z.array(z.string()).describe(`SVG paths for each stroke (in order)`),
  ]),
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
   */
  decompositions: z.array(z.string()).optional(),
  /**
   * The meaning mnemonic for the character. This doesn't necessarily correspond
   * to the etymological components, and their meanings can differ too. It's
   * intended for beginner learners and optimised for mnemonic usefulness.
   */
  mnemonic: z
    .strictObject({
      /**
       * The layout of the components. The first element is the combining
       * operator, and the remaining are the components for each slot.
       */
      components: wikiCharacterDecompositionSchema,
      stories: z
        .array(
          z.strictObject({
            gloss: z.string(),
            story: z.string(),
            /**
             * If there are other stories that depend on this one to make sense,
             * they can be nested inside their dependency.
             */
            children: z
              .array(
                z.strictObject({
                  gloss: z.string(),
                  story: z.string(),
                }),
              )
              .optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type WikiCharacterData = z.infer<typeof wikiCharacterDataSchema>;
