import { invoke } from "inngest";
import z from "zod";
import { inngest } from "./client";
import {
  imagePromptSchema,
  requestGeminiImageAsAsset,
} from "@/server/lib/gemini";

export const geminiRequestImageAsAsset = inngest.createFunction(
  {
    id: `gemini/requestImageAsAsset`,
    triggers: [
      invoke(
        z.object({
          prompt: imagePromptSchema,
        }),
      ),
    ],
  },
  async ({ event, step }) => {
    const { prompt } = event.data;

    const result = await step.run(`call gemini`, async () => {
      return requestGeminiImageAsAsset(prompt);
    });

    return result;
  },
);

export const functions = [geminiRequestImageAsAsset];
