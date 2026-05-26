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
import {
  buildLeadCharacterDescriptionPrompt,
  buildMeaningHintLogicalPrompt,
  buildMeaningHintPrompt,
  buildPronunciationHintPrompt,
  buildSubLocationDescriptionPrompt,
} from "@/util/prompts";

const pronunciationHintInputSchema = z
  .object({
    leadCharacter: z
      .object({
        name: z.string().min(1),
        bio: z.string().optional(),
        article: z.string().optional(),
      })
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
    creativeDirection: z.string().max(500).optional(),
    count: z.number().int().min(1).max(6),
  })
  .strict();

const meaningHintInputSchema = z
  .object({
    hanzi: z.string().min(1).max(2),
    meaning: z
      .object({
        hanziWord: z.string().min(1),
        glosses: z.array(z.string().min(1)).min(1).max(12),
      })
      .strict(),
    components: z
      .array(
        z
          .object({
            hanzi: z.string().min(1).max(2).optional(),
            label: z.string().min(1).optional(),
            meaning: z.string().min(1).optional(),
          })
          .strict(),
      )
      .max(12)
      .optional(),
    count: z.number().int().min(1).max(6),
  })
  .strict();

const meaningHintOutputSchema = z
  .object({
    suggestions: z
      .array(
        z
          .object({
            hint: z.string(),
            explanation: z.string().nullable().optional(),
            strategyLabel: z.string(),
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

export const aiRouter = router({
  generatePronunciationHints: authedProcedure
    .input(pronunciationHintInputSchema)
    .output(buildPronunciationHintPrompt.schema)
    .mutation(async (opts) => {
      const { leadCharacter, location, cue, creativeDirection, count } =
        opts.input;

      const prompt = buildPronunciationHintPrompt({
        leadCharacter,
        location,
        cue,
        creativeDirection,
        count,
      });

      try {
        const data = await requestOpenAiJson(prompt);
        return data;
      } catch (error) {
        console.error(`Failed to generate pronunciation hints:`, error);
        throw new TRPCError({
          code: `INTERNAL_SERVER_ERROR`,
          message: `Unable to generate hints`,
        });
      }
    }),

  generateMeaningHints: authedProcedure
    .input(meaningHintInputSchema)
    .output(meaningHintOutputSchema)
    .mutation(async (opts) => {
      const { hanzi, meaning, components, count } = opts.input;

      const strategyPlans = [
        buildMeaningHintPrompt,
        buildMeaningHintLogicalPrompt,
      ];

      const strategyResults = await Promise.all(
        strategyPlans.map(async (buildPrompt) => {
          const strategyLabel = buildPrompt.strategy;
          const prompt = buildPrompt({
            hanzi,
            meaning,
            components,
            count,
          });

          try {
            const data = await requestOpenAiJson(prompt);

            return data.suggestions.map((suggestion) => ({
              ...suggestion,
              strategyLabel,
            }));
          } catch (error) {
            console.error(
              `Failed to generate ${strategyLabel} meaning hints:`,
              error,
            );
            return [];
          }
        }),
      );

      const suggestions = strategyResults.flat();
      if (suggestions.length === 0) {
        throw new TRPCError({
          code: `INTERNAL_SERVER_ERROR`,
          message: `Unable to generate hints`,
        });
      }

      return { suggestions };
    }),

  generateSubLocationDescriptions: authedProcedure
    .input(subLocationDescriptionInputSchema)
    .output(buildSubLocationDescriptionPrompt.schema)
    .mutation(async (opts) => {
      const { label, location, locationNotes, sublocation, viewpoint, count } =
        opts.input;

      const prompt = buildSubLocationDescriptionPrompt({
        label,
        location,
        locationNotes,
        sublocation,
        viewpoint,
        count,
      });

      try {
        const data = await requestOpenAiJson(prompt);
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
    .output(buildLeadCharacterDescriptionPrompt.schema)
    .mutation(async (opts) => {
      const { name, sound, existingDescription, count } = opts.input;

      const prompt = buildLeadCharacterDescriptionPrompt({
        name,
        sound,
        existingDescription,
        count,
      });

      try {
        const data = await requestOpenAiJson(prompt);
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
