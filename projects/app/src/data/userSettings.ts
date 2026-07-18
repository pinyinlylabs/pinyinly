import type {
  ActorId,
  AssetId,
  HanziText,
  PlaceId,
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
  rAssetId,
  rActorId,
  rHanziWord,
  rPlaceId,
  rPinyinlyObjectId,
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
  historyLimit?: number;
  defaultValue?: UserSettingDefaultValueFn<T>;
}

export function defineUserSetting<T extends RizzleAnyEntity>(
  userSetting: Omit<UserSetting<T>, `kind`>,
): UserSetting<T> {
  return {
    kind: `userSetting`,
    ...userSetting,
  };
}

//
// Settings
//

export const autoCheckUserSetting = defineUserSetting({
  entity: r.entity(`autoCheck`, {
    enabled: r.boolean(`e`),
  }) satisfies UserSettingToggleableEntity,
});

export const userNameSetting = defineUserSetting({
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

export const aiImageStyleSetting = defineUserSetting({
  entity: r.entity(`hwmais`, {
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  defaultValue: () => ({ text: `comic` }),
});

export const aiImagePlaygroundSetting = defineUserSetting({
  entity: r.entity(`aiip/[settingKey]`, {
    settingKey: r.string().alias(`k`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

// Sounds

export const pinyinSoundNameSetting = defineUserSetting({
  entity: r.entity(`psn/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const pinyinSoundGroupNameSetting = defineUserSetting({
  entity: r.entity(`psgn/[soundGroupId]`, {
    soundGroupId: rPinyinSoundGroupId().alias(`g`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  defaultValue: ({ soundGroupId }) => ({
    text: defaultPinyinSoundGroupNames[soundGroupId],
  }),
});

export const pinyinSoundGroupThemeSetting = defineUserSetting({
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

export const pinyinSoundMnemonicIdentitySetting = defineUserSetting({
  entity: r.entity(`psmi/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    mnemonicIdentity: r.json().optional().alias(`j`),
  }),
});

export const pinyinSoundActorNameSetting = defineUserSetting({
  entity: r.entity(`psan/[actorId]`, {
    actorId: rActorId().alias(`a`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const pinyinSoundActorDescriptionSetting = defineUserSetting({
  entity: r.entity(`psad/[actorId]`, {
    actorId: rActorId().alias(`a`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const pinyinSoundActorMnemonicIdentitySetting = defineUserSetting({
  entity: r.entity(`psami/[actorId]`, {
    actorId: rActorId().alias(`a`),
    mnemonicIdentity: r.json().optional().alias(`j`),
  }),
});

export const pinyinSoundActorImageSetting = defineUserSetting({
  entity: r.entity(`psai/[actorId]`, {
    actorId: rActorId().alias(`a`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export const pinyinSoundActorModelSheetImageSetting = defineUserSetting({
  entity: r.entity(`psams/[actorId]`, {
    actorId: rActorId().alias(`a`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export const pinyinSoundActorSelectionSetting = defineUserSetting({
  entity: r.entity(`psas/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    actorIds: r.json().optional().alias(`a`),
  }),
});

export const pinyinSoundPlaceNameSetting = defineUserSetting({
  entity: r.entity(`pspn/[placeId]`, {
    placeId: rPlaceId().alias(`p`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const pinyinSoundPlaceDescriptionSetting = defineUserSetting({
  entity: r.entity(`pspd/[placeId]`, {
    placeId: rPlaceId().alias(`p`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const pinyinSoundPlaceIdentityImageSetting = defineUserSetting({
  entity: r.entity(`pspi/[placeId]`, {
    placeId: rPlaceId().alias(`p`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export const pinyinSoundPlaceSpecificationSetting = defineUserSetting({
  entity: r.entity(`psps/[placeId]`, {
    placeId: rPlaceId().alias(`p`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const pinyinSoundPlaceSublocationNameSetting = defineUserSetting({
  entity: r.entity(`pspln/[placeId]/[role]`, {
    placeId: rPlaceId().alias(`p`),
    role: r.string().alias(`r`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const pinyinSoundPlaceSublocationDescriptionSetting = defineUserSetting({
  entity: r.entity(`pspld/[placeId]/[role]`, {
    placeId: rPlaceId().alias(`p`),
    role: r.string().alias(`r`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const pinyinSoundPlaceSublocationViewpointSetting = defineUserSetting({
  entity: r.entity(`psplv/[placeId]/[role]`, {
    placeId: rPlaceId().alias(`p`),
    role: r.string().alias(`r`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
  historyLimit: 20,
});

export const pinyinSoundPlaceSublocationIdentityImageSetting =
  defineUserSetting({
    entity: r.entity(`pspli/[placeId]/[role]`, {
      placeId: rPlaceId().alias(`p`),
      role: r.string().alias(`r`),
      ...imageSettingFields,
    }) satisfies UserSettingImageEntity,
  });

export const pinyinSoundImageSetting = defineUserSetting({
  entity: r.entity(`psi/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export const pinyinSoundModelSheetImageSetting = defineUserSetting({
  entity: r.entity(`psms/[soundId]`, {
    soundId: rPinyinSoundId().alias(`i`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export function pinyinSoundNameSettingKey(soundId: PinyinSoundId): string {
  return pinyinSoundNameSetting.entity.marshalKey({ soundId });
}

export function pinyinSoundGroupNameSettingKey(
  soundGroupId: PinyinSoundGroupId,
): string {
  return pinyinSoundGroupNameSetting.entity.marshalKey({ soundGroupId });
}

export function pinyinSoundGroupThemeSettingKey(
  soundGroupId: PinyinSoundGroupId,
): string {
  return pinyinSoundGroupThemeSetting.entity.marshalKey({ soundGroupId });
}

export function pinyinSoundDescriptionSettingKey(
  soundId: PinyinSoundId,
): string {
  return pinyinSoundDescriptionSetting.entity.marshalKey({ soundId });
}

export function pinyinSoundMnemonicIdentitySettingKey(
  soundId: PinyinSoundId,
): string {
  return pinyinSoundMnemonicIdentitySetting.entity.marshalKey({ soundId });
}

export function pinyinSoundActorNameSettingKey(actorId: ActorId): string {
  return pinyinSoundActorNameSetting.entity.marshalKey({ actorId });
}

export function pinyinSoundActorDescriptionSettingKey(
  actorId: ActorId,
): string {
  return pinyinSoundActorDescriptionSetting.entity.marshalKey({ actorId });
}

export function pinyinSoundActorMnemonicIdentitySettingKey(
  actorId: ActorId,
): string {
  return pinyinSoundActorMnemonicIdentitySetting.entity.marshalKey({ actorId });
}

export function pinyinSoundActorImageSettingKey(actorId: ActorId): string {
  return pinyinSoundActorImageSetting.entity.marshalKey({ actorId });
}

export function pinyinSoundActorModelSheetImageSettingKey(
  actorId: ActorId,
): string {
  return pinyinSoundActorModelSheetImageSetting.entity.marshalKey({ actorId });
}

export function pinyinSoundActorSelectionSettingKey(
  soundId: PinyinSoundId,
): string {
  return pinyinSoundActorSelectionSetting.entity.marshalKey({ soundId });
}

export function pinyinSoundPlaceNameSettingKey(placeId: PlaceId): string {
  return pinyinSoundPlaceNameSetting.entity.marshalKey({ placeId });
}

export function pinyinSoundPlaceDescriptionSettingKey(
  placeId: PlaceId,
): string {
  return pinyinSoundPlaceDescriptionSetting.entity.marshalKey({ placeId });
}

export function pinyinSoundPlaceIdentityImageSettingKey(
  placeId: PlaceId,
): string {
  return pinyinSoundPlaceIdentityImageSetting.entity.marshalKey({ placeId });
}

export function getPinyinSoundPlaceSublocationKeyParams(
  placeId: PlaceId,
  role: string,
) {
  return { placeId, role };
}

export function pinyinSoundPlaceSublocationNameSettingKey(
  placeId: PlaceId,
  role: string,
): string {
  return pinyinSoundPlaceSublocationNameSetting.entity.marshalKey({
    placeId,
    role,
  });
}

export function pinyinSoundPlaceSublocationDescriptionSettingKey(
  placeId: PlaceId,
  role: string,
): string {
  return pinyinSoundPlaceSublocationDescriptionSetting.entity.marshalKey({
    placeId,
    role,
  });
}

export function pinyinSoundPlaceSublocationViewpointSettingKey(
  placeId: PlaceId,
  role: string,
): string {
  return pinyinSoundPlaceSublocationViewpointSetting.entity.marshalKey({
    placeId,
    role,
  });
}

export function pinyinSoundPlaceSublocationIdentityImageSettingKey(
  placeId: PlaceId,
  role: string,
): string {
  return pinyinSoundPlaceSublocationIdentityImageSetting.entity.marshalKey({
    placeId,
    role,
  });
}

export function pinyinSoundImageSettingKey(soundId: PinyinSoundId): string {
  return pinyinSoundImageSetting.entity.marshalKey({ soundId });
}

export function pinyinSoundModelSheetImageSettingKey(
  soundId: PinyinSoundId,
): string {
  return pinyinSoundModelSheetImageSetting.entity.marshalKey({ soundId });
}

//
// Hanzi hint settings
//

export const hanziWordMeaningHintTextSetting = defineUserSetting({
  entity: r.entity(`hwmht/[hanziWord]`, {
    hanziWord: rHanziWord().alias(`h`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const hanziWordMeaningHintExplanationSetting = defineUserSetting({
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

export const userWikiCharacterDecompositionSetting = defineUserSetting({
  entity: r.entity(`cdo/[hanzi]`, {
    hanzi: r.string().alias(`h`),
    components: r.json().optional().alias(`c`),
  }),
  historyLimit: 20,
});

export function getUserWikiCharacterDecompositionKeyParams(hanzi: HanziText) {
  return { hanzi };
}

export const hanziPronunciationHintTextSetting = defineUserSetting({
  entity: r.entity(`hpht/[hanzi]/[pinyin]`, {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const hanziPronunciationHintExplanationSetting = defineUserSetting({
  entity: r.entity(`hphe/[hanzi]/[pinyin]`, {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const hanziPronunciationHintImageSetting = defineUserSetting({
  entity: r.entity(`hphi/[hanzi]/[pinyin]`, {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export const hanziPronunciationHintImagePromptSetting = defineUserSetting({
  entity: r.entity(`hphip/[hanzi]/[pinyin]`, {
    hanzi: r.string().alias(`h`),
    pinyin: r.string().alias(`p`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
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

export const pinyinFinalToneNameSetting = defineUserSetting({
  entity: r.entity(`pftn/[soundId]/[tone]`, {
    soundId: rPinyinSoundId().alias(`s`),
    tone: r.string().alias(`n`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const pinyinFinalToneDescriptionSetting = defineUserSetting({
  entity: r.entity(`pftd/[soundId]/[tone]`, {
    soundId: rPinyinSoundId().alias(`s`),
    tone: r.string().alias(`n`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const pinyinFinalToneViewpointSetting = defineUserSetting({
  entity: r.entity(`pftv/[soundId]/[tone]`, {
    soundId: rPinyinSoundId().alias(`s`),
    tone: r.string().alias(`n`),
    text: r.string().alias(`t`),
  }) satisfies UserSettingTextEntity,
});

export const pinyinFinalToneImageSetting = defineUserSetting({
  entity: r.entity(`pfti/[soundId]/[tone]`, {
    soundId: rPinyinSoundId().alias(`s`),
    tone: r.string().alias(`n`),
    ...imageSettingFields,
  }) satisfies UserSettingImageEntity,
});

export function getPinyinFinalToneKeyParams(
  soundId: PinyinSoundId,
  tone: string,
) {
  return { soundId, tone };
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
  pinyinSoundActorImageSetting,
  pinyinSoundActorModelSheetImageSetting,
  pinyinSoundPlaceIdentityImageSetting,
  pinyinSoundPlaceSublocationIdentityImageSetting,
  pinyinSoundImageSetting,
  pinyinSoundModelSheetImageSetting,
  hanziWordMeaningHintImageSetting,
  hanziPronunciationHintImageSetting,
  pinyinFinalToneImageSetting,
] as const satisfies readonly UserSetting[];

export const userHanziMeaningDefs = [
  userHanziMeaningGlossSetting,
  userHanziMeaningPinyinSetting,
  userHanziMeaningNoteSetting,
] as const satisfies readonly UserSetting[];

export const userSettingDefinitions = [
  aiImagePlaygroundSetting,
  aiImageStyleSetting,
  autoCheckUserSetting,
  hanziPronunciationHintExplanationSetting,
  hanziPronunciationHintImagePromptSetting,
  hanziPronunciationHintImageSetting,
  hanziPronunciationHintTextSetting,
  hanziWordMeaningHintCaptionSetting,
  hanziWordMeaningHintExplanationSetting,
  hanziWordMeaningHintImagePromptSetting,
  hanziWordMeaningHintImageSetting,
  hanziWordMeaningHintTextSetting,
  pinyinFinalToneDescriptionSetting,
  pinyinFinalToneImageSetting,
  pinyinFinalToneNameSetting,
  pinyinFinalToneViewpointSetting,
  pinyinSoundDescriptionSetting,
  pinyinSoundActorDescriptionSetting,
  pinyinSoundActorImageSetting,
  pinyinSoundActorMnemonicIdentitySetting,
  pinyinSoundActorModelSheetImageSetting,
  pinyinSoundActorNameSetting,
  pinyinSoundActorSelectionSetting,
  pinyinSoundPlaceDescriptionSetting,
  pinyinSoundPlaceIdentityImageSetting,
  pinyinSoundPlaceNameSetting,
  pinyinSoundPlaceSpecificationSetting,
  pinyinSoundPlaceSublocationDescriptionSetting,
  pinyinSoundGroupNameSetting,
  pinyinSoundGroupThemeSetting,
  pinyinSoundImageSetting,
  pinyinSoundMnemonicIdentitySetting,
  pinyinSoundPlaceSublocationIdentityImageSetting,
  pinyinSoundPlaceSublocationNameSetting,
  pinyinSoundPlaceSublocationViewpointSetting,
  pinyinSoundModelSheetImageSetting,
  pinyinSoundNameSetting,
  prioritizedWordItemSetting,
  quickSearchPickSetting,
  userHanziMeaningGlossSetting,
  userHanziMeaningNoteSetting,
  userHanziMeaningPinyinSetting,
  userNameSetting,
  userWikiCharacterDecompositionSetting,
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
