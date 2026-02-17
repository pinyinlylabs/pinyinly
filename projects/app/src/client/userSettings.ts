import type {
  HanziText,
  PinyinSoundGroupId,
  PinyinSoundId,
  PinyinUnit,
} from "@/data/model";
import { normalizePinyinUnitForHintKey } from "@/data/pinyin";
import {
  rHanziWord,
  rPinyinSoundGroupId,
  rPinyinSoundId,
} from "@/data/rizzleSchema";
import type {
  RizzleBoolean,
  RizzleEntity,
  RizzleType,
  RizzleTypeAlias,
  RizzleTypeDef,
} from "@/util/rizzle";
import { r } from "@/util/rizzle";

// A user setting entity that has a `text` field
export type UserSettingTextEntity = RizzleEntity<
  string,
  {
    text: RizzleTypeAlias<
      RizzleType<RizzleTypeDef, string, string, string>,
      `t`
    >;
  }
>;

// A user setting entity that has an `imageId` field

const imageSettingFields = {
  imageId: r.string().alias(`t`),
  imageCrop: r
    .object({
      x: r.number().optional().alias(`x`),
      y: r.number().optional().alias(`y`),
      width: r.number().optional().alias(`w`),
      height: r.number().optional().alias(`h`),
    })
    .optional()
    .alias(`c`),
  imageWidth: r.number().optional().alias(`w`),
  imageHeight: r.number().optional().alias(`ht`),
} as const;

export type UserSettingImageEntity = RizzleEntity<
  string,
  {
    imageId: RizzleTypeAlias<
      RizzleType<RizzleTypeDef, string, string, string>,
      `t`
    >;
    imageCrop: RizzleTypeAlias<RizzleType, `c`>;
    imageWidth: RizzleTypeAlias<RizzleType, `w`>;
    imageHeight: RizzleTypeAlias<RizzleType, `ht`>;
  }
>;

export type UserSettingToggleableEntity = RizzleEntity<
  string,
  { enabled: RizzleTypeAlias<RizzleBoolean, `e`> }
>;

//
// Settings
//

export const autoCheckUserSetting = r.entity(`autoCheck`, {
  enabled: r.boolean(`e`),
}) satisfies UserSettingToggleableEntity;

// Sounds

export const pinyinSoundNameSetting = r.entity(`psn/[soundId]`, {
  soundId: rPinyinSoundId().alias(`i`),
  text: r.string().alias(`t`),
}) satisfies UserSettingTextEntity;

export const pinyinSoundGroupNameSetting = r.entity(`psgn/[soundGroupId]`, {
  soundGroupId: rPinyinSoundGroupId().alias(`g`),
  text: r.string().alias(`t`),
}) satisfies UserSettingTextEntity;

export const pinyinSoundGroupThemeSetting = r.entity(`psgt/[soundGroupId]`, {
  soundGroupId: rPinyinSoundGroupId().alias(`g`),
  text: r.string().alias(`t`),
}) satisfies UserSettingTextEntity;

export const pinyinSoundDescriptionSetting = r.entity(`psd/[soundId]`, {
  soundId: rPinyinSoundId().alias(`i`),
  text: r.string().alias(`t`),
}) satisfies UserSettingTextEntity;

export const pinyinSoundImageSetting = r.entity(`psi/[soundId]`, {
  soundId: rPinyinSoundId().alias(`i`),
  ...imageSettingFields,
}) satisfies UserSettingImageEntity;

export function pinyinSoundNameSettingKey(soundId: PinyinSoundId): string {
  return pinyinSoundNameSetting.marshalKey({ soundId });
}

export function pinyinSoundGroupNameSettingKey(
  soundGroupId: PinyinSoundGroupId,
): string {
  return pinyinSoundGroupNameSetting.marshalKey({ soundGroupId });
}

export function pinyinSoundGroupThemeSettingKey(
  soundGroupId: PinyinSoundGroupId,
): string {
  return pinyinSoundGroupThemeSetting.marshalKey({ soundGroupId });
}

export function pinyinSoundDescriptionSettingKey(
  soundId: PinyinSoundId,
): string {
  return pinyinSoundDescriptionSetting.marshalKey({ soundId });
}

export function pinyinSoundImageSettingKey(soundId: PinyinSoundId): string {
  return pinyinSoundImageSetting.marshalKey({ soundId });
}

//
// Hanzi hint settings
//

export const hanziWordMeaningHintTextSetting = r.entity(`hwmht/[hanziWord]`, {
  hanziWord: rHanziWord().alias(`h`),
  text: r.string().alias(`t`),
}) satisfies UserSettingTextEntity;

export const hanziWordMeaningHintExplanationSetting = r.entity(
  `hwmhe/[hanziWord]`,
  {
    hanziWord: rHanziWord().alias(`h`),
    text: r.string().alias(`t`),
  },
) satisfies UserSettingTextEntity;

export const hanziWordMeaningHintImageSetting = r.entity(`hwmhi/[hanziWord]`, {
  hanziWord: rHanziWord().alias(`h`),
  ...imageSettingFields,
}) satisfies UserSettingImageEntity;

export const hanziPronunciationHintTextSetting = r.entity(
  `hpht/[hanzi]/[pinyin]`,
  {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    text: r.string().alias(`t`),
  },
) satisfies UserSettingTextEntity;

export const hanziPronunciationHintExplanationSetting = r.entity(
  `hphe/[hanzi]/[pinyin]`,
  {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    text: r.string().alias(`t`),
  },
) satisfies UserSettingTextEntity;

export const hanziPronunciationHintImageSetting: UserSettingImageEntity =
  r.entity(`hphi/[hanzi]/[pinyin]`, {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity;

export function getHanziPronunciationHintKeyParams(
  hanzi: HanziText,
  pinyinUnit: PinyinUnit,
) {
  return {
    hanzi,
    pinyin: normalizePinyinUnitForHintKey(pinyinUnit),
  };
}

//
// Pinyin final + tone details (mnemonic locations with tone-specific imagery)
//

export const pinyinFinalToneNameSetting = r.entity(`pftn/[soundId]/[tone]`, {
  soundId: rPinyinSoundId().alias(`s`),
  tone: r.string().alias(`n`),
  text: r.string().alias(`t`),
}) satisfies UserSettingTextEntity;

export const pinyinFinalToneDescriptionSetting = r.entity(
  `pftd/[soundId]/[tone]`,
  {
    soundId: rPinyinSoundId().alias(`s`),
    tone: r.string().alias(`n`),
    text: r.string().alias(`t`),
  },
) satisfies UserSettingTextEntity;

export const pinyinFinalToneImageSetting = r.entity(`pfti/[soundId]/[tone]`, {
  soundId: rPinyinSoundId().alias(`s`),
  tone: r.string().alias(`n`),
  ...imageSettingFields,
}) satisfies UserSettingImageEntity;

export function getPinyinFinalToneKeyParams(
  soundId: PinyinSoundId,
  tone: string,
) {
  return { soundId, tone };
}
