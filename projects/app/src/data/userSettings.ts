import type {
  AssetId,
  HanziText,
  LocationSetKey,
  PinyinSoundId,
  PinyinUnit,
} from "@/data/model";
import { locationSetKeySchema } from "@/data/model";
import {
  defaultPinyinSoundGroupNames,
  defaultPinyinSoundGroupThemes,
  isToneSoundId,
  normalizePinyinUnitForHintKey,
} from "@/data/pinyin";
import {
  rAssetId,
  rActorId,
  rHanziWord,
  rLocationId,
  rPinyinlyObjectId,
  rPinyinSoundGroupId,
  rPinyinSoundId,
} from "@/data/rizzleSchema";
import type {
  RizzleAnyEntity,
  RizzleEntityInput,
  RizzleEntityOutput,
  RizzleBoolean,
  RizzleEntity,
  RizzleType,
  RizzleTypeAlias,
  RizzleTypeDef,
} from "@/util/rizzle";
import { keyPathVariableNames, r } from "@/util/rizzle";

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

// A user setting entity that has a `json` field
export type UserSettingJsonEntity = RizzleEntity<
  string,
  {
    value: RizzleTypeAlias<
      RizzleType<RizzleTypeDef, unknown, unknown, unknown>,
      `j`
    >;
  }
>;

// A user setting entity that has an `imageId` field

const imageSettingFields = {
  imageId: rAssetId().alias(`t`),
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
      RizzleType<RizzleTypeDef, AssetId, AssetId, AssetId>,
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
  /**
   * Decode a stored user-setting value for a specific key.
   *
   * Stored setting values intentionally omit key-path fields (for example
   * `soundId`) to reduce payload size. Callers must therefore provide the same
   * key params used to load the row so decode can reconstruct the full
   * marshaled object before calling the entity decoder.
   */
  decode(
    keyParams: UserSettingKeyInput<T>,
    storedValue: unknown,
  ): RizzleEntityOutput<T> | null;
  /**
   * Marshal an in-memory setting value into the persisted DB payload shape.
   *
   * The returned object excludes fields represented in the setting key-path,
   * so only the value-specific portion is stored in `setting.value`.
   */
  encodeStoredValue(
    keyParams: UserSettingKeyInput<T>,
    value: RizzleEntityInput<T> | null,
  ): Record<string, unknown> | null;
  historyLimit?: number;
  defaultValue?: UserSettingDefaultValueFn<T>;
}

export function getUserSettingKeyInfo<T extends RizzleAnyEntity>(
  userSetting: UserSetting<T>,
  keyParams: UserSettingKeyInput<T>,
) {
  /**
   * Build key metadata used by both read and write paths:
   * - `settingKey`: encoded key-path string for DB lookup
   * - `keyParamAliases`: marshaled field names that belong to key params
   * - `keyParamMarshaled`: marshaled key fields used to reconstruct decode input
   */
  const settingEntity = userSetting.entity;
  const settingKey = settingEntity.marshalKey(keyParams);
  const valueShape = (
    settingEntity._def.valueType as unknown as {
      _def: { shape: Record<string, RizzleType> };
    }
  )._def.shape;
  const keyParamNames = keyPathVariableNames(settingEntity._def.keyPath);
  const keyParamAliases = keyParamNames.map((name) => {
    const type = valueShape[name];
    return type == null ? name : (type._getAlias() ?? name);
  });

  const keyParamMarshaled: Record<string, string> = {};
  for (const name of keyParamNames) {
    const type = valueShape[name];
    if (type == null) {
      continue;
    }
    const alias = type._getAlias() ?? name;
    const rawValue = (keyParams as Record<string, unknown>)[name];
    if (rawValue == null) {
      continue;
    }
    keyParamMarshaled[alias] = type.marshal(rawValue) as string;
  }

  return { settingKey, keyParamAliases, keyParamMarshaled, valueShape };
}

export function decodeUserSettingValue<T extends RizzleAnyEntity>(
  userSetting: UserSetting<T>,
  keyParams: UserSettingKeyInput<T>,
  storedValue: unknown,
): RizzleEntityOutput<T> | null {
  if (storedValue == null) {
    return null;
  }

  const { keyParamMarshaled } = getUserSettingKeyInfo(userSetting, keyParams);

  if (typeof storedValue !== `object`) {
    // Defensive fallback: handle malformed legacy rows that are not objects.
    return userSetting.entity.unmarshalValueSafe(storedValue);
  }

  return userSetting.entity.unmarshalValueSafe({
    ...keyParamMarshaled,
    ...(storedValue as Record<string, unknown>),
  });
}

