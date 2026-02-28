import type {
  HanziText,
  PinyinSoundGroupId,
  PinyinSoundId,
  PinyinUnit,
} from "@/data/model";
import {
  defaultPinyinSoundGroupNames,
  defaultPinyinSoundGroupThemes,
  normalizePinyinUnitForHintKey,
} from "@/data/pinyin";
import {
  rHanziWord,
  rPinyinSoundGroupId,
  rPinyinSoundId,
} from "@/data/rizzleSchema";
import type {
  RizzleAnyEntity,
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

export type UserSettingKeyInput<T extends RizzleAnyEntity> = Parameters<
  T[`marshalKey`]
>[0];

export type UserSettingDefaultValueFn<T extends RizzleAnyEntity> = (
  keyParams: UserSettingKeyInput<T>,
) => Record<string, unknown> | null;

export interface UserSetting<T extends RizzleAnyEntity = RizzleAnyEntity> {
  kind: `userSetting`;
  entity: T;
  historyLimit?: number;
  defaultValue?: UserSettingDefaultValueFn<T>;
}

export type UserSettingLike<T extends RizzleAnyEntity = RizzleAnyEntity> =
  | UserSetting<T>
  | T;

export function defineUserSetting<T extends RizzleAnyEntity>(
  userSetting: Omit<UserSetting<T>, `kind`>,
): UserSetting<T> {
  return {
    kind: `userSetting`,
    ...userSetting,
  };
}

export function isUserSetting<T extends RizzleAnyEntity>(
  userSettingLike: UserSettingLike<T>,
): userSettingLike is UserSetting<T> {
  return (
    typeof userSettingLike === `object` &&
    userSettingLike != null &&
    `kind` in userSettingLike &&
    userSettingLike.kind === `userSetting`
  );
}

export function userSettingEntity<T extends RizzleAnyEntity>(
  userSettingLike: UserSettingLike<T>,
): T {
  return isUserSetting(userSettingLike)
    ? userSettingLike.entity
    : userSettingLike;
}

//
// Settings
//

export const autoCheckUserSetting = r.entity(`autoCheck`, {
  enabled: r.boolean(`e`),
}) satisfies UserSettingToggleableEntity;

export const autoCheckUserSettingDef = defineUserSetting({
  entity: autoCheckUserSetting,
});

// Sounds

export const pinyinSoundNameSetting = r.entity(`psn/[soundId]`, {
  soundId: rPinyinSoundId().alias(`i`),
  text: r.string().alias(`t`),
}) satisfies UserSettingTextEntity;

export const pinyinSoundNameSettingDef = defineUserSetting({
  entity: pinyinSoundNameSetting,
});

export const pinyinSoundGroupNameSetting = r.entity(`psgn/[soundGroupId]`, {
  soundGroupId: rPinyinSoundGroupId().alias(`g`),
  text: r.string().alias(`t`),
}) satisfies UserSettingTextEntity;

export const pinyinSoundGroupNameSettingDef = defineUserSetting({
  entity: pinyinSoundGroupNameSetting,
  defaultValue: ({ soundGroupId }) => ({
    text: defaultPinyinSoundGroupNames[soundGroupId],
  }),
});

export const pinyinSoundGroupThemeSetting = r.entity(`psgt/[soundGroupId]`, {
  soundGroupId: rPinyinSoundGroupId().alias(`g`),
  text: r.string().alias(`t`),
}) satisfies UserSettingTextEntity;

export const pinyinSoundGroupThemeSettingDef = defineUserSetting({
  entity: pinyinSoundGroupThemeSetting,
  defaultValue: ({ soundGroupId }) => ({
    text: defaultPinyinSoundGroupThemes[soundGroupId],
  }),
});

export const pinyinSoundDescriptionSetting = r.entity(`psd/[soundId]`, {
  soundId: rPinyinSoundId().alias(`i`),
  text: r.string().alias(`t`),
}) satisfies UserSettingTextEntity;

export const pinyinSoundDescriptionSettingDef = defineUserSetting({
  entity: pinyinSoundDescriptionSetting,
});

export const pinyinSoundImageSetting = r.entity(`psi/[soundId]`, {
  soundId: rPinyinSoundId().alias(`i`),
  ...imageSettingFields,
}) satisfies UserSettingImageEntity;

export const pinyinSoundImageSettingDef = defineUserSetting({
  entity: pinyinSoundImageSetting,
});

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

export const hanziWordMeaningHintTextSettingDef = defineUserSetting({
  entity: hanziWordMeaningHintTextSetting,
});

export const hanziWordMeaningHintExplanationSetting = r.entity(
  `hwmhe/[hanziWord]`,
  {
    hanziWord: rHanziWord().alias(`h`),
    text: r.string().alias(`t`),
  },
) satisfies UserSettingTextEntity;

export const hanziWordMeaningHintExplanationSettingDef = defineUserSetting({
  entity: hanziWordMeaningHintExplanationSetting,
});

export const hanziWordMeaningHintImageSetting = r.entity(`hwmhi/[hanziWord]`, {
  hanziWord: rHanziWord().alias(`h`),
  ...imageSettingFields,
}) satisfies UserSettingImageEntity;

export const hanziWordMeaningHintImageSettingDef = defineUserSetting({
  entity: hanziWordMeaningHintImageSetting,
});

export const hanziWordMeaningHintImagePromptSetting = r.entity(
  `hwmhip/[hanziWord]`,
  {
    hanziWord: rHanziWord().alias(`h`),
    text: r.string().alias(`t`),
  },
) satisfies UserSettingTextEntity;

export const hanziWordMeaningHintImagePromptSettingDef = defineUserSetting({
  entity: hanziWordMeaningHintImagePromptSetting,
});

export const hanziPronunciationHintTextSetting = r.entity(
  `hpht/[hanzi]/[pinyin]`,
  {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    text: r.string().alias(`t`),
  },
) satisfies UserSettingTextEntity;

export const hanziPronunciationHintTextSettingDef = defineUserSetting({
  entity: hanziPronunciationHintTextSetting,
});

export const hanziPronunciationHintExplanationSetting = r.entity(
  `hphe/[hanzi]/[pinyin]`,
  {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    text: r.string().alias(`t`),
  },
) satisfies UserSettingTextEntity;

export const hanziPronunciationHintExplanationSettingDef = defineUserSetting({
  entity: hanziPronunciationHintExplanationSetting,
});

export const hanziPronunciationHintImageSetting: UserSettingImageEntity =
  r.entity(`hphi/[hanzi]/[pinyin]`, {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity;

export const hanziPronunciationHintImageSettingDef = defineUserSetting({
  entity: hanziPronunciationHintImageSetting,
});

export const hanziPronunciationHintImagePromptSetting = r.entity(
  `hphip/[hanzi]/[pinyin]`,
  {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    text: r.string().alias(`t`),
  },
) satisfies UserSettingTextEntity;

export const hanziPronunciationHintImagePromptSettingDef = defineUserSetting({
  entity: hanziPronunciationHintImagePromptSetting,
});

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

export const pinyinFinalToneNameSettingDef = defineUserSetting({
  entity: pinyinFinalToneNameSetting,
});

export const pinyinFinalToneDescriptionSetting = r.entity(
  `pftd/[soundId]/[tone]`,
  {
    soundId: rPinyinSoundId().alias(`s`),
    tone: r.string().alias(`n`),
    text: r.string().alias(`t`),
  },
) satisfies UserSettingTextEntity;

export const pinyinFinalToneDescriptionSettingDef = defineUserSetting({
  entity: pinyinFinalToneDescriptionSetting,
});

export const pinyinFinalToneImageSetting = r.entity(`pfti/[soundId]/[tone]`, {
  soundId: rPinyinSoundId().alias(`s`),
  tone: r.string().alias(`n`),
  ...imageSettingFields,
}) satisfies UserSettingImageEntity;

export const pinyinFinalToneImageSettingDef = defineUserSetting({
  entity: pinyinFinalToneImageSetting,
});

export function getPinyinFinalToneKeyParams(
  soundId: PinyinSoundId,
  tone: string,
) {
  return { soundId, tone };
}

/**
 * All user settings that contain image references.
 * Used for syncing assets between servers.
 */
export const imageSettings = [
  pinyinSoundImageSetting,
  hanziWordMeaningHintImageSetting,
  hanziPronunciationHintImageSetting,
  pinyinFinalToneImageSetting,
] as const satisfies readonly UserSettingImageEntity[];

export const userSettingDefinitions = [
  autoCheckUserSettingDef,
  pinyinSoundNameSettingDef,
  pinyinSoundGroupNameSettingDef,
  pinyinSoundGroupThemeSettingDef,
  pinyinSoundDescriptionSettingDef,
  pinyinSoundImageSettingDef,
  hanziWordMeaningHintTextSettingDef,
  hanziWordMeaningHintExplanationSettingDef,
  hanziWordMeaningHintImageSettingDef,
  hanziWordMeaningHintImagePromptSettingDef,
  hanziPronunciationHintTextSettingDef,
  hanziPronunciationHintExplanationSettingDef,
  hanziPronunciationHintImageSettingDef,
  hanziPronunciationHintImagePromptSettingDef,
  pinyinFinalToneNameSettingDef,
  pinyinFinalToneDescriptionSettingDef,
  pinyinFinalToneImageSettingDef,
] as const satisfies readonly UserSetting[];

function userSettingFromEntity(entity: RizzleAnyEntity): UserSetting | null {
  for (const userSetting of userSettingDefinitions) {
    if (userSetting.entity === entity) {
      return userSetting;
    }
  }
  return null;
}

function userSettingPrefixFromKey(settingKey: string): string {
  const keyParamIndex = settingKey.indexOf(`/`);
  return keyParamIndex === -1
    ? settingKey
    : settingKey.slice(0, keyParamIndex + 1);
}

export function getUserSettingHistoryLimit(
  userSettingLike: UserSettingLike,
): number | undefined {
  const userSetting = isUserSetting(userSettingLike)
    ? userSettingLike
    : userSettingFromEntity(userSettingLike);
  return userSetting?.historyLimit;
}

export function getUserSettingHistoryLimitFromKey(
  settingKey: string,
): number | undefined {
  const settingKeyPrefix = userSettingPrefixFromKey(settingKey);
  for (const userSetting of userSettingDefinitions) {
    if (userSetting.entity.keyPrefix === settingKeyPrefix) {
      return userSetting.historyLimit;
    }
  }
  return undefined;
}

export function getUserSettingDefaultValue<T extends RizzleAnyEntity>(
  userSettingLike: UserSettingLike<T>,
  keyParams: UserSettingKeyInput<T>,
): Record<string, unknown> | null {
  const userSetting = isUserSetting(userSettingLike)
    ? userSettingLike
    : userSettingFromEntity(userSettingLike);
  if (userSetting?.defaultValue == null) {
    return null;
  }
  return userSetting.defaultValue(keyParams);
}

/**
 * Get SQL LIKE patterns for finding user settings that contain images.
 * Returns patterns like 'psi/%', 'hwmhi/%', etc.
 */
export function getImageSettingKeyPatterns(): string[] {
  return imageSettings.map((setting) => {
    const keyPath = setting._def.keyPath;
    // Extract the prefix before the first parameter (e.g., "psi/" from "psi/[soundId]")
    const prefix = keyPath.split(`[`)[0] ?? ``;
    return `${prefix}%`;
  });
}
