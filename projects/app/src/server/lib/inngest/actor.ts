import { and, eq } from "drizzle-orm";
import {
  actorSpecJsonSetting,
  actorModelSheetImageSetting,
  actorIdentityImageSetting,
} from "@/data/userSettings";
import { withDrizzle } from "@/server/lib/db";
import * as s from "@/server/pgSchema";
import { setUserSetting } from "@/server/lib/userSettings";
import { buildActorSpecPrompt } from "@/util/prompts/actorSpec";
import { nanoid } from "@/util/nanoid";
import { actorPopulateActorSpecEvent, inngest } from "./client";
import { step } from "inngest";
import { requestOpenAiResponseJson } from "@/server/lib/ai";
import { geminiRequestImageAsAsset } from "./gemini";
import { buildActorModelSheetImagePrompt } from "@/util/prompts/actorModelSheetImage";
import { actorSpecSchema } from "@/data/model";
import type { ActorSpec } from "@/data/model";
import { nonNullable } from "@pinyinly/lib/invariant";
import { buildActorIdentityImagePrompt } from "@/util/prompts/actorIdentityImage";

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
      const setting = await db.query.userSetting.findFirst({
        where: and(
          eq(s.userSetting.userId, userId),
          eq(
            s.userSetting.key,
            actorSpecJsonSetting.entity.marshalKey({ actorId }),
          ),
        ),
      });

      if (setting == null) {
        return null;
      }

      const decoded = actorSpecJsonSetting.decode({ actorId }, setting.value);

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
          now: new Date(),
          skipHistory: false,
          historyId: nanoid(),
        });
      });
    }

    let modelSheetAssetId = await step.run(
      `read current model sheet`,
      async () =>
        withDrizzle(async (db) => {
          const setting = await db.query.userSetting.findFirst({
            where: and(
              eq(s.userSetting.userId, userId),
              eq(
                s.userSetting.key,
                actorModelSheetImageSetting.entity.marshalKey({ actorId }),
              ),
            ),
          });

          if (setting == null) {
            return null;
          }

          const decoded = actorModelSheetImageSetting.decode(
            { actorId },
            setting.value,
          );

          return decoded?.imageId ?? null;
        }),
    );

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
            now: new Date(),
            skipHistory: false,
            historyId: nanoid(),
          });
        }),
      );
    }

    let identityImageAssetId = await step.run(
      `read current identity image`,
      async () =>
        withDrizzle(async (db) => {
          const setting = await db.query.userSetting.findFirst({
            where: and(
              eq(s.userSetting.userId, userId),
              eq(
                s.userSetting.key,
                actorIdentityImageSetting.entity.marshalKey({ actorId }),
              ),
            ),
          });

          if (setting == null) {
            return null;
          }

          const decoded = actorIdentityImageSetting.decode(
            { actorId },
            setting.value,
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
            now: new Date(),
            skipHistory: false,
            historyId: nanoid(),
          });
        }),
      );
    }

    return actorSpec;
  },
);

export const functions: ReadonlyArray<typeof populateActor> = [populateActor];
