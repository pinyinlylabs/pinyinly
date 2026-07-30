import { useDb } from "@/client/ui/hooks/useDb";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import { parseImageCrop } from "@/client/ui/imageCrop";
import type { ActorId, AssetId, PinyinSoundId } from "@/data/model";
import {
  actorDescriptionSetting,
  actorDescriptionSettingKey,
  actorImageSetting,
  actorImageSettingKey,
  actorMnemonicIdentitySetting,
  actorMnemonicIdentitySettingKey,
  actorModelSheetImageSetting,
  actorModelSheetImageSettingKey,
  actorNameSetting,
  actorNameSettingKey,
  pinyinSoundActorSelectionSetting,
  pinyinSoundActorSelectionSettingKey,
} from "@/data/userSettings";
import { nanoid } from "@/util/nanoid";
import { useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";

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
  soundActorIdBySoundId: Map<PinyinSoundId, ActorId>;
  setSoundActorId: (soundId: PinyinSoundId, actorId: ActorId | null) => void;
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
        const value = actorNameSetting.decode({ actorId }, setting.value);
        if (value == null) {
          continue;
        }

        const actor = getOrCreateActor(value.actorId);
        actor.name = value.text.trim().length > 0 ? value.text : null;
        continue;
      }

      if (setting.key.startsWith(`psad/`)) {
        const actorId = setting.key.slice(`psad/`.length) as ActorId;
        const value = actorDescriptionSetting.decode(
          { actorId },
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
        const value = actorImageSetting.decode({ actorId }, setting.value);
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

  const soundActorIdBySoundId = useMemo(() => {
    const bySoundId = new Map<PinyinSoundId, ActorId>();

    for (const setting of settings) {
      if (!setting.key.startsWith(`psas/`)) {
        continue;
      }

      const soundId = setting.key.slice(`psas/`.length) as PinyinSoundId;
      const value = pinyinSoundActorSelectionSetting.decode(
        { soundId },
        setting.value,
      );
      if (value == null) {
        continue;
      }

      if (value.actorId != null) {
        bySoundId.set(value.soundId, value.actorId);
      }
    }

    return bySoundId;
  }, [settings]);

  const createActor = (name = `New actor`): ActorId => {
    const actorId = `actor_${nanoid()}` as ActorId;

    void r.mutate.setSetting({
      key: actorNameSettingKey(actorId),
      value: actorNameSetting.entity.marshalValue({
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
        key: actorNameSettingKey(actorId),
        value: actorNameSetting.entity.marshalValue({
          actorId,
          text: resolvedName,
        }),
        now: new Date(),
        skipHistory: false,
        historyId: nanoid(),
      });
    }

    void r.mutate.setSetting({
      key: actorDescriptionSettingKey(actorId),
      value:
        resolvedDescription == null
          ? null
          : actorDescriptionSetting.entity.marshalValue({
              actorId,
              text: resolvedDescription,
            }),
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });

    void r.mutate.setSetting({
      key: actorMnemonicIdentitySettingKey(actorId),
      value:
        mnemonicIdentity == null
          ? null
          : actorMnemonicIdentitySetting.entity.marshalValue({
              actorId,
              mnemonicIdentity,
            }),
      now: new Date(),
      skipHistory: false,
      historyId: nanoid(),
    });

    void r.mutate.setSetting({
      key: actorImageSettingKey(actorId),
      value:
        image?.imageId == null
          ? null
          : actorImageSetting.entity.marshalValue({
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
      key: actorModelSheetImageSettingKey(actorId),
      value:
        modelSheetImage?.imageId == null
          ? null
          : actorModelSheetImageSetting.entity.marshalValue({
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

  const setSoundActorId = (soundId: PinyinSoundId, actorId: ActorId | null) => {
    if (actorId == null) {
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
        actorId,
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
    soundActorIdBySoundId,
    setSoundActorId,
  };
}
