import { assetIdSchema } from "@/data/model";
import { requestOpenAiJson } from "@/server/lib/ai";
import { createAssetFromBuffer } from "@/server/lib/createAsset";
import { generateImage } from "@/server/lib/gemini";
import { fetchAssetBase64 } from "@/server/lib/s3/assets";
import { authedProcedure, router } from "@/server/lib/trpc";
import { geminiImageAspectRatios } from "@/util/geminiImageAspectRatio";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
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

const subLocationDescriptionInputSchema = z
  .object({
    label: z.string().min(1),
    location: z.string().min(1),
    locationNotes: z.string().optional(),
    sublocation: z.string().min(1),
    viewpoint: z.string().optional(),
    count: z.number().int().min(1).max(6),
  })
  .strict();

const subLocationDescriptionOutputSchema = z
  .object({
    suggestions: z
      .array(
        z
          .object({
            description: z.string(),
            explanation: z.string().nullable().optional(),
            confidence: z.number().min(0).max(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const leadCharacterDescriptionOutputSchema = z
  .object({
    suggestions: z
      .array(
        z
          .object({
            description: z.string(),
            explanation: z.string().nullable().optional(),
            confidence: z.number().min(0).max(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const leadCharacterDescriptionInputSchema = z
  .object({
    name: z.string().min(1),
    sound: z.string().min(1),
    existingDescription: z.string().optional(),
    count: z.number().int().min(1).max(6),
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
    aspectRatio: z.enum(geminiImageAspectRatios).optional(),
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

export function buildSubLocationDescriptionPrompt({
  label,
  location,
  locationNotes,
  sublocation,
  viewpoint,
  count,
}: {
  label: string;
  location: string;
  locationNotes?: string;
  sublocation: string;
  viewpoint?: string;
  count: number;
}): { system: string; user: string } {
  const system = [
    `You create reusable location descriptions for Mandarin pronunciation mnemonic scenes.`,
    `Your goal is to define a stable mental image of a place that can be reused across many stories.`,
    `You will be given a primary location and a sublocation within or around it. Combine them into one clear, vivid, always-true mental setting.`,
    `Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.`,
    `Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.`,
    `Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.`,
  ].join(`\n`);

  const optionalLines = [
    locationNotes == null ? null : `Location notes: ${locationNotes}`,
    viewpoint == null ? null : `Viewpoint: ${viewpoint}`,
  ].filter((line): line is string => line != null);

  const user = [
    `Location: ${location}`,
    `Sublocation: ${sublocation}`,
    ...(optionalLines.length > 0 ? [``] : []),
    ...optionalLines,
    ``,
    `Generate ${count} distinct reusable location descriptions for this exact combined place: ${label}`,
    ``,
    `Each suggestion must:`,
    `- Clearly reflect both the Location and the Sublocation`,
    `- If a Viewpoint is provided, ensure the description matches that perspective`,
    `- Describe stable, always-true aspects of the place`,
    `- Return only the descriptive fragment itself, don't prefix with the place label`,
    `- Avoid time of day, weather, or temporary events`,
    `- Avoid actions or specific story moments`,
    `- Be easy to visualize and reuse in different mnemonic scenes`,
    ``,
    `Good suggestions feel like a reusable mental stage.`,
    `Bad suggestions feel like a one-time scene.`,
  ].join(`\n`);

  return { system, user };
}

export function buildLeadCharacterDescriptionPrompt({
  name,
  sound,
  existingDescription,
  count,
}: {
  name: string;
  sound: string;
  existingDescription?: string;
  count: number;
}): { system: string; user: string } {
  const system = [
    `You create vivid, distinct character personalities for Mandarin pronunciation mnemonic palaces.`,
    `Your goal is to define a memorable character with a unique trait, backstory, or personality that makes them unforgettable.`,
    `Each character bio should feel distinct, specific, and reusable across many mnemonic stories.`,
    `Focus on personality quirks, memorable traits, backstory hints, or distinctive mannerisms.`,
    `Make characters feel like real people with depth—avoid generic or flat descriptions.`,
    `Keep each bio to 1-2 sentences. Make them specific, visual, and easy to remember.`,
  ].join(`\n`);

  const optionalLines = [
    existingDescription == null
      ? null
      : `Existing description: ${existingDescription}`,
  ].filter((line): line is string => line != null);

  const user = [
    `Character: ${name}`,
    `Associated pinyin sound: ${sound}`,
    ...(optionalLines.length > 0 ? [``] : []),
    ...optionalLines,
    ``,
    `Generate ${count} distinct character personality descriptions for this character.`,
    ``,
    `Each suggestion must:`,
    `- Describe a unique, memorable personality or trait`,
    `- Feel like a real person with specific quirks or depth`,
    `- Be distinct from other suggestions`,
    `- Return only the descriptive fragment itself, don't prefix with the character name`,
    `- Be easy to visualize and reuse in different mnemonic stories`,
    `- NOT be a definition or encyclopedia-style description`,
    ``,
    `Good suggestions feel like a vivid character profile.`,
    `Bad suggestions feel generic, flat, or encyclopedia-like.`,
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

  generateSubLocationDescriptions: authedProcedure
    .input(subLocationDescriptionInputSchema)
    .output(subLocationDescriptionOutputSchema)
    .mutation(async (opts) => {
      const { label, location, locationNotes, sublocation, viewpoint, count } =
        opts.input;

      const { system, user } = buildSubLocationDescriptionPrompt({
        label,
        location,
        locationNotes,
        sublocation,
        viewpoint,
        count,
      });

      try {
        const data = await requestOpenAiJson({
          system,
          user,
          schema: subLocationDescriptionOutputSchema,
        });

        return data;
      } catch (error) {
        console.error(`Failed to generate sublocation descriptions:`, error);
        throw new TRPCError({
          code: `INTERNAL_SERVER_ERROR`,
          message: `Unable to generate descriptions`,
        });
      }
    }),

  generateLeadCharacterDescriptions: authedProcedure
    .input(leadCharacterDescriptionInputSchema)
    .output(leadCharacterDescriptionOutputSchema)
    .mutation(async (opts) => {
      const { name, sound, existingDescription, count } = opts.input;

      const { system, user } = buildLeadCharacterDescriptionPrompt({
        name,
        sound,
        existingDescription,
        count,
      });

      try {
        const data = await requestOpenAiJson({
          system,
          user,
          schema: leadCharacterDescriptionOutputSchema,
        });

        return data;
      } catch (error) {
        console.error(`Failed to generate lead character descriptions:`, error);
        throw new TRPCError({
          code: `INTERNAL_SERVER_ERROR`,
          message: `Unable to generate descriptions`,
        });
      }
    }),

  generateHintImage: authedProcedure
    .input(generateImageInputSchema)
    .output(generateImageOutputSchema)
    .mutation(async (opts) => {
      const { prompt, referenceImages, aspectRatio, ...rest } = opts.input;
      true satisfies IsExhaustedRest<typeof rest>;

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
          aspectRatio,
        });

        const imageArrayBuffer = Uint8Array.from(buffer).buffer;

        const assetId = await createAssetFromBuffer(imageArrayBuffer, mimeType);

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
