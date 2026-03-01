import type { FsrsState } from "@/util/fsrs";
import { Rating } from "@/util/fsrs";
import type { RizzleReplicache } from "@/util/rizzle";
import { r, RizzleCustom } from "@/util/rizzle";
import { memoize0 } from "@pinyinly/lib/collections";
import omit from "lodash/omit.js";
import { z } from "zod/v4";
import type {
  HanziText,
  HanziWord,
  PinyinlyObjectId,
  PinyinSoundGroupId,
  PinyinSoundId,
  Skill,
  SrsStateType,
} from "./model";
import { AssetStatusKind, PartOfSpeech, SkillKind, SrsKind } from "./model";

export const rSkillKind = memoize0(function rSkillKind() {
  return r.enum(SkillKind, {
    [SkillKind.Deprecated_RadicalToEnglish]: `re`,
    [SkillKind.Deprecated_EnglishToRadical]: `er`,
    [SkillKind.Deprecated_RadicalToPinyin]: `rp`,
    [SkillKind.Deprecated_PinyinToRadical]: `pr`,
    [SkillKind.Deprecated]: `xx`,
    [SkillKind.HanziWordToGloss]: `he`,
    [SkillKind.HanziWordToGlossTyped]: `het`,
    [SkillKind.HanziWordToPinyinTyped]: `hp`,
    [SkillKind.HanziWordToPinyinInitial]: `hpi`,
    [SkillKind.HanziWordToPinyinFinal]: `hpf`,
    [SkillKind.HanziWordToPinyinTone]: `hpt`,
    [SkillKind.GlossToHanziWord]: `eh`,
    [SkillKind.PinyinToHanziWord]: `ph`,
    [SkillKind.ImageToHanziWord]: `ih`,
    [SkillKind.PinyinInitialAssociation]: `pia`,
    [SkillKind.PinyinFinalAssociation]: `pfa`,
  });
});

export const rPartOfSpeech = memoize0(function rPartOfSpeech() {
  return r.enum(PartOfSpeech, {
    [PartOfSpeech.Noun]: `n`,
    [PartOfSpeech.Verb]: `v`,
    [PartOfSpeech.Adjective]: `adj`,
    [PartOfSpeech.Adverb]: `adv`,
    [PartOfSpeech.Pronoun]: `pron`,
    [PartOfSpeech.Numeral]: `num`,
    [PartOfSpeech.MeasureWordOrClassifier]: `m`,
    [PartOfSpeech.Preposition]: `prep`,
    [PartOfSpeech.Conjunction]: `conj`,
    [PartOfSpeech.AuxiliaryWordOrParticle]: `aux`,
    [PartOfSpeech.Interjection]: `int`,
    [PartOfSpeech.Prefix]: `pre`,
    [PartOfSpeech.Suffix]: `suf`,
    [PartOfSpeech.Phonetic]: `pho`,
  });
});

export const rFsrsRating = memoize0(function rFsrsRating() {
  return r.enum(Rating, {
    [Rating.Again]: `1`,
    [Rating.Hard]: `2`,
    [Rating.Good]: `3`,
    [Rating.Easy]: `4`,
  });
});

export const rHanziWord = memoize0(function rHanziWord() {
  return RizzleCustom.create<HanziWord, HanziWord, HanziWord>(
    z.custom<HanziWord>((x) => typeof x === `string`),
    z.custom<HanziWord>((x) => typeof x === `string`),
  );
});

export const rSkill = memoize0(function rSkill() {
  return RizzleCustom.create<Skill, Skill, Skill>(
    z.custom<Skill>((x) => typeof x === `string`),
    z.custom<Skill>((x) => typeof x === `string`),
  );
});

const _brandedStringImpl = r.string();
const brandedString = <T extends string>() =>
  _brandedStringImpl as RizzleCustom<T, T, T>;

