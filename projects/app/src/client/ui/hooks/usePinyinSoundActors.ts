import { useDb } from "@/client/ui/hooks/useDb";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import { getSettingKeyInfo } from "@/client/ui/hooks/useUserSetting";
import { parseImageCrop } from "@/client/ui/imageCrop";
import type { ActorId, AssetId, PinyinSoundId } from "@/data/model";
import {
  pinyinSoundActorDescriptionSetting,
  pinyinSoundActorDescriptionSettingKey,
  pinyinSoundActorImageSetting,
  pinyinSoundActorImageSettingKey,
  pinyinSoundActorMnemonicIdentitySetting,
  pinyinSoundActorMnemonicIdentitySettingKey,
  pinyinSoundActorModelSheetImageSetting,
  pinyinSoundActorModelSheetImageSettingKey,
  pinyinSoundActorNameSetting,
  pinyinSoundActorNameSettingKey,
  pinyinSoundActorSelectionSetting,
  pinyinSoundActorSelectionSettingKey,
} from "@/data/userSettings";
import { nanoid } from "@/util/nanoid";
import { useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";

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

export interface PinyinSoundActorSummary {
  actorId: ActorId;
  name: string | null;
  description: string | null;
  image: {
    assetId: AssetId;
    crop: ReturnType<typeof parseImageCrop>;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
}

export interface UsePinyinSoundActorsResult {
  actors: PinyinSoundActorSummary[];
  isLoading: boolean;
  createActor: (name?: string) => ActorId;
  saveActorToDirectory: (input: SaveActorToDirectoryInput) => ActorId;
  soundActorIdsBySoundId: Map<PinyinSoundId, readonly ActorId[]>;
  setSoundActorIds: (
    soundId: PinyinSoundId,
    actorIds: readonly ActorId[],
  ) => void;
}

export type SaveActorToDirectoryTargetKind = `new` | `existing`;

export interface SaveActorToDirectoryTargetNew {
  kind: `new`;
}

export interface SaveActorToDirectoryTargetExisting {
  kind: `existing`;
  actorId: ActorId;
}

export type SaveActorToDirectoryTarget =
  | SaveActorToDirectoryTargetNew
  | SaveActorToDirectoryTargetExisting;

export interface SaveActorToDirectoryInput {
  target: SaveActorToDirectoryTarget;
  name: string | null;
  description: string | null;
  mnemonicIdentity: unknown;
  image: {
    imageId: AssetId | null;
    imageCrop?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    } | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
  } | null;
  modelSheetImage: {
    imageId: AssetId | null;
    imageCrop?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    } | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
  } | null;
  fallbackName: string;
}

function parseActorIds(value: unknown): readonly ActorId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const actorIds: ActorId[] = [];
  for (const item of value) {
    if (typeof item === `string` && item.trim().length > 0) {
      actorIds.push(item as ActorId);
    }
  }

  return [...new Set(actorIds)];
}

