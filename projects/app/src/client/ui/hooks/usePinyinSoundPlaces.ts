import { useDb } from "@/client/ui/hooks/useDb";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import { getSettingKeyInfo } from "@/client/ui/hooks/useUserSetting";
import { parseImageCrop } from "@/client/ui/imageCrop";
import type { AssetId, PlaceId } from "@/data/model";
import {
  pinyinSoundLocationDescriptionSetting,
  pinyinSoundLocationDescriptionSettingKey,
  pinyinSoundLocationIdentityImageSetting,
  pinyinSoundLocationIdentityImageSettingKey,
  pinyinSoundLocationNameSetting,
  pinyinSoundLocationNameSettingKey,
  pinyinSoundLocationSetDescriptionSetting,
  pinyinSoundLocationSetDescriptionSettingKey,
  pinyinSoundLocationSetIdentityImageSetting,
  pinyinSoundLocationSetIdentityImageSettingKey,
  pinyinSoundLocationSetNameSetting,
  pinyinSoundLocationSetNameSettingKey,
} from "@/data/userSettings";
import { nanoid } from "@/util/nanoid";
import { useLiveQuery } from "@tanstack/react-db";

function decodeSettingValueWithFallback<T>(
  decode: (value: unknown) => T | null,
  keyParamMarshaled: Record<string, unknown>,
  rawValue: unknown,
): T | null {
  if (rawValue == null) {
    return null;
  }

  const merged = decode({
    ...keyParamMarshaled,
    ...(rawValue as Record<string, unknown>),
  });
  if (merged != null) {
    return merged;
  }

  return decode(rawValue);
}

export const locationSetRoles = [
  `arrival`,
  `heart`,
  `below`,
  `ascent`,
  `summit`,
] as const;

export type LocationSetRole = (typeof locationSetRoles)[number];

