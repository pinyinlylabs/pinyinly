import { useDb } from "@/client/ui/hooks/useDb";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import { parseImageCrop } from "@/client/ui/imageCrop";
import type { AssetId, LocationId, PinyinSoundId } from "@/data/model";
import { isFinalSoundId } from "@/data/pinyin";
import {
  pinyinSoundLocationDescriptionSetting,
  locationIdentityImageSetting,
  pinyinSoundLocationNameSetting,
  pinyinSoundLocationSetDescriptionSetting,
  locationSetIdentityImageSetting,
  pinyinSoundLocationSetNameSetting,
  pinyinSoundLocationThoughtChainsSetting,
} from "@/data/userSettings";
import {
  getHighestScoreLocationSoundThoughtChainCandidate,
  locationSoundThoughtChainCandidateSchema,
  locationSoundThoughtChainsBySoundIdSchema,
} from "@/util/locationSoundThoughtChain";
import type {
  LocationSoundThoughtChainCandidateType,
  LocationSoundThoughtChainsBySoundIdType,
} from "@/util/locationSoundThoughtChain";
import { nanoid } from "@/util/nanoid";
import { useLiveQuery } from "@tanstack/react-db";
import { z } from "zod";

export const locationSetKeys = [
  `entrance`,
  `inside`,
  `basement`,
  `bathroom`,
  `backRoom`,
  `hiddenCloset`,
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
] as const;

export type LocationSetKey = (typeof locationSetKeys)[number];