export const rHanziOrHanziWord = brandedString<HanziText | HanziWord>;
export const rPinyinSoundId = brandedString<PinyinSoundId>;
export const rPinyinlyObjectId = brandedString<PinyinlyObjectId>;
export const rPinyinSoundGroupId = brandedString<PinyinSoundGroupId>;

export const rSpaceSeparatedString = memoize0(function rSpaceSeparatedString() {
  return RizzleCustom.create<readonly string[], string, readonly string[]>(
    z.array(z.string()).transform((x) => x.join(` `)),
    z.string().transform((x) => x.split(/ +/) as readonly string[]),
  );
});

export const rStringArray = memoize0(function rStringArray() {
  return RizzleCustom.create<
    readonly string[],
    readonly string[],
    readonly string[]
  >(z.array(z.string()), z.array(z.string()));
});

export const rSrsKind = memoize0(function rSrsKind() {
  return r.enum(SrsKind, {
    [SrsKind.Mock]: `0`,
    [SrsKind.FsrsFourPointFive]: `1`,
  });
});

export const rAssetStatusKind = memoize0(function rAssetStatusKind() {
  return r.enum(AssetStatusKind, {
    [AssetStatusKind.Pending]: `p`,
    [AssetStatusKind.Uploaded]: `u`,
    [AssetStatusKind.Failed]: `f`,
  });
});

export const rSrsState = memoize0(function rSrsParams() {
  return (
    // r.discriminatedUnion(`type`, [
    //   r.object({
    //     type: r.literal(SrsType.Null),
    //   }),
    r.object({
      kind: r.literal(SrsKind.FsrsFourPointFive, rSrsKind()).alias(`t`),
      stability: r.number().alias(`s` /* (F)SRS (S)tability */),
      difficulty: r.number().alias(`d` /* (F)SRS (D)ifficulty */),
      prevReviewAt: r.datetime().alias(`p`),
      nextReviewAt: r.datetime().alias(`n`).indexed(`byNextReviewAt`),
    })
    // ]),
  );
});

/**
 * # v13 change log
 *
 * - **Breaking**: removed pinyin sound entities/mutators in favor of user settings.
 *
 * # v9 change log
 *
 * - **Breaking**: removed pinyin initial/final associations and groups,
 *   replaced with a single unified model.
 *
 * # v8 change log
 *
 * - **Breaking**: the CVR format changed, so the version needed to be
 *   incremented.
 *
 * # v7 change log
 *
 * - **Breaking**: `skillState` `createdAt` and `due` values are now part of
 *   `srs` instead of being separate fields. It's also now non-nullable.
 * - **Breaking**: `initSkillState` mutator is removed.
 *
 * # v6 change log
 *
 * - **Breaking**: entity values no longer exclude the key-path fields, so you
 *   don't need to juggle pulling values sometimes from the key and sometimes
 *   from the value.
 * - **Breaking**: `skillRating` now uses an nanoid in the key rather than
 *   having the `skill` and `createdAt` as a composite-key.
 *
 * # v5 change log
 *
 * - **Breaking**: `rSkill` changes how "hanzi word" skills are encoded. It now
 *   includes the meaning-key when referencing a hanzi. This means all skill
 *   ratings, states, and related mutators are broken.
 *
 * # v4 change log
 *
 * - `skillState` has properties changed from `timestamp()` to `datetime()` so
 *   that they're indexable.
 */
