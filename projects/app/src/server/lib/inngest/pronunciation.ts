import { withDrizzle } from "@/server/lib/db";
import { inngest, pronunciationGenerateHintEvent } from "./client";
import { getActorSpec, getLocationSpec } from "@/server/lib/query";
import { buildPronunciationHintRecurringPrompt } from "@/util/prompts/pronunciationHintRecurring";
import { invariant } from "@pinyinly/lib/invariant";
import { requestOpenAiResponseJson } from "@/server/lib/ai";

export const generatePronunciationRecurringHint = inngest.createFunction(
  {
    id: `pronunciation/generateRecurringHint`,
    triggers: [pronunciationGenerateHintEvent],
  },
  async ({ event }) => {
    const { userId, actorId, cue, locationId, setKey } = event.data;

    const actorSpec = await withDrizzle(async (db) => {
      return getActorSpec(db, userId, actorId);
    });

    invariant(
      actorSpec != null,
      `Actor spec not found for actorId: ${actorId}`,
    );

    const locationSpec = await withDrizzle(async (db) => {
      return getLocationSpec(db, userId, locationId);
    });

    invariant(
      locationSpec != null,
      `Location spec not found for locationId: ${locationId}`,
    );

    const prompt = buildPronunciationHintRecurringPrompt({
      actor: actorSpec,
      cue,
      location: locationSpec,
      set: setKey,
    });

    const response = await requestOpenAiResponseJson(prompt);

    return response;
  },
);

export const functions = [generatePronunciationRecurringHint] as const;