export function encodeUserSettingStoredValue<T extends RizzleAnyEntity>(
  userSetting: UserSetting<T>,
  keyParams: UserSettingKeyInput<T>,
  value: RizzleEntityInput<T> | null,
): Record<string, unknown> | null {
  if (value == null) {
    return null;
  }

  const { keyParamAliases } = getUserSettingKeyInfo(userSetting, keyParams);
  const marshaledValue = userSetting.entity.marshalValue({
    ...(keyParams as Record<string, unknown>),
    ...(value as Record<string, unknown>),
  });

  if (keyParamAliases.length === 0) {
    return marshaledValue;
  }

  // Persist only non-key fields; key fields are encoded in `setting.key`.
  return Object.fromEntries(
    Object.entries(marshaledValue as Record<string, unknown>).filter(
      ([key]) => !keyParamAliases.includes(key),
    ),
  );
}

export function defineUserSetting<T extends RizzleAnyEntity>(
  userSetting: Omit<UserSetting<T>, `kind` | `decode` | `encodeStoredValue`>,
): UserSetting<T> {
  const setting = {
    kind: `userSetting`,
    ...userSetting,
  } as Omit<UserSetting<T>, `decode` | `encodeStoredValue`>;

  return {
    ...setting,
    decode: (keyParams, storedValue) =>
      decodeUserSettingValue(setting as UserSetting<T>, keyParams, storedValue),
    encodeStoredValue: (keyParams, value) =>
      encodeUserSettingStoredValue(setting as UserSetting<T>, keyParams, value),
  };
}

//
// Settings
//

export const autoCheckUserToggleSetting = defineUserSetting({
  entity: r.entity(`autoCheck`, {
    enabled: r.boolean(`e`),
  }) satisfies UserSettingToggleableEntity,
});