export const v8 = {
  version: `8`,

  //
  // Skills
  //
  skillRating: r.entity(`sr/[id]`, {
    id: r.string().alias(`i`),
    skill: rSkill().alias(`s`).indexed(`bySkill`),
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
    rating: rFsrsRating().alias(`r`),
    durationMs: r.number().nullable().optional().alias(`d`),
  }),
  skillState: r.entity(`s/[skill]`, {
    skill: rSkill().alias(`s`),
    srs: rSrsState().alias(`r`),
  }),

  //
  // Mistakes
  //
  hanziGlossMistake: r.entity(`m/hg/[id]`, {
    id: r.string().alias(`i`),
    hanziOrHanziWord: rHanziOrHanziWord().alias(`h`),
    gloss: r.string().alias(`g`),
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
  }),
  hanziPinyinMistake: r.entity(`m/hp/[id]`, {
    id: r.string().alias(`i`),
    hanziOrHanziWord: rHanziOrHanziWord().alias(`h`),
    pinyin: r.string().alias(`p`),
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
  }),

  //
  // Pinyin mnemonics
  //
  pinyinFinalAssociation: r.entity(`pf/[final]`, {
    final: r.string().alias(`f`),
    name: r.string().alias(`n`),
  }),
  pinyinInitialAssociation: r.entity(`pi/[initial]`, {
    initial: r.string().alias(`i`),
    name: r.string().alias(`n`),
  }),
  pinyinInitialGroupTheme: r.entity(`pigt/[groupId]`, {
    groupId: r.string().alias(`g`),
    themeId: r.string().alias(`t`),
  }),

  //
  // Mutators
  //
  setPinyinInitialAssociation: r.mutator({
    /**
     * The initial component as defined by the pinyin chart. No trailing dash.
     * e.g. `yu`, `ch`, `p`
     */
    initial: r.string().alias(`i`),
    name: r.string().alias(`n`),
    now: r.timestamp().alias(`t`),
  }),
  setPinyinFinalAssociation: r.mutator({
    /**
     * The initial component as defined by the pinyin chart. No leading dash.
     * e.g. `ia`, `ê`, `∅`
     */
    final: r.string().alias(`f`),
    name: r.string().alias(`n`),
    now: r.timestamp().alias(`t`),
  }),
  setPinyinInitialGroupTheme: r.mutator({
    groupId: r.string().alias(`g`),
    themeId: r.string().alias(`t`),
    now: r.timestamp().alias(`n`),
  }),
  rateSkill: r
    .mutator({
      id: r.string().alias(`i`),
      skill: rSkill().alias(`s`),
      rating: rFsrsRating().alias(`r`),
      durationMs: r.number().nullable().alias(`d`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`reviewSkill`),
  saveHanziGlossMistake: r
    .mutator({
      id: r.string().alias(`i`),
      hanziOrHanziWord: rHanziOrHanziWord().alias(`h`),
      gloss: r.string().alias(`g`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`shgm`),
  saveHanziPinyinMistake: r
    .mutator({
      id: r.string().alias(`i`),
      hanziOrHanziWord: rHanziOrHanziWord().alias(`h`),
      /**
       * Intentionally left as strings because this is user input and might not
       * be valid pinyin.
       */
      pinyin: r.string().alias(`p`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`shpm`),

  //
  // Settings
  //
  setting: r.entity(`setting/[key]`, {
    // The setting identifier e.g. `autoCheck`
    key: r.string().alias(`k`),
    // Arbitrary JSON value (or null if unset), parsed by setting-specific
    // logic.
    value: r.jsonObject().nullable().alias(`v`),
  }),

  //
  // Mutators
  //
  setSetting: r
    .mutator({
      key: r.string().alias(`k`),
      value: r.jsonObject().nullable().alias(`v`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`ss`),
};

export const v9 = {
  ...omit(v8, [
    `setPinyinInitialAssociation`,
    `setPinyinFinalAssociation`,
    `setPinyinInitialGroupTheme`,
    `pinyinFinalAssociation`,
    `pinyinInitialAssociation`,
    `pinyinInitialGroupTheme`,
    // Override these to add reviewId and trashedAt
    `skillRating`,
    `hanziGlossMistake`,
    `hanziPinyinMistake`,
    `rateSkill`,
    `saveHanziGlossMistake`,
    `saveHanziPinyinMistake`,
  ]),
  version: `9`,

  //
  // Skills (with reviewId and trashedAt for undo support)
  //
  skillRating: r.entity(`sr/[id]`, {
    id: r.string().alias(`i`),
    skill: rSkill().alias(`s`).indexed(`bySkill`),
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
    rating: rFsrsRating().alias(`r`),
    durationMs: r.number().nullable().optional().alias(`d`),
    reviewId: r.string().nullable().optional().alias(`v`),
    trashedAt: r.datetime().nullable().optional().alias(`u`),
  }),

  //
  // Mistakes (with reviewId and trashedAt for undo support)
  //
  hanziGlossMistake: r.entity(`m/hg/[id]`, {
    id: r.string().alias(`i`),
    hanziOrHanziWord: rHanziOrHanziWord().alias(`h`),
    gloss: r.string().alias(`g`),
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
    reviewId: r.string().nullable().optional().alias(`v`),
    trashedAt: r.datetime().nullable().optional().alias(`u`),
  }),
  hanziPinyinMistake: r.entity(`m/hp/[id]`, {
    id: r.string().alias(`i`),
    hanziOrHanziWord: rHanziOrHanziWord().alias(`h`),
    pinyin: r.string().alias(`p`),
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
    reviewId: r.string().nullable().optional().alias(`v`),
    trashedAt: r.datetime().nullable().optional().alias(`u`),
  }),

  //
  // Mutators (with reviewId for undo support)
  //
  rateSkill: r
    .mutator({
      id: r.string().alias(`i`),
      skill: rSkill().alias(`s`),
      rating: rFsrsRating().alias(`r`),
      durationMs: r.number().nullable().alias(`d`),
      now: r.timestamp().alias(`n`),
      reviewId: r.string().alias(`v`),
    })
    .alias(`reviewSkill`),
  saveHanziGlossMistake: r
    .mutator({
      id: r.string().alias(`i`),
      hanziOrHanziWord: rHanziOrHanziWord().alias(`h`),
      gloss: r.string().alias(`g`),
      now: r.timestamp().alias(`n`),
      reviewId: r.string().alias(`v`),
    })
    .alias(`shgm`),
  saveHanziPinyinMistake: r
    .mutator({
      id: r.string().alias(`i`),
      hanziOrHanziWord: rHanziOrHanziWord().alias(`h`),
      /**
       * Intentionally left as strings because this is user input and might not
       * be valid pinyin.
       */
      pinyin: r.string().alias(`p`),
      now: r.timestamp().alias(`n`),
      reviewId: r.string().alias(`v`),
    })
    .alias(`shpm`),

  // Entities
  pinyinSound: r.entity(`ps/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    name: r.string().nullable().optional().alias(`n`),
  }),
  pinyinSoundGroup: r.entity(`psg/[soundGroupId]`, {
    soundGroupId: rPinyinSoundGroupId().alias(`g`),
    name: r.string().nullable().optional().alias(`n`),
    theme: r.string().nullable().optional().alias(`t`),
  }),

  // Mutators
  setPinyinSoundName: r
    .mutator({
      soundId: rPinyinSoundId().alias(`i`),
      name: r.string().nullable().alias(`n`),
      now: r.timestamp().alias(`t`),
    })
    .alias(`sps-n`),
  setPinyinSoundGroupName: r
    .mutator({
      soundGroupId: rPinyinSoundGroupId().alias(`i`),
      name: r.string().nullable().alias(`n`),
      now: r.timestamp().alias(`t`),
    })
    .alias(`spsg-n`),
  setPinyinSoundGroupTheme: r
    .mutator({
      soundGroupId: rPinyinSoundGroupId().alias(`i`),
      theme: r.string().nullable().alias(`x`),
      now: r.timestamp().alias(`t`),
    })
    .alias(`spsg-t`),
  /**
   * Undo a quiz review by marking all associated ratings and mistakes as trashed.
   * Only works within the 1-day undo window.
   */
  undoReview: r
    .mutator({
      reviewId: r.string().alias(`r`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`ur`),
};

export const v11 = {
  ...omit(v9, []),
  version: `11`,

  //
  // Assets - user-uploaded images for mnemonics
  //

  /**
   * Tracks the status of user-uploaded assets.
   *
   * Assets are immutable once uploaded. The asset ID is generated client-side
   * (algorithm-prefixed, e.g., sha256/<base64url>) to enable optimistic UI
   * updates before the upload completes.
   */
  asset: r.entity(`a/[assetId]`, {
    assetId: r.string().alias(`i`),
    /**
     * Upload status: pending, uploaded, or failed.
     */
    status: rAssetStatusKind().alias(`s`),
    /**
     * MIME type of the asset (e.g. image/jpeg, image/png).
     */
    contentType: r.string().alias(`t`),
    /**
     * File size in bytes.
     */
    contentLength: r.number().alias(`l`),
    /**
     * When the asset record was created.
     */
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
    /**
     * When the upload was confirmed (status changed to uploaded).
     * Null if pending or failed.
     */
    uploadedAt: r.datetime().nullable().optional().alias(`u`),
    /**
     * Error message if the upload failed.
     */
    errorMessage: r.string().nullable().optional().alias(`e`),
  }),

  /**
   * Initialize an asset record when starting an upload.
   * Called before requesting the presigned URL.
   */
  initAsset: r
    .mutator({
      assetId: r.string().alias(`i`),
      contentType: r.string().alias(`t`),
      contentLength: r.number().alias(`l`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`ia`),

  /**
   * Mark an asset as successfully uploaded.
   * Called after the upload to S3 completes successfully.
   */
  confirmAssetUpload: r
    .mutator({
      assetId: r.string().alias(`i`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`cau`),

  /**
   * Mark an asset upload as failed.
   */
  failAssetUpload: r
    .mutator({
      assetId: r.string().alias(`i`),
      errorMessage: r.string().alias(`e`),
      now: r.timestamp().alias(`n`),
    })
    .alias(`fau`),
};

export const v12 = {
  ...v11,
  version: `12`,
  settingHistory: r.entity(`settingHistory/[id]`, {
    id: r.string().alias(`i`),
    key: r.string().alias(`k`).indexed(`byKey`),
    value: r.jsonObject().nullable().alias(`v`),
    createdAt: r.datetime().alias(`c`).indexed(`byCreatedAt`),
  }),
  setSetting: r
    .mutator({
      key: r.string().alias(`k`),
      value: r.jsonObject().nullable().alias(`v`),
      now: r.timestamp().alias(`n`),
      skipHistory: r.boolean().optional().alias(`s`),
      historyId: r.string().optional().alias(`i`),
    })
    .alias(`ss`),
  deleteSettingHistory: r
    .mutator({
      id: r.string().alias(`i`),
    })
    .alias(`dsh`),
};

export const v13 = {
  ...omit(v12, [
    `pinyinSound`,
    `pinyinSoundGroup`,
    `setPinyinSoundName`,
    `setPinyinSoundGroupName`,
    `setPinyinSoundGroupTheme`,
  ]),
  version: `13`,
};

export const currentSchema = v13;

export const supportedSchemas = [v13] as const;

export type Rizzle = RizzleReplicache<typeof currentSchema>;

export type SkillState = NonNullable<
  Awaited<ReturnType<typeof currentSchema.skillState.get>>
>;

export type SkillRating = NonNullable<
  Awaited<ReturnType<typeof currentSchema.skillRating.get>>
>;

export function srsStateFromFsrsState(fsrsState: FsrsState) {
  return {
    kind: SrsKind.FsrsFourPointFive,
    stability: fsrsState.stability,
    difficulty: fsrsState.difficulty,
    nextReviewAt: fsrsState.nextReviewAt,
    prevReviewAt: fsrsState.prevReviewAt,
  } satisfies SrsStateType;
}