export function usePinyinSoundActors(): UsePinyinSoundActorsResult {
  const db = useDb();
  const r = useRizzle();

  const { data: settings, isLoading } = useLiveQuery(
    (q) => q.from({ setting: db.settingCollection }),
    [db.settingCollection],
  );

  const actors = useMemo(() => {
    interface ActorAccumulator {
      actorId: ActorId;
      name: string | null;
      description: string | null;
      image: {
        assetId: AssetId;
        crop: ReturnType<typeof parseImageCrop>;
        imageWidth: number | null;
        imageHeight: number | null;
      } | null;
    }

    const byActorId = new Map<ActorId, ActorAccumulator>();

    const getOrCreateActor = (actorId: ActorId): ActorAccumulator => {
      const existing = byActorId.get(actorId);
      if (existing != null) {
        return existing;
      }

      const created: ActorAccumulator = {
        actorId,
        name: null,
        description: null,
        image: null,
      };
      byActorId.set(actorId, created);
      return created;
    };

    for (const setting of settings) {
      if (setting.key.startsWith(`psan/`)) {
        const actorId = setting.key.slice(`psan/`.length) as ActorId;
        const { keyParamMarshaled } = getSettingKeyInfo(
          pinyinSoundActorNameSetting,
          { actorId },
        );
        const value = decodeSettingValueWithFallback(
          (input) =>
            pinyinSoundActorNameSetting.entity.unmarshalValueSafe(input),
          keyParamMarshaled,
          setting.value,
        );
        if (value == null) {
          continue;
        }

        const actor = getOrCreateActor(value.actorId);
        actor.name = value.text.trim().length > 0 ? value.text : null;
        continue;
      }

      if (setting.key.startsWith(`psad/`)) {
        const actorId = setting.key.slice(`psad/`.length) as ActorId;
        const { keyParamMarshaled } = getSettingKeyInfo(
          pinyinSoundActorDescriptionSetting,
          { actorId },
        );
        const value = decodeSettingValueWithFallback(
          (input) =>
            pinyinSoundActorDescriptionSetting.entity.unmarshalValueSafe(input),
          keyParamMarshaled,
          setting.value,
        );
        if (value == null) {
          continue;
        }

        const actor = getOrCreateActor(value.actorId);
        actor.description = value.text;
        continue;
      }

      if (setting.key.startsWith(`psai/`)) {
        const actorId = setting.key.slice(`psai/`.length) as ActorId;
        const { keyParamMarshaled } = getSettingKeyInfo(
          pinyinSoundActorImageSetting,
          { actorId },
        );
        const value = decodeSettingValueWithFallback(
          (input) =>
            pinyinSoundActorImageSetting.entity.unmarshalValueSafe(input),
          keyParamMarshaled,
          setting.value,
        );
        if (value == null) {
          continue;
        }

        const actor = getOrCreateActor(value.actorId);
        actor.image = {
          assetId: value.imageId,
          crop: parseImageCrop(value.imageCrop),
          imageWidth: value.imageWidth ?? null,
          imageHeight: value.imageHeight ?? null,
        };
      }
    }

    return [...byActorId.values()].sort((a, b) => {
      return (a.name ?? ``).localeCompare(b.name ?? ``);
    });
  }, [settings]);

  const soundActorIdsBySoundId = useMemo(() => {
    const bySoundId = new Map<PinyinSoundId, readonly ActorId[]>();

    for (const setting of settings) {
      if (!setting.key.startsWith(`psas/`)) {
        continue;
      }

      const soundId = setting.key.slice(`psas/`.length) as PinyinSoundId;
      const { keyParamMarshaled } = getSettingKeyInfo(
        pinyinSoundActorSelectionSetting,
        { soundId },
      );

      const value = decodeSettingValueWithFallback(
        (input) =>
          pinyinSoundActorSelectionSetting.entity.unmarshalValueSafe(input),
        keyParamMarshaled,
        setting.value,
      );
      if (value == null) {
        continue;
      }

      bySoundId.set(value.soundId, parseActorIds(value.actorIds));
    }

    return bySoundId;
  }, [settings]);

  const createActor = (name = `New actor`): ActorId => {
    const actorId = `actor_${nanoid()}` as ActorId;

    void r.mutate.setSetting({
      key: pinyinSoundActorNameSettingKey(actorId),
      value: pinyinSoundActorNameSetting.entity.marshalValue({
        actorId,
        text: name,
      }),
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });

    return actorId;
  };

  const saveActorToDirectory = ({
    target,
    name,
    description,
    mnemonicIdentity,
    image,
    modelSheetImage,
    fallbackName,
  }: SaveActorToDirectoryInput): ActorId => {
    const trimmedName = name?.trim() ?? ``;
    const fallbackTrimmedName = fallbackName.trim();
    const resolvedName =
      trimmedName.length > 0
        ? trimmedName
        : fallbackTrimmedName.length > 0
          ? fallbackTrimmedName
          : `New actor`;
    const trimmedDescription = description?.trim() ?? ``;
    const resolvedDescription =
      trimmedDescription.length > 0 ? trimmedDescription : null;

    const actorId =
      target.kind === `new` ? createActor(resolvedName) : target.actorId;

    if (target.kind === `existing`) {
      void r.mutate.setSetting({
        key: pinyinSoundActorNameSettingKey(actorId),
        value: pinyinSoundActorNameSetting.entity.marshalValue({
          actorId,
          text: resolvedName,
        }),
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
    }

    void r.mutate.setSetting({
      key: pinyinSoundActorDescriptionSettingKey(actorId),
      value:
        resolvedDescription == null
          ? null
          : pinyinSoundActorDescriptionSetting.entity.marshalValue({
              actorId,
              text: resolvedDescription,
            }),
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });

    void r.mutate.setSetting({
      key: pinyinSoundActorMnemonicIdentitySettingKey(actorId),
      value:
        mnemonicIdentity == null
          ? null
          : pinyinSoundActorMnemonicIdentitySetting.entity.marshalValue({
              actorId,
              mnemonicIdentity,
            }),
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });

    void r.mutate.setSetting({
      key: pinyinSoundActorImageSettingKey(actorId),
      value:
        image?.imageId == null
          ? null
          : pinyinSoundActorImageSetting.entity.marshalValue({
              actorId,
              imageId: image.imageId,
              imageCrop: image.imageCrop ?? undefined,
              imageWidth: image.imageWidth ?? undefined,
              imageHeight: image.imageHeight ?? undefined,
            }),
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });

    void r.mutate.setSetting({
      key: pinyinSoundActorModelSheetImageSettingKey(actorId),
      value:
        modelSheetImage?.imageId == null
          ? null
          : pinyinSoundActorModelSheetImageSetting.entity.marshalValue({
              actorId,
              imageId: modelSheetImage.imageId,
              imageCrop: modelSheetImage.imageCrop ?? undefined,
              imageWidth: modelSheetImage.imageWidth ?? undefined,
              imageHeight: modelSheetImage.imageHeight ?? undefined,
            }),
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });

    return actorId;
  };

  const setSoundActorIds = (
    soundId: PinyinSoundId,
    actorIds: readonly ActorId[],
  ) => {
    const normalizedActorIds = [...new Set(actorIds)];
    if (normalizedActorIds.length === 0) {
      void r.mutate.setSetting({
        key: pinyinSoundActorSelectionSettingKey(soundId),
        value: null,
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
      return;
    }

    void r.mutate.setSetting({
      key: pinyinSoundActorSelectionSettingKey(soundId),
      value: pinyinSoundActorSelectionSetting.entity.marshalValue({
        soundId,
        actorIds: normalizedActorIds,
      }),
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });
  };

  return {
    actors,
    isLoading,
    createActor,
    saveActorToDirectory,
    soundActorIdsBySoundId,
    setSoundActorIds,
  };
}
