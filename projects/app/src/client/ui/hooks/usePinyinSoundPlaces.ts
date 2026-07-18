import { useDb } from "@/client/ui/hooks/useDb";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import { getSettingKeyInfo } from "@/client/ui/hooks/useUserSetting";
import { parseImageCrop } from "@/client/ui/imageCrop";
import type { AssetId, PlaceId } from "@/data/model";
import {
  pinyinSoundPlaceDescriptionSetting,
  pinyinSoundPlaceDescriptionSettingKey,
  pinyinSoundPlaceIdentityImageSetting,
  pinyinSoundPlaceIdentityImageSettingKey,
  pinyinSoundPlaceNameSetting,
  pinyinSoundPlaceNameSettingKey,
  pinyinSoundPlaceSublocationDescriptionSetting,
  pinyinSoundPlaceSublocationDescriptionSettingKey,
  pinyinSoundPlaceSublocationIdentityImageSetting,
  pinyinSoundPlaceSublocationIdentityImageSettingKey,
  pinyinSoundPlaceSublocationNameSetting,
  pinyinSoundPlaceSublocationNameSettingKey,
  pinyinSoundPlaceSublocationViewpointSetting,
  pinyinSoundPlaceSublocationViewpointSettingKey,
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

export const placeSublocationRoles = [
  `arrival`,
  `heart`,
  `below`,
  `ascent`,
  `summit`,
] as const;

export type PlaceSublocationRole = (typeof placeSublocationRoles)[number];

export interface PinyinSoundPlaceSublocationSummary {
  role: PlaceSublocationRole;
  name: string | null;
  description: string | null;
  viewpoint: string | null;
  identityImage: {
    assetId: AssetId;
    crop: ReturnType<typeof parseImageCrop>;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
}

export interface PinyinSoundPlaceSummary {
  placeId: PlaceId;
  name: string | null;
  description: string | null;
  identityImage: {
    assetId: AssetId;
    crop: ReturnType<typeof parseImageCrop>;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
  sublocations: Record<
    PlaceSublocationRole,
    PinyinSoundPlaceSublocationSummary
  >;
}

export interface UsePinyinSoundPlacesResult {
  places: PinyinSoundPlaceSummary[];
  isLoading: boolean;
  createPlace: (name?: string) => PlaceId;
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
  sublocations: Record<
    PlaceSublocationRole,
    PinyinSoundPlaceSublocationSummary
  >;
}

function createEmptySublocation(
  role: PlaceSublocationRole,
): PinyinSoundPlaceSublocationSummary {
  return {
    role,
    name: null,
    description: null,
    viewpoint: null,
    identityImage: null,
  };
}

function createPlaceAccumulator(placeId: PlaceId): PlaceAccumulator {
  return {
    placeId,
    name: null,
    description: null,
    identityImage: null,
    sublocations: {
      arrival: createEmptySublocation(`arrival`),
      heart: createEmptySublocation(`heart`),
      below: createEmptySublocation(`below`),
      ascent: createEmptySublocation(`ascent`),
      summit: createEmptySublocation(`summit`),
    },
  };
}

function parsePlaceAndRoleFromKey(
  key: string,
  prefix: string,
): { placeId: PlaceId; role: PlaceSublocationRole } | null {
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
  if (!placeSublocationRoles.includes(roleRaw as PlaceSublocationRole)) {
    return null;
  }

  return { placeId, role: roleRaw as PlaceSublocationRole };
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
        pinyinSoundPlaceNameSetting,
        {
          placeId,
        },
      );
      const value = decodeSettingValueWithFallback(
        (input) => pinyinSoundPlaceNameSetting.entity.unmarshalValueSafe(input),
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
        pinyinSoundPlaceDescriptionSetting,
        { placeId },
      );
      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundPlaceDescriptionSetting.entity.unmarshalValueSafe(input),
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
        pinyinSoundPlaceIdentityImageSetting,
        {
          placeId,
        },
      );
      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundPlaceIdentityImageSetting.entity.unmarshalValueSafe(input),
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
        pinyinSoundPlaceSublocationNameSetting,
        {
          placeId: keyData.placeId,
          role: keyData.role,
        },
      );
      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundPlaceSublocationNameSetting.entity.unmarshalValueSafe(
            input,
          ),
        keyParamMarshaled,
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const place = getOrCreatePlace(value.placeId);
      const role = value.role as PlaceSublocationRole;
      place.sublocations[role].name =
        value.text.trim().length > 0 ? value.text : null;
      continue;
    }

    if (setting.key.startsWith(`pspld/`)) {
      const keyData = parsePlaceAndRoleFromKey(setting.key, `pspld/`);
      if (keyData == null) {
        continue;
      }

      const { keyParamMarshaled } = getSettingKeyInfo(
        pinyinSoundPlaceSublocationDescriptionSetting,
        {
          placeId: keyData.placeId,
          role: keyData.role,
        },
      );
      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundPlaceSublocationDescriptionSetting.entity.unmarshalValueSafe(
            input,
          ),
        keyParamMarshaled,
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const place = getOrCreatePlace(value.placeId);
      const role = value.role as PlaceSublocationRole;
      place.sublocations[role].description = value.text;
      continue;
    }

    if (setting.key.startsWith(`psplv/`)) {
      const keyData = parsePlaceAndRoleFromKey(setting.key, `psplv/`);
      if (keyData == null) {
        continue;
      }

      const { keyParamMarshaled } = getSettingKeyInfo(
        pinyinSoundPlaceSublocationViewpointSetting,
        {
          placeId: keyData.placeId,
          role: keyData.role,
        },
      );
      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundPlaceSublocationViewpointSetting.entity.unmarshalValueSafe(
            input,
          ),
        keyParamMarshaled,
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const place = getOrCreatePlace(value.placeId);
      const role = value.role as PlaceSublocationRole;
      place.sublocations[role].viewpoint = value.text;
      continue;
    }

    if (setting.key.startsWith(`pspli/`)) {
      const keyData = parsePlaceAndRoleFromKey(setting.key, `pspli/`);
      if (keyData == null) {
        continue;
      }

      const { keyParamMarshaled } = getSettingKeyInfo(
        pinyinSoundPlaceSublocationIdentityImageSetting,
        {
          placeId: keyData.placeId,
          role: keyData.role,
        },
      );
      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundPlaceSublocationIdentityImageSetting.entity.unmarshalValueSafe(
            input,
          ),
        keyParamMarshaled,
        setting.value,
      );
      if (value == null) {
        continue;
      }

      const place = getOrCreatePlace(value.placeId);
      const role = value.role as PlaceSublocationRole;
      place.sublocations[role].identityImage = {
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
      key: pinyinSoundPlaceNameSettingKey(placeId),
      value: pinyinSoundPlaceNameSetting.entity.marshalValue({
        placeId,
        text: name,
      }),
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });

    for (const role of placeSublocationRoles) {
      void r.mutate.setSetting({
        key: pinyinSoundPlaceSublocationNameSettingKey(placeId, role),
        value: null,
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
      void r.mutate.setSetting({
        key: pinyinSoundPlaceSublocationDescriptionSettingKey(placeId, role),
        value: null,
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
      void r.mutate.setSetting({
        key: pinyinSoundPlaceSublocationViewpointSettingKey(placeId, role),
        value: null,
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
      void r.mutate.setSetting({
        key: pinyinSoundPlaceSublocationIdentityImageSettingKey(placeId, role),
        value: null,
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
    }

    void r.mutate.setSetting({
      key: pinyinSoundPlaceDescriptionSettingKey(placeId),
      value: null,
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });
    void r.mutate.setSetting({
      key: pinyinSoundPlaceIdentityImageSettingKey(placeId),
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
