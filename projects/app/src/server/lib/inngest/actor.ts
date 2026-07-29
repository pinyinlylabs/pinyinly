import { and, eq } from "drizzle-orm";
import type { ActorId } from "@/data/model";
import {
  pinyinSoundActorMnemonicIdentitySetting,
  pinyinSoundActorMnemonicIdentitySettingKey,
} from "@/data/userSettings";
import { requestOpenAiResponseJson } from "@/server/lib/ai";
import { withDrizzle } from "@/server/lib/db";
import * as s from "@/server/pgSchema";
import { setUserSetting } from "@/server/lib/userSettings";
import {
  buildMnemonicActorSpecPrompt,
  mnemonicActorSpecSchema,
} from "@/util/prompts/mnemonicActorSpec";
import type { MnemonicActorSpecType } from "@/util/prompts/mnemonicActorSpec";
import { nanoid } from "@/util/nanoid";
import { actorPopulateActorSpecEvent, inngest } from "./client";

type PopulateActorSpecEventData = {
  userId: string;
  actorId: ActorId;
  actorName: string;
};

export const populateActor: ReturnType<typeof inngest.createFunction> =
  inngest.createFunction(
    {
      id: `actor/populateActor`,
      singleton: {
        key: `event.data.userId + "-" + event.data.actorId`,
        mode: `skip`,
      },
      triggers: actorPopulateActorSpecEvent,
    },
    async ({
      event,
    }: {
      event: { data: PopulateActorSpecEventData };
    }): Promise<MnemonicActorSpecType> => {
      const { userId, actorId, actorName } = event.data;

      const existingActorSpec = await withDrizzle(async (db) => {
        const setting = await db.query.userSetting.findFirst({
          where: and(
            eq(s.userSetting.userId, userId),
            eq(
              s.userSetting.key,
              pinyinSoundActorMnemonicIdentitySettingKey(actorId),
            ),
          ),
        });

        if (setting == null) {
          return null;
        }

        const decoded = pinyinSoundActorMnemonicIdentitySetting.decode(
          { actorId },
          setting.value,
        );

        return decoded?.mnemonicIdentity ?? null;
      });

      if (existingActorSpec != null) {
        return mnemonicActorSpecSchema.parse(existingActorSpec);
      }

      const prompt = buildMnemonicActorSpecPrompt({
        identity: actorName,
      });

      const result = await requestOpenAiResponseJson(prompt);
      const actorSpec = mnemonicActorSpecSchema.parse(result.data);

      await withDrizzle(async (db) => {
        await setUserSetting(db, userId, {
          key: pinyinSoundActorMnemonicIdentitySetting.entity.marshalKey({
            actorId,
          }),
          value: pinyinSoundActorMnemonicIdentitySetting.entity.marshalValue({
            actorId,
            mnemonicIdentity: actorSpec,
          }),
          now: new Date(),
          skipHistory: false,
          historyId: nanoid(),
        });
      });

      return actorSpec;
    },
  );

export const functions: ReadonlyArray<typeof populateActor> = [populateActor];