export interface PinyinSoundLocationSetSummary {
  key: LocationSetKey;
  name?: string | null;
  description?: string | null;
  identityImage?: {
    assetId: AssetId;
    crop: ReturnType<typeof parseImageCrop>;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
}

export interface PinyinSoundLocationSummary {
  locationId: LocationId;
  name: string | null;
  description: string | null;
  identityImage: {
    assetId: AssetId;
    crop: ReturnType<typeof parseImageCrop>;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
  thoughtChainsBySoundId: LocationSoundThoughtChainsBySoundIdType;
  sets: Partial<Record<LocationSetKey, PinyinSoundLocationSetSummary>>;
}

export interface UsePinyinSoundLocationsResult {
  locations: PinyinSoundLocationSummary[];
  isLoading: boolean;
  createLocation: (name?: string) => LocationId;
}

export interface PinyinSoundLocationDisplaySummary {
  name: string | null;
  identityImage: PinyinSoundLocationSummary[`identityImage`];
}

interface LocationAccumulator {
  locationId: LocationId;
  name: string | null;
  description: string | null;
  identityImage: {
    assetId: AssetId;
    crop: ReturnType<typeof parseImageCrop>;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
  thoughtChainsBySoundId: LocationSoundThoughtChainsBySoundIdType;
  sets: Partial<Record<LocationSetKey, PinyinSoundLocationSetSummary>>;
}

export const pinyinSoundLocationThoughtChainSchema =
  locationSoundThoughtChainCandidateSchema;
export const pinyinSoundLocationThoughtChainsSchema = z.array(
  locationSoundThoughtChainCandidateSchema,
);

export type PinyinSoundLocationThoughtChainType =
  LocationSoundThoughtChainCandidateType;

export function getHighestScoreLocationThoughtChain(
  thoughtChains: PinyinSoundLocationThoughtChainType[],
): PinyinSoundLocationThoughtChainType | null {
  return getHighestScoreLocationSoundThoughtChainCandidate(thoughtChains);
}

export function getHighestScoreLocationThoughtChainForSound(
  location: Pick<PinyinSoundLocationSummary, `thoughtChainsBySoundId`>,
  soundId: PinyinSoundId,
): PinyinSoundLocationThoughtChainType | null {
  if (!isFinalSoundId(soundId)) {
    return null;
  }

  const soundThoughtChains = location.thoughtChainsBySoundId[soundId] ?? [];
  return getHighestScoreLocationThoughtChain(soundThoughtChains);
}

function createLocationAccumulator(
  locationId: LocationId,
): LocationAccumulator {
  return {
    locationId,
    name: null,
    description: null,
    identityImage: null,
    thoughtChainsBySoundId: {},
    sets: {},
  };
}

export function getPinyinSoundLocationDisplaySummary(
  location: PinyinSoundLocationSummary,
): PinyinSoundLocationDisplaySummary {
  const topLevelName = location.name?.trim() ?? ``;
  const topLevelImage = location.identityImage;

  if (topLevelName.length > 0 || topLevelImage != null) {
    return {
      name: topLevelName.length > 0 ? topLevelName : null,
      identityImage: topLevelImage,
    };
  }

  const fallbackName = locationSetKeys
    .map((setKey) => location.sets[setKey]?.name?.trim() ?? ``)
    .find((value) => value.length > 0);
  const fallbackImage =
    locationSetKeys
      .map((setKey) => location.sets[setKey]?.identityImage)
      .find((value) => value != null) ?? null;

  return {
    name:
      fallbackName == null || fallbackName.length === 0 ? null : fallbackName,
    identityImage: fallbackImage,
  };
}

function parseLocationAndSetKeyFromKey(
  key: string,
  prefix: string,
): { locationId: LocationId; setKey: LocationSetKey } | null {
  if (!key.startsWith(prefix)) {
    return null;
  }

  const remainder = key.slice(prefix.length);
  const slashIndex = remainder.indexOf(`/`);
  if (slashIndex <= 0 || slashIndex >= remainder.length - 1) {
    return null;
  }

  const locationId = remainder.slice(0, slashIndex) as LocationId;
  const roleRaw = remainder.slice(slashIndex + 1);
  if (!locationSetKeys.includes(roleRaw as LocationSetKey)) {
    return null;
  }

  return { locationId, setKey: roleRaw as LocationSetKey };
}

export function usePinyinSoundLocations(): UsePinyinSoundLocationsResult {
  const db = useDb();
  const r = useRizzle();

  const { data: settings, isLoading } = useLiveQuery(
    (q) => q.from({ setting: db.settingCollection }),
    [db.settingCollection],
  );

  const byLocationId = new Map<LocationId, LocationAccumulator>();

  const getOrCreateLocation = (locationId: LocationId): LocationAccumulator => {
    const existing = byLocationId.get(locationId);
    if (existing != null) {
      return existing;
    }

    const created = createLocationAccumulator(locationId);
    byLocationId.set(locationId, created);
    return created;
  };

  for (const setting of settings) {
    if (setting.key.startsWith(`pspn/`)) {
      const locationId = setting.key.slice(`pspn/`.length) as LocationId;
      const value = pinyinSoundLocationNameSetting.decode(
        { locationId },
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const location = getOrCreateLocation(value.locationId);
      location.name = value.text.trim().length > 0 ? value.text : null;
      continue;
    }

    if (setting.key.startsWith(`pspd/`)) {
      const locationId = setting.key.slice(`pspd/`.length) as LocationId;
      const value = pinyinSoundLocationDescriptionSetting.decode(
        { locationId },
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const location = getOrCreateLocation(value.locationId);
      location.description = value.text;
      continue;
    }

    if (setting.key.startsWith(`pspi/`)) {
      const locationId = setting.key.slice(`pspi/`.length) as LocationId;
      const value = locationIdentityImageSetting.decode(
        { locationId },
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const location = getOrCreateLocation(value.locationId);
      location.identityImage = {
        assetId: value.imageId,
        crop: parseImageCrop(value.imageCrop),
        imageWidth: value.imageWidth ?? null,
        imageHeight: value.imageHeight ?? null,
      };
      continue;
    }

    if (setting.key.startsWith(`psptc/`)) {
      const locationId = setting.key.slice(`psptc/`.length) as LocationId;
      const value = pinyinSoundLocationThoughtChainsSetting.decode(
        { locationId },
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const thoughtChainsResult =
        locationSoundThoughtChainsBySoundIdSchema.safeParse(value.value);
      if (!thoughtChainsResult.success) {
        continue;
      }

      const location = getOrCreateLocation(value.locationId);
      location.thoughtChainsBySoundId = thoughtChainsResult.data;
      continue;
    }

    if (setting.key.startsWith(`pspln/`)) {
      const keyData = parseLocationAndSetKeyFromKey(setting.key, `pspln/`);
      if (keyData == null) {
        continue;
      }

      const value = pinyinSoundLocationSetNameSetting.decode(
        {
          locationId: keyData.locationId,
          setKey: keyData.setKey,
        },
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const location = getOrCreateLocation(value.locationId);
      const setKey = value.setKey as LocationSetKey;
      location.sets[setKey] ??= { key: setKey };
      location.sets[setKey].name =
        value.text.trim().length > 0 ? value.text : null;
      continue;
    }

    if (setting.key.startsWith(`pspld/`)) {
      const keyData = parseLocationAndSetKeyFromKey(setting.key, `pspld/`);
      if (keyData == null) {
        continue;
      }

      const value = pinyinSoundLocationSetDescriptionSetting.decode(
        {
          locationId: keyData.locationId,
          setKey: keyData.setKey,
        },
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const location = getOrCreateLocation(value.locationId);
      const setKey = value.setKey as LocationSetKey;
      location.sets[setKey] ??= { key: setKey };
      location.sets[setKey].description = value.text;
      continue;
    }

    if (setting.key.startsWith(`pspli/`)) {
      const keyData = parseLocationAndSetKeyFromKey(setting.key, `pspli/`);
      if (keyData == null) {
        continue;
      }

      const value = locationSetIdentityImageSetting.decode(
        {
          locationId: keyData.locationId,
          setKey: keyData.setKey,
        },
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const location = getOrCreateLocation(value.locationId);
      const setKey = value.setKey as LocationSetKey;
      location.sets[setKey] ??= { key: setKey };
      location.sets[setKey].identityImage = {
        assetId: value.imageId,
        crop: parseImageCrop(value.imageCrop),
        imageWidth: value.imageWidth ?? null,
        imageHeight: value.imageHeight ?? null,
      };
    }
  }

  const locations = [...byLocationId.values()].sort((a, b) => {
    return (a.name ?? ``).localeCompare(b.name ?? ``);
  });

  const createLocation = (name = `New location`): LocationId => {
    const locationId = `place_${nanoid()}` as LocationId;

    void r.mutate.setSetting({
      key: pinyinSoundLocationNameSetting.entity.marshalKey({ locationId }),
      value: pinyinSoundLocationNameSetting.entity.marshalValue({
        locationId: locationId,
        text: name,
      }),
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });

    for (const role of locationSetKeys) {
      void r.mutate.setSetting({
        key: pinyinSoundLocationSetNameSetting.entity.marshalKey({
          locationId,
          setKey: role,
        }),
        value: null,
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
      void r.mutate.setSetting({
        key: pinyinSoundLocationSetDescriptionSetting.entity.marshalKey({
          locationId,
          setKey: role,
        }),
        value: null,
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
      void r.mutate.setSetting({
        key: locationSetIdentityImageSetting.entity.marshalKey({
          locationId,
          setKey: role,
        }),
        value: null,
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
    }

    void r.mutate.setSetting({
      key: pinyinSoundLocationDescriptionSetting.entity.marshalKey({
        locationId,
      }),
      value: null,
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });
    void r.mutate.setSetting({
      key: locationIdentityImageSetting.entity.marshalKey({ locationId }),
      value: null,
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });
    void r.mutate.setSetting({
      key: pinyinSoundLocationThoughtChainsSetting.entity.marshalKey({
        locationId,
      }),
      value: null,
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });

    return locationId;
  };

  return {
    locations,
    isLoading,
    createLocation,
  };
}
