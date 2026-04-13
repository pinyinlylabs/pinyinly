import { assetIdSchema } from "@/data/model";
import { requestOpenAiJson } from "@/server/lib/ai";
import { createAssetFromBuffer } from "@/server/lib/createAsset";
import { generateImage } from "@/server/lib/gemini";
import { fetchAssetBase64 } from "@/server/lib/s3/assets";
import { authedProcedure, router } from "@/server/lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

const pronunciationHintInputSchema = z
  .object({
    leadCharacter: z
      .object({ name: z.string().min(1), bio: z.string().optional() })
      .strict(),
    location: z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
      .strict(),
    cue: z
      .object({
        word: z.string().min(1),
        meaning: z.string().optional(),
      })
      .strict(),
    count: z.number().int().min(1).max(6),
  })
  .strict();

const pronunciationHintOutputSchema = z
  .object({
    suggestions: z
      .array(
        z
          .object({
            hint: z.string(),
            explanation: z.string().nullable().optional(),
            confidence: z.number().min(0).max(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const aiReferenceImageSchema = z
  .object({
    label: z.string().min(1).max(400).optional(),
    assetId: assetIdSchema,
  })
  .strict();

const generateImageInputSchema = z
  .object({
    prompt: z.string().min(1).max(4000),
    referenceImages: z.array(aiReferenceImageSchema).max(4).optional(),
  })
  .strict();

const generateImageOutputSchema = z
  .object({
    assetId: assetIdSchema,
  })
  .strict();

export function buildPronunciationHintPrompt({
  leadCharacter,
  location,
  cue,
  count,
}: {
  leadCharacter: { name: string; bio?: string };
  location: { name: string; description?: string };
  cue: { word: string; meaning?: string };
  count: number;
}): { system: string; user: string } {
  const system = [
    `You create short pronunciation mnemonic story ideas for Mandarin learners.`,
    `Invent vivid, memorable mini-scenes using a character, a location, and a keyword.`,
    `The goal is to create a scene that is easy to picture and easy to remember.`,
    `Each scene should feel like a tiny absurd sketch or striking mental snapshot.`,
    `Always clearly include the named character and location.`,
    `Use the keyword as light inspiration for what happens, but do not turn the result into a definition.`,
    `If extra character or location details are provided, use them to make the story more specific.`,
    `Keep each hint to 1-2 sentences.`,
    `Prefer visual, unusual, and memorable situations over generic ones.`,
  ].join(`\n`);

  const optionalLines = [
    leadCharacter.bio == null
      ? null
      : `Lead character bio: ${leadCharacter.bio}`,
    location.description == null
      ? null
      : `Location description: ${location.description}`,
    cue.meaning == null ? null : `Cue meaning: ${cue.meaning}`,
  ].filter((line): line is string => line != null);

  const user = [
    `Story ingredients:`,
    `- Lead character: ${leadCharacter.name}`,
    `- Location: ${location.name}`,
    `- Cue: ${cue.word}`,
    ...(optionalLines.length > 0 ? [``, ...optionalLines] : []),
    ``,
    `Generate ${count} distinct mnemonic story ideas.`,
    `Each suggestion must explicitly include the character and location by name.`,
    `Use the keyword as light inspiration for the central action, object, or conflict.`,
    `Good suggestions are specific, visual, unusual, and easy to replay mentally.`,
    `Bad suggestions are generic, flat, or mostly just a definition.`,
  ].join(`\n`);

  return { system, user };
}

export const aiRouter = router({
  generatePronunciationHints: authedProcedure
    .input(pronunciationHintInputSchema)
    .output(pronunciationHintOutputSchema)
    .mutation(async (opts) => {
      const { leadCharacter, location, cue, count } = opts.input;

      const { system, user } = buildPronunciationHintPrompt({
        leadCharacter,
        location,
        cue,
        count,
      });

      try {
        const data = await requestOpenAiJson({
          system,
          user,
          temperature: 0.7,
          maxTokens: 700,
          schema: pronunciationHintOutputSchema,
        });

        return data;
      } catch (error) {
        console.error(`Failed to generate pronunciation hints:`, error);
        throw new TRPCError({
          code: `INTERNAL_SERVER_ERROR`,
          message: `Unable to generate hints`,
        });
      }
    }),

  generateHintImage: authedProcedure
    .input(generateImageInputSchema)
    .output(generateImageOutputSchema)
    .mutation(async (opts) => {
      const { prompt, referenceImages } = opts.input;
      const { userId } = opts.ctx.session;

      try {
        const resolvedReferenceImages =
          referenceImages == null
            ? undefined
            : await Promise.all(
                referenceImages.map(async (referenceImage) => {
                  const imageData = await fetchAssetBase64(
                    referenceImage.assetId,
                  );
                  return {
                    label: referenceImage.label,
                    data: imageData.data,
                    mimeType: imageData.mimeType,
                  };
                }),
              );

        const { buffer, mimeType } = await generateImage({
          prompt,
          referenceImages: resolvedReferenceImages,
        });

        const imageArrayBuffer = Uint8Array.from(buffer).buffer;

        const assetId = await createAssetFromBuffer(
          userId,
          imageArrayBuffer,
          mimeType,
        );

        return { assetId };
      } catch (error) {
        console.error(`Failed to generate hint image:`, error);
        throw new TRPCError({
          code: `INTERNAL_SERVER_ERROR`,
          message: `Unable to generate image`,
        });
      }
    }),
});
