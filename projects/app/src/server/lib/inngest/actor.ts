import {
  actorSpecJsonSetting,
  actorModelSheetImageSetting,
  actorIdentityImageSetting,
} from "@/data/userSettings";
import { withDrizzle } from "@/server/lib/db";
import { buildActorSpecPrompt } from "@/util/prompts/actorSpec";
import {
  actorPopulateActorSpecEvent,
  actorPopulateModelSheetImageEvent,
  inngest,
} from "./client";
import { NonRetriableError, step } from "inngest";
import { requestOpenAiResponseJson } from "@/server/lib/ai";
import { geminiRequestImageAsAsset } from "./gemini";
import { buildActorModelSheetImagePrompt } from "@/util/prompts/actorModelSheetImage";
import { actorSpecSchema } from "@/data/model";
import type { ActorSpec } from "@/data/model";
import { nonNullable } from "@pinyinly/lib/invariant";
import { buildActorIdentityImagePrompt } from "@/util/prompts/actorIdentityImage";
import {
  getUserSetting,
  setUserSetting,
  getActorModelSheetImage,
  getActorSpec,
} from "@/server/lib/query";

export const populateActor = inngest.createFunction(
  {
    id: `actor/populateActor`,
    singleton: {
      key: `event.data.userId + "-" + event.data.actorId`,
      mode: `skip`,
    },
    triggers: actorPopulateActorSpecEvent,
  },
  async ({ event }): Promise<ActorSpec> => {
    const { userId, actorId, actorName } = event.data;

    let actorSpec = await withDrizzle(async (db): Promise<ActorSpec | null> => {
      const decoded = await getUserSetting(db, userId, actorSpecJsonSetting, {
        actorId,
      });

      if (decoded == null) {
        return null;
      }

      return actorSpecSchema.parse(decoded.value);
    });

    if (actorSpec == null) {
      const prompt = buildActorSpecPrompt({
        identity: actorName,
      });

      const result = await requestOpenAiResponseJson(prompt);
      actorSpec = actorSpecSchema.parse(result.data);

      await withDrizzle(async (db) => {
        await setUserSetting(db, userId, {
          key: actorSpecJsonSetting.entity.marshalKey({
            actorId,
          }),
          value: actorSpecJsonSetting.entity.marshalValue({
            actorId,
            value: actorSpec,
          }),
        });
      });
    }

    const { modelSheetAssetId } = await step.invoke(
      `populate location set spec`,
      {
        function: populateActorModelSheetImage,
        data: {
          userId,
          actorId,
        },
      },
    );

    let identityImageAssetId = await step.run(
      `read current identity image`,
      async () =>
        withDrizzle(async (db) => {
          const decoded = await getUserSetting(
            db,
            userId,
            actorIdentityImageSetting,
            { actorId },
          );
          return decoded?.imageId ?? null;
        }),
    );

    if (identityImageAssetId == null) {
      identityImageAssetId = await step.invoke(`generate identity image`, {
        function: geminiRequestImageAsAsset,
        data: {
          prompt: buildActorIdentityImagePrompt({
            modelSheet: modelSheetAssetId,
          }),
        },
      });

      await step.run(`write identity image`, async () =>
        withDrizzle(async (db) => {
          await setUserSetting(db, userId, {
            key: actorIdentityImageSetting.entity.marshalKey({ actorId }),
            value: actorIdentityImageSetting.entity.marshalValue({
              actorId: actorId,
              imageId: nonNullable(identityImageAssetId),
            }),
          });
        }),
      );
    }

    return actorSpec;
  },
);

export const populateActorModelSheetImage = inngest.createFunction(
  {
    id: `actor/populate-model-sheet-image`,
    singleton: {
      key: `event.data.userId + "-" + event.data.actorId`,
      mode: `skip`,
    },
    triggers: actorPopulateModelSheetImageEvent,
  },
  async ({ event, step }) => {
    const { userId, actorId } = event.data;

    let [actorSpec, modelSheetAssetId] = await step.run(
      `read current model sheet`,
      async () =>
        withDrizzle(async (db) => {
          return Promise.all([
            getActorSpec(db, userId, actorId),
            getActorModelSheetImage(db, userId, actorId),
          ]);
        }),
    );

    if (actorSpec == null) {
      throw new NonRetriableError(
        `Missing actor spec for model sheet image generation`,
      );
    }

    if (modelSheetAssetId == null) {
      modelSheetAssetId = await step.invoke(`generate model sheet image`, {
        function: geminiRequestImageAsAsset,
        data: {
          prompt: buildActorModelSheetImagePrompt({ actorSpec }),
        },
      });

      await step.run(`write model sheet image`, async () =>
        withDrizzle(async (db) => {
          await setUserSetting(db, userId, {
            key: actorModelSheetImageSetting.entity.marshalKey({ actorId }),
            value: actorModelSheetImageSetting.entity.marshalValue({
              actorId: actorId,
              imageId: nonNullable(modelSheetAssetId),
            }),
          });
        }),
      );
    }

    return {
      modelSheetAssetId: modelSheetAssetId,
    };
  },
);

export const functions = [populateActor, populateActorModelSheetImage];