export interface PinyinSoundLocationSetSummary {
  role: LocationSetRole;
  name: string | null;
  description: string | null;
  identityImage: {
    assetId: AssetId;
    crop: ReturnType<typeof parseImageCrop>;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
}

export interface PinyinSoundLocationSummary {
  placeId: PlaceId;
  name: string | null;
  description: string | null;
  identityImage: {
    assetId: AssetId;
    crop: ReturnType<typeof parseImageCrop>;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
  sets: Record<LocationSetRole, PinyinSoundLocationSetSummary>;
}

export interface UsePinyinSoundPlacesResult {
  places: PinyinSoundLocationSummary[];
  isLoading: boolean;
  createPlace: (name?: string) => PlaceId;
}

export interface PinyinSoundPlaceDisplaySummary {
  name: string | null;
  identityImage: PinyinSoundLocationSummary[`identityImage`];
}

interface PlaceAccumulator {
  placeId: PlaceId;
  name: string | null;
  description: string | null;
  identityImage: {
    assetId: AssetId;
    crop: ReturnType<typeof parseImageCrop>;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
  sets: Record<LocationSetRole, PinyinSoundLocationSetSummary>;
}

function createEmptySet(role: LocationSetRole): PinyinSoundLocationSetSummary {
  return {
    role,
    name: null,
    description: null,
    identityImage: null,
  };
}

function createPlaceAccumulator(placeId: PlaceId): PlaceAccumulator {
  return {
    placeId,
    name: null,
    description: null,
    identityImage: null,
    sets: {
      arrival: createEmptySet(`arrival`),
      heart: createEmptySet(`heart`),
      below: createEmptySet(`below`),
      ascent: createEmptySet(`ascent`),
      summit: createEmptySet(`summit`),
    },
  };
}

export function getPinyinSoundPlaceDisplaySummary(
  place: PinyinSoundLocationSummary,
): PinyinSoundPlaceDisplaySummary {
  const topLevelName = place.name?.trim() ?? ``;
  const topLevelImage = place.identityImage;

  if (topLevelName.length > 0 || topLevelImage != null) {
    return {
      name: topLevelName.length > 0 ? topLevelName : null,
      identityImage: topLevelImage,
    };
  }

  const fallbackName = locationSetRoles
    .map((role) => place.sets[role].name?.trim() ?? ``)
    .find((value) => value.length > 0);
  const fallbackImage =
    locationSetRoles
      .map((role) => place.sets[role].identityImage)
      .find((value) => value != null) ?? null;

  return {
    name:
      fallbackName == null || fallbackName.length === 0 ? null : fallbackName,
    identityImage: fallbackImage,
  };
}

function parsePlaceAndRoleFromKey(
  key: string,
  prefix: string,
): { placeId: PlaceId; role: LocationSetRole } | null {
  if (!key.startsWith(prefix)) {
    return null;
  }

  const remainder = key.slice(prefix.length);
  const slashIndex = remainder.indexOf(`/`);
  if (slashIndex <= 0 || slashIndex >= remainder.length - 1) {
    return null;
  }

  const placeId = remainder.slice(0, slashIndex) as PlaceId;
  const roleRaw = remainder.slice(slashIndex + 1);
  if (!locationSetRoles.includes(roleRaw as LocationSetRole)) {
    return null;
  }

  return { placeId, role: roleRaw as LocationSetRole };
}

export function usePinyinSoundPlaces(): UsePinyinSoundPlacesResult {
  const db = useDb();
  const r = useRizzle();

  const { data: settings, isLoading } = useLiveQuery(
    (q) => q.from({ setting: db.settingCollection }),
    [db.settingCollection],
  );

  const byPlaceId = new Map<PlaceId, PlaceAccumulator>();

  const getOrCreatePlace = (placeId: PlaceId): PlaceAccumulator => {
    const existing = byPlaceId.get(placeId);
    if (existing != null) {
      return existing;
    }

    const created = createPlaceAccumulator(placeId);
    byPlaceId.set(placeId, created);
    return created;
  };

  for (const setting of settings) {
    if (setting.key.startsWith(`pspn/`)) {
      const placeId = setting.key.slice(`pspn/`.length) as PlaceId;
      const { keyParamMarshaled } = getSettingKeyInfo(
        pinyinSoundLocationNameSetting,
        {
          placeId,
        },
      );
      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundLocationNameSetting.entity.unmarshalValueSafe(input),
        keyParamMarshaled,
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const place = getOrCreatePlace(value.placeId);
      place.name = value.text.trim().length > 0 ? value.text : null;
      continue;
    }

    if (setting.key.startsWith(`pspd/`)) {
      const placeId = setting.key.slice(`pspd/`.length) as PlaceId;
      const { keyParamMarshaled } = getSettingKeyInfo(
        pinyinSoundLocationDescriptionSetting,
        { placeId },
      );
      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundLocationDescriptionSetting.entity.unmarshalValueSafe(
            input,
          ),
        keyParamMarshaled,
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const place = getOrCreatePlace(value.placeId);
      place.description = value.text;
      continue;
    }

    if (setting.key.startsWith(`pspi/`)) {
      const placeId = setting.key.slice(`pspi/`.length) as PlaceId;
      const { keyParamMarshaled } = getSettingKeyInfo(
        pinyinSoundLocationIdentityImageSetting,
        {
          placeId,
        },
      );
      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundLocationIdentityImageSetting.entity.unmarshalValueSafe(
            input,
          ),
        keyParamMarshaled,
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const place = getOrCreatePlace(value.placeId);
      place.identityImage = {
        assetId: value.imageId,
        crop: parseImageCrop(value.imageCrop),
        imageWidth: value.imageWidth ?? null,
        imageHeight: value.imageHeight ?? null,
      };
      continue;
    }

    if (setting.key.startsWith(`pspln/`)) {
      const keyData = parsePlaceAndRoleFromKey(setting.key, `pspln/`);
      if (keyData == null) {
        continue;
      }

      const { keyParamMarshaled } = getSettingKeyInfo(
        pinyinSoundLocationSetNameSetting,
        {
          placeId: keyData.placeId,
          role: keyData.role,
        },
      );
      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundLocationSetNameSetting.entity.unmarshalValueSafe(input),
        keyParamMarshaled,
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const place = getOrCreatePlace(value.placeId);
      const role = value.role as LocationSetRole;
      place.sets[role].name = value.text.trim().length > 0 ? value.text : null;
      continue;
    }

    if (setting.key.startsWith(`pspld/`)) {
      const keyData = parsePlaceAndRoleFromKey(setting.key, `pspld/`);
      if (keyData == null) {
        continue;
      }

      const { keyParamMarshaled } = getSettingKeyInfo(
        pinyinSoundLocationSetDescriptionSetting,
        {
          placeId: keyData.placeId,
          role: keyData.role,
        },
      );
      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundLocationSetDescriptionSetting.entity.unmarshalValueSafe(
            input,
          ),
        keyParamMarshaled,
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const place = getOrCreatePlace(value.placeId);
      const role = value.role as LocationSetRole;
      place.sets[role].description = value.text;
      continue;
    }

    if (setting.key.startsWith(`pspli/`)) {
      const keyData = parsePlaceAndRoleFromKey(setting.key, `pspli/`);
      if (keyData == null) {
        continue;
      }

      const { keyParamMarshaled } = getSettingKeyInfo(
        pinyinSoundLocationSetIdentityImageSetting,
        {
          placeId: keyData.placeId,
          role: keyData.role,
        },
      );
      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundLocationSetIdentityImageSetting.entity.unmarshalValueSafe(
            input,
          ),
        keyParamMarshaled,
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const place = getOrCreatePlace(value.placeId);
      const role = value.role as LocationSetRole;
      place.sets[role].identityImage = {
        assetId: value.imageId,
        crop: parseImageCrop(value.imageCrop),
        imageWidth: value.imageWidth ?? null,
        imageHeight: value.imageHeight ?? null,
      };
    }
  }

  const places = [...byPlaceId.values()].sort((a, b) => {
    return (a.name ?? ``).localeCompare(b.name ?? ``);
  });

  const createPlace = (name = `New place`): PlaceId => {
    const placeId = `place_${nanoid()}` as PlaceId;

    void r.mutate.setSetting({
      key: pinyinSoundLocationNameSettingKey(placeId),
      value: pinyinSoundLocationNameSetting.entity.marshalValue({
        placeId,
        text: name,
      }),
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });

    for (const role of locationSetRoles) {
      void r.mutate.setSetting({
        key: pinyinSoundLocationSetNameSettingKey(placeId, role),
        value: null,
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
      void r.mutate.setSetting({
        key: pinyinSoundLocationSetDescriptionSettingKey(placeId, role),
        value: null,
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
      void r.mutate.setSetting({
        key: pinyinSoundLocationSetIdentityImageSettingKey(placeId, role),
        value: null,
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
    }

    void r.mutate.setSetting({
      key: pinyinSoundLocationDescriptionSettingKey(placeId),
      value: null,
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });
    void r.mutate.setSetting({
      key: pinyinSoundLocationIdentityImageSettingKey(placeId),
      value: null,
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });

    return placeId;
  };

  return {
    places,
    isLoading,
    createPlace,
  };
}