export const userNameTextSetting = defineUserSetting({
  entity: r.entity(`userName`, {
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const quickSearchPickSetting = defineUserSetting({
  entity: r.entity(`qsr`, {
    objectId: rPinyinlyObjectId().alias(`o`),
  }),
  historyLimit: 20,
});

export const aiImageStyleTextSetting = defineUserSetting({
  entity: r.entity(`hwmais`, {
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  defaultValue: () => ({ text: `comic` }),
});

export const aiImagePlaygroundTextSetting = defineUserSetting({
  entity: r.entity(`aiip/[settingKey]`, {
    settingKey: r.string().alias(`k`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

// Sounds

export const pinyinSoundNameTextSetting = defineUserSetting({
  entity: r.entity(`psn/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const pinyinSoundGroupNameTextSetting = defineUserSetting({
  entity: r.entity(`psgn/[soundGroupId]`, {
    soundGroupId: rPinyinSoundGroupId().alias(`g`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  defaultValue: ({ soundGroupId }) => ({
    text: defaultPinyinSoundGroupNames[soundGroupId],
  }),
});

export const pinyinSoundGroupThemeTextSetting = defineUserSetting({
  entity: r.entity(`psgt/[soundGroupId]`, {
    soundGroupId: rPinyinSoundGroupId().alias(`g`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  defaultValue: ({ soundGroupId }) => ({
    text: defaultPinyinSoundGroupThemes[soundGroupId],
  }),
});

export const pinyinSoundDescriptionSetting = defineUserSetting({
  entity: r.entity(`psd/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const pinyinSoundMnemonicIdentityJsonSetting = defineUserSetting({
  entity: r.entity(`psmi/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    value: r.json().optional().alias(`j`),
  }) satisfies UserSettingJsonEntity,
});

export const defaultLocationSetKeyByToneSoundId = {
  "1": `entrance`,
  "2": `stairway`,
  "3": `basement`,
  "4": `bathroom`,
  "5": `hiddenCloset`,
} as const satisfies Record<`1` | `2` | `3` | `4` | `5`, LocationSetKey>;

export function getDefaultLocationSetKeyForToneSoundId(
  soundId: PinyinSoundId,
): LocationSetKey | null {
  if (!isToneSoundId(soundId)) {
    return null;
  }

  return defaultLocationSetKeyByToneSoundId[
    soundId as keyof typeof defaultLocationSetKeyByToneSoundId
  ];
}

export function getEffectiveToneSetKeyForSoundId(
  soundId: PinyinSoundId,
  setKey: string | null | undefined,
): LocationSetKey | null {
  const defaultSetKey = getDefaultLocationSetKeyForToneSoundId(soundId);
  if (defaultSetKey == null) {
    return null;
  }

  const parsedSetKey = locationSetKeySchema.safeParse(setKey);
  if (!parsedSetKey.success) {
    return defaultSetKey;
  }

  return parsedSetKey.data;
}

/**
 * Get the name of location set.
 *
 * Names use normal English capitalization as it would appear inside a sentence,
 * not title capitalization. Proper nouns retain their normal capitalization;
 * common nouns are lowercase.
 */
export function getLocationSetName(setKey: LocationSetKey): string {
  return locationSetNameByKey[setKey];
}

const locationSetNameByKey = {
  entrance: `entrance`,
  inside: `inside`,
  basement: `basement`,
  bathroom: `bathroom`,
  backRoom: `back room`,
  hiddenCloset: `hidden closet`,
  stairway: `stairway`,
  staircase: `staircase`,
  arrival: `arrival`,
  heart: `heart`,
  below: `below`,
  ascent: `ascent`,
  summit: `summit`,
} as const satisfies Record<LocationSetKey, string>;

export function getToneSoundNameFromSetKey(
  soundId: PinyinSoundId,
  setKey: string | null | undefined,
): string | null {
  const resolvedSetKey = getEffectiveToneSetKeyForSoundId(soundId, setKey);
  return resolvedSetKey == null ? null : getLocationSetName(resolvedSetKey);
}

export const actorNameTextSetting = defineUserSetting({
  entity: r.entity(`psan/[actorId]`, {
    actorId: rActorId().alias(`a`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const actorDescriptionTextSetting = defineUserSetting({
  entity: r.entity(`psad/[actorId]`, {
    actorId: rActorId().alias(`a`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const actorSpecJsonSetting = defineUserSetting({
  entity: r.entity(`psami/[actorId]`, {
    actorId: rActorId().alias(`a`),
    value: r.json().optional().alias(`j`),
  }) satisfies UserSettingJsonEntity,
});

export const actorIdentityImageSetting = defineUserSetting({
  entity: r.entity(`psai/[actorId]`, {
    actorId: rActorId().alias(`a`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export const actorModelSheetImageSetting = defineUserSetting({
  entity: r.entity(`psams/[actorId]`, {
    actorId: rActorId().alias(`a`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export const pinyinSoundActorSetting = defineUserSetting({
  entity: r.entity(`psas/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    actorId: rActorId().optional().alias(`a`),
  }),
});

export const pinyinSoundLocationSetting = defineUserSetting({
  entity: r.entity(`pfsps/[soundId]`, {
    soundId: rPinyinSoundId().alias(`s`),
    locationId: rLocationId().alias(`p`),
  }),
});

export const pinyinSoundLocationSetKeySetting = defineUserSetting({
  entity: r.entity(`pstsk/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    setKey: r.string().alias(`k`),
  }),
  defaultValue: ({ soundId }) => {
    const defaultSetKey = getDefaultLocationSetKeyForToneSoundId(soundId);
    if (defaultSetKey == null) {
      return null;
    }

    return { setKey: defaultSetKey };
  },
});

export const pinyinSoundLocationNameSetting = defineUserSetting({
  entity: r.entity(`pspn/[locationId]`, {
    locationId: rLocationId().alias(`p`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const pinyinSoundLocationDescriptionSetting = defineUserSetting({
  entity: r.entity(`pspd/[locationId]`, {
    locationId: rLocationId().alias(`p`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const locationIdentityImageSetting = defineUserSetting({
  entity: r.entity(`pspi/[locationId]`, {
    locationId: rLocationId().alias(`p`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export const locationSpecJsonSetting = defineUserSetting({
  entity: r.entity(`psps/[locationId]`, {
    locationId: rLocationId().alias(`p`),
    value: r.json().optional().alias(`j`),
  }) satisfies UserSettingJsonEntity,
  historyLimit: 20,
});

export const locationThoughtChainsJsonSetting = defineUserSetting({
  entity: r.entity(`psptc/[locationId]`, {
    locationId: rLocationId().alias(`p`),
    value: r.json().optional().alias(`j`),
  }) satisfies UserSettingJsonEntity,
});

export const locationSetDescriptionTextSetting = defineUserSetting({
  entity: r.entity(`pspld/[locationId]/[setKey]`, {
    locationId: rLocationId().alias(`p`),
    setKey: r.string().alias(`r`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const locationSetIdentityImageSetting = defineUserSetting({
  entity: r.entity(`pspli/[locationId]/[setKey]`, {
    locationId: rLocationId().alias(`p`),
    setKey: r.string().alias(`r`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export const pinyinSoundImageSetting = defineUserSetting({
  entity: r.entity(`psi/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

//
// Hanzi hint settings
//

export const hanziWordMeaningHintTextSetting = defineUserSetting({
  entity: r.entity(`hwmht/[hanziWord]`, {
    hanziWord: rHanziWord().alias(`h`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const hanziWordMeaningHintExplanationTextSetting = defineUserSetting({
  entity: r.entity(`hwmhe/[hanziWord]`, {
    hanziWord: rHanziWord().alias(`h`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const hanziWordMeaningHintImageSetting = defineUserSetting({
  entity: r.entity(`hwmhi/[hanziWord]`, {
    hanziWord: rHanziWord().alias(`h`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export const hanziWordMeaningHintImagePromptSetting = defineUserSetting({
  entity: r.entity(`hwmhip/[hanziWord]`, {
    hanziWord: rHanziWord().alias(`h`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const hanziWordMeaningHintCaptionSetting = defineUserSetting({
  entity: r.entity(`hwmhc/[hanziWord]`, {
    hanziWord: rHanziWord().alias(`h`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export function getUserWikiCharacterDecompositionKeyParams(hanzi: HanziText) {
  return { hanzi };
}

export const pronunciationMnemonicTextSetting = defineUserSetting({
  entity: r.entity(`hpht/[hanzi]/[pinyin]`, {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const pronunciationMnemonicImageSetting = defineUserSetting({
  entity: r.entity(`hphi/[hanzi]/[pinyin]`, {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export const pronunciationMnemonicImagePromptSetting = defineUserSetting({
  entity: r.entity(`hphip/[hanzi]/[pinyin]`, {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const pronunciationMnemonicSpecSetting = defineUserSetting({
  entity: r.entity(`hphms/[hanzi]/[pinyin]`, {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    value: r.json().optional().alias(`j`),
  }) satisfies UserSettingJsonEntity,
});

export function getHanziPronunciationMnemonicKeyParams(
  hanzi: HanziText,
  pinyinUnit: PinyinUnit,
) {
  return {
    hanzi,
    pinyin: normalizePinyinUnitForHintKey(pinyinUnit),
  };
}

//
// Priority words list (bookmarking)
//

export const prioritizedWordItemSetting = defineUserSetting({
  entity: r.entity(`pwi/[word]`, {
    word: r.string().alias(`w`),
    createdAt: r.datetime().alias(`c`),
    note: r.string().optional().alias(`n`),
  }),
});

export function getPrioritizedWordKeyParams(word: string) {
  return { word };
}

//
// User-defined hanzi meanings
// Each field is stored as a separate setting to enable use of InlineEditableSettingText
//

export const userHanziMeaningGlossSetting = defineUserSetting({
  entity: r.entity(`uhm/[hanzi]/[meaningKey]/g`, {
    hanzi: r.string().alias(`h`),
    meaningKey: r.string().alias(`m`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const userHanziMeaningPinyinSetting = defineUserSetting({
  entity: r.entity(`uhm/[hanzi]/[meaningKey]/p`, {
    hanzi: r.string().alias(`h`),
    meaningKey: r.string().alias(`m`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const userHanziMeaningNoteSetting = defineUserSetting({
  entity: r.entity(`uhm/[hanzi]/[meaningKey]/n`, {
    hanzi: r.string().alias(`h`),
    meaningKey: r.string().alias(`m`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export function getUserHanziMeaningKeyParams(
  hanzi: HanziText,
  meaningKey: string,
) {
  return { hanzi, meaningKey };
}

/**
 * Returns a SQL LIKE pattern for querying all user hanzi meaning settings for a given hanzi.
 * Matches all settings under uhm/[hanzi]/* (gloss, pinyin, and note).
 * Convention: All user hanzi meaning entities must use the keyPrefix `uhm/[hanzi]/`
 */
export function userHanziSettingLike(hanzi: HanziText): string {
  return `${userHanziMeaningGlossSetting.entity.keyPrefix}${hanzi}/%`;
}

/**
 * All user settings that contain image references.
 * Used for syncing assets between servers.
 */
export const imageSettingDefs = [
  actorIdentityImageSetting,
  actorModelSheetImageSetting,
  locationIdentityImageSetting,
  locationSetIdentityImageSetting,
  pinyinSoundImageSetting,
  hanziWordMeaningHintImageSetting,
  pronunciationMnemonicImageSetting,
] as const satisfies readonly UserSetting[];

export const userHanziMeaningDefs = [
  userHanziMeaningGlossSetting,
  userHanziMeaningPinyinSetting,
  userHanziMeaningNoteSetting,
] as const satisfies readonly UserSetting[];

export const userSettingDefinitions = [
  aiImagePlaygroundTextSetting,
  aiImageStyleTextSetting,
  autoCheckUserToggleSetting,
  pinyinSoundLocationSetting,
  pronunciationMnemonicImagePromptSetting,
  pronunciationMnemonicImageSetting,
  pronunciationMnemonicTextSetting,
  hanziWordMeaningHintCaptionSetting,
  hanziWordMeaningHintExplanationTextSetting,
  hanziWordMeaningHintImagePromptSetting,
  hanziWordMeaningHintImageSetting,
  hanziWordMeaningHintTextSetting,
  pinyinSoundDescriptionSetting,
  actorDescriptionTextSetting,
  actorIdentityImageSetting,
  actorSpecJsonSetting,
  actorModelSheetImageSetting,
  actorNameTextSetting,
  pinyinSoundActorSetting,
  pinyinSoundLocationDescriptionSetting,
  locationIdentityImageSetting,
  pinyinSoundLocationNameSetting,
  locationSpecJsonSetting,
  locationThoughtChainsJsonSetting,
  locationSetDescriptionTextSetting,
  pinyinSoundGroupNameTextSetting,
  pinyinSoundGroupThemeTextSetting,
  pinyinSoundImageSetting,
  pinyinSoundMnemonicIdentityJsonSetting,
  pinyinSoundLocationSetKeySetting,
  locationSetIdentityImageSetting,
  pinyinSoundNameTextSetting,
  prioritizedWordItemSetting,
  quickSearchPickSetting,
  userHanziMeaningGlossSetting,
  userHanziMeaningNoteSetting,
  userHanziMeaningPinyinSetting,
  userNameTextSetting,
] as const satisfies readonly UserSetting[];

function userSettingPrefixFromKey(settingKey: string): string {
  const keyParamIndex = settingKey.indexOf(`/`);
  return keyParamIndex === -1
    ? settingKey
    : settingKey.slice(0, keyParamIndex + 1);
}

export function getUserSettingHistoryLimit(
  userSetting: UserSetting,
): number | undefined {
  return userSetting.historyLimit;
}

export const defaultUserSettingHistoryLimit = 20;

export function getUserSettingHistoryLimitFromKey(settingKey: string): number {
  const settingKeyPrefix = userSettingPrefixFromKey(settingKey);
  for (const userSetting of userSettingDefinitions) {
    if (
      userSetting.entity.keyPrefix === settingKeyPrefix &&
      userSetting.historyLimit != null
    ) {
      return userSetting.historyLimit;
    }
  }

  return defaultUserSettingHistoryLimit;
}

export function getUserSettingDefaultValue<T extends RizzleAnyEntity>(
  userSetting: UserSetting<T>,
  keyParams: UserSettingKeyInput<T>,
): Record<string, unknown> | null {
  return userSetting.defaultValue?.(keyParams) ?? null;
}

/**
 * Get SQL LIKE patterns for finding user settings that contain images.
 * Returns patterns like 'psi/%', 'hwmhi/%', etc.
 */
export function getImageSettingKeyPatterns(): string[] {
  return imageSettingDefs.map((setting) => {
    const keyPath = setting.entity._def.keyPath;
    // Extract the prefix before the first parameter (e.g., "psi/" from "psi/[soundId]")
    const prefix = keyPath.split(`[`)[0] ?? ``;
    return `${prefix}%`;
  });
}
