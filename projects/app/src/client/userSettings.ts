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
import { r } from "@/util/rizzle";
import type {
  RizzleBoolean,
  RizzleEntity,
  RizzleType,
  RizzleTypeAlias,
  RizzleTypeDef,
} from "@/util/rizzle";

// A user setting entity that has a `text` field
export type UserSettingTextEntity = RizzleEntity<
  string,
  { text: RizzleType<RizzleTypeDef, string, string, string> }
>;

// A user setting entity that has an `imageId` field
export type UserSettingImageEntity = RizzleEntity<
  string,
  {
    imageId: RizzleType<RizzleTypeDef, string, string, string>;
    imageCrop: RizzleType;
    imageWidth: RizzleType;
    imageHeight: RizzleType;
  }
>;

export type UserSettingToggleableEntity = RizzleEntity<
  string,
  { enabled: RizzleBoolean | RizzleTypeAlias<RizzleBoolean> }
>;

//
// Settings
//

export const autoCheckUserSetting = r.entity(`autoCheck`, {
  enabled: r.boolean(`e`),
}) satisfies UserSettingToggleableEntity;

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

export const x = r.json();

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
