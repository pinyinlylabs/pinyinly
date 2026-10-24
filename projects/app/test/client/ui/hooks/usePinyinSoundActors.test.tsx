// @vitest-environment happy-dom

import { DbProvider } from "#client/ui/DbProvider.tsx";
import { useNewQueryClient } from "#client/ui/hooks/useNewQueryClient.ts";
import { usePinyinSoundActors } from "#client/ui/hooks/usePinyinSoundActors.ts";
import { RizzleProvider } from "#client/ui/RizzleProvider.tsx";
import type { ActorId, AssetId, PinyinSoundId } from "#data/model.ts";
import {
  actorDescriptionTextSetting,
  actorIdentityImageSetting,
  actorModelSheetImageSetting,
  actorNameTextSetting,
  actorSpecJsonSetting,
  pinyinSoundActorSetting,
} from "#data/userSettings.ts";
import { testWithDb } from "#test/util/rizzleHelpers.ts";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { expect } from "vitest";

const test = testWithDb;

test(`deletes actor settings and unassigns only its sounds`, async ({
  db,
  rizzle,
}) => {
  const targetActorId = `actor_target` as ActorId;
  const otherActorId = `actor_other` as ActorId;
  const targetSoundId = `ma` as PinyinSoundId;
  const otherSoundId = `ba` as PinyinSoundId;

  const targetSettingKeys = [
    actorNameTextSetting.entity.marshalKey({ actorId: targetActorId }),
    actorDescriptionTextSetting.entity.marshalKey({ actorId: targetActorId }),
    actorSpecJsonSetting.entity.marshalKey({ actorId: targetActorId }),
    actorIdentityImageSetting.entity.marshalKey({ actorId: targetActorId }),
    actorModelSheetImageSetting.entity.marshalKey({ actorId: targetActorId }),
  ];
  const setSetting = async (key: string, value: Record<string, unknown>) => {
    await rizzle.mutate.setSetting({
      key,
      value,
      now: new Date(),
      skipHistory: true,
    });
  };

  await setSetting(
    targetSettingKeys[0]!,
    actorNameTextSetting.entity.marshalValue({
      actorId: targetActorId,
      text: `Target`,
    }),
  );
  await setSetting(
    targetSettingKeys[1]!,
    actorDescriptionTextSetting.entity.marshalValue({
      actorId: targetActorId,
      text: `Description`,
    }),
  );
  await setSetting(
    targetSettingKeys[2]!,
    actorSpecJsonSetting.entity.marshalValue({
      actorId: targetActorId,
      value: { traits: [`curious`] },
    }),
  );
  await setSetting(
    targetSettingKeys[3]!,
    actorIdentityImageSetting.entity.marshalValue({
      actorId: targetActorId,
      imageId: `asset_target` as AssetId,
    }),
  );
  await setSetting(
    targetSettingKeys[4]!,
    actorModelSheetImageSetting.entity.marshalValue({
      actorId: targetActorId,
      imageId: `asset_model` as AssetId,
    }),
  );
  await setSetting(
    actorNameTextSetting.entity.marshalKey({ actorId: otherActorId }),
    actorNameTextSetting.entity.marshalValue({
      actorId: otherActorId,
      text: `Other`,
    }),
  );
  await setSetting(
    pinyinSoundActorSetting.entity.marshalKey({ soundId: targetSoundId }),
    pinyinSoundActorSetting.entity.marshalValue({
      soundId: targetSoundId,
      actorId: targetActorId,
    }),
  );
  await setSetting(
    pinyinSoundActorSetting.entity.marshalKey({ soundId: otherSoundId }),
    pinyinSoundActorSetting.entity.marshalValue({
      soundId: otherSoundId,
      actorId: otherActorId,
    }),
  );
  await db.settingCollection.preload();

  function TestWrapper({ children }: PropsWithChildren) {
    const queryClient = useNewQueryClient();
    return (
      <QueryClientProvider client={queryClient}>
        <RizzleProvider.Context.Provider value={rizzle}>
          <DbProvider.Context.Provider value={db}>
            {children}
          </DbProvider.Context.Provider>
        </RizzleProvider.Context.Provider>
      </QueryClientProvider>
    );
  }

  const { result, unmount } = renderHook(() => usePinyinSoundActors(), {
    wrapper: TestWrapper,
  });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
    expect(result.current.actors.map(({ actorId }) => actorId)).toEqual([
      otherActorId,
      targetActorId,
    ]);
  });

  await act(async () => {
    await result.current.deleteActor(targetActorId);
  });

  await waitFor(() => {
    expect(result.current.actors.map(({ actorId }) => actorId)).toEqual([
      otherActorId,
    ]);
    expect(result.current.soundActorIdBySoundId.get(targetSoundId)).toBe(
      undefined,
    );
    expect(result.current.soundActorIdBySoundId.get(otherSoundId)).toBe(
      otherActorId,
    );
    for (const key of targetSettingKeys) {
      expect(db.settingCollection.get(key)?.value).toBeNull();
    }
    expect(
      db.settingCollection.get(
        pinyinSoundActorSetting.entity.marshalKey({ soundId: targetSoundId }),
      )?.value,
    ).toBeNull();
    expect(
      db.settingCollection.get(
        pinyinSoundActorSetting.entity.marshalKey({ soundId: otherSoundId }),
      )?.value,
    ).not.toBeNull();
  });

  unmount();
});
