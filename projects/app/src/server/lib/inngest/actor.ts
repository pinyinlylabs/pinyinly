import { eventType } from "inngest";
import z from "zod";
import { inngest } from "./client";
import { requestOpenAiResponseJson } from "@/server/lib/ai";
import { buildMnemonicActorProfilePrompt } from "@/util/prompts/buildMnemonicActorProfilePrompt";

export const generateMnemonicActorProfileLocationSpec = inngest.createFunction(
  {
    id: `actor/generateMnemonicActorProfileLocationSpec`,
    triggers: eventType(
      `actor/generateMnemonicActorProfileLocationSpec.request`,
      {
        schema: z.object({
          identity: z.string(),
        }),
      },
    ),
  },
  async ({ event }) => {
    const { identity } = event.data;

    const prompt = buildMnemonicActorProfilePrompt({
      identity,
    });

    const result = await requestOpenAiResponseJson(prompt);
    return result;
  },
);

export const functions = [generateMnemonicActorProfileLocationSpec];
