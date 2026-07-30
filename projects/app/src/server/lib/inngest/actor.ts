import { and, eq } from "drizzle-orm";
import {
  actorMnemonicIdentitySetting,
  actorModelSheetImageSetting,
} from "@/data/userSettings";
import { withDrizzle } from "@/server/lib/db";
import * as s from "@/server/pgSchema";
import { setUserSetting } from "@/server/lib/userSettings";
import {
  buildActorSpecPrompt,
  actorSpecSchema,
} from "@/util/prompts/actorSpec";
import { nanoid } from "@/util/nanoid";
import { actorPopulateActorSpecEvent, inngest } from "./client";
import { step } from "inngest";
import { requestOpenAiResponseJson } from "@/server/lib/ai";
import { geminiRequestImageAsAsset } from "./gemini";
import { buildActorModelSheetImagePrompt } from "@/util/prompts/actorModelSheetImage";
import type { ActorSpec } from "@/data/model";

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
            actorMnemonicIdentitySetting.entity.marshalKey({ actorId }),
          ),
        ),
      });

      if (setting == null) {
        return null;
      }

      const decoded = actorMnemonicIdentitySetting.decode(
        { actorId },
        setting.value,
      );

      if (decoded == null) {
        return null;
      }

      return actorSpecSchema.parse(decoded.mnemonicIdentity);
    });

    if (actorSpec == null) {
      const prompt = buildActorSpecPrompt({
        identity: actorName,
      });

      const result = await requestOpenAiResponseJson(prompt);
      actorSpec = actorSpecSchema.parse(result.data);

      await withDrizzle(async (db) => {
        await setUserSetting(db, userId, {
          key: actorMnemonicIdentitySetting.entity.marshalKey({
            actorId,
          }),
          value: actorMnemonicIdentitySetting.entity.marshalValue({
            actorId,
            mnemonicIdentity: actorSpec,
          }),
          now: new Date(),
          skipHistory: false,
          historyId: nanoid(),
        });
      });
    }

    const currentModelSheetImage = await step.run(
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

    if (currentModelSheetImage == null) {
      const generatedImageAssetId = await step.invoke(
        `generate model sheet image`,
        {
          function: geminiRequestImageAsAsset,
          data: {
            prompt: buildActorModelSheetImagePrompt({ actorSpec }),
          },
        },
      );

      await step.run(`write model sheet image`, async () =>
        withDrizzle(async (db) => {
          await setUserSetting(db, userId, {
            key: actorModelSheetImageSetting.entity.marshalKey({ actorId }),
            value: actorModelSheetImageSetting.entity.marshalValue({
              actorId: actorId,
              imageId: generatedImageAssetId,
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
