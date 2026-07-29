import { actorIdSchema, assetIdSchema, locationIdSchema } from "@/data/model";
import { requestOpenAiResponseJson } from "@/server/lib/ai";
import {
  geminiImageAspectRatioSchema,
  requestGeminiImageAsAsset,
} from "@/server/lib/gemini";
import { inngest } from "@/server/lib/inngest/index";
import { authedProcedure, router } from "@/server/lib/trpc";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { buildMeaningHintPrompt } from "@/util/prompts/meaningHint";
import {
  buildMnemonicActorSpecPrompt,
  mnemonicActorSpecSchema,
} from "@/util/prompts/mnemonicActorSpec";
import {
  buildPronunciationHintFantasyPrompt,
  buildPronunciationHintRealisticPrompt,
} from "@/util/prompts/pronunciationHint";
import {
  actorPopulateActorSpecEvent,
  locationPopulateLocationEvent,
} from "@/server/lib/inngest/client";
import { buildMeaningHintCausualBridgePrompt } from "@/util/prompts/meaningHintCausualBridge";
import { buildMeaningHintLogicalPrompt } from "@/util/prompts/meaningHintLogical";

const pronunciationHintInputSchema = z
  .object({
    leadCharacter: z
      .object({
        name: z.string(),
        bio: z.string().optional(),
      })
      .strict(),
    location: z
      .object({
        name: z.string(),
        description: z.string().optional(),
      })
      .strict(),
    cue: z
      .object({
        word: z.string(),
        meaning: z.string().optional(),
      })
      .strict(),
    count: z.number().int().max(6),
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
            strategyLabel: z.string(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

function containsPronunciationArtifacts(value: string): boolean {
  // Block direct Hanzi output in hint stories.
  if (/\p{Script=Han}/u.test(value)) {
    return true;
  }

  // Block common pinyin tone-mark vowels and often-used u-umlaut forms.
  if (/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/iu.test(value)) {
    return true;
  }

  // Block tone-number style syllables like "ling2" when they appear as tokens.
  if (/\b[a-z]{1,12}[1-5]\b/iu.test(value)) {
    return true;
  }

  // Block explicit phonetics/pronunciation language from appearing in suggestions.
  if (
    /\b(?:pinyin|hanzi|pronunciation|phonetic|ipa|initial|final|tone|transliteration)\b/iu.test(
      value,
    )
  ) {
    return true;
  }

  return false;
}

const meaningHintInputSchema = z
  .object({
    hanzi: z.string().max(2),
    meaning: z
      .object({
        hanziWord: z.string(),
        glosses: z.array(z.string()).min(1).max(12),
      })
      .strict(),
    components: z
      .array(
        z
          .object({
            hanzi: z.string().max(2).optional(),
            label: z.string().optional(),
            meaning: z.string().optional(),
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

const mnemonicActorIdentityInputSchema = z
  .object({
    identity: z.string(),
  })
  .strict();

const imagePromptTextMessageSchema = z
  .object({
    role: z.literal(`user`),
    kind: z.literal(`text`),
    content: z.string().max(4000),
  })
  .strict();

const imagePromptAssetMessageSchema = z
  .object({
    role: z.literal(`user`),
    kind: z.literal(`asset`),
    assetId: assetIdSchema,
  })
  .strict();

const imagePromptMessageSchema = z.discriminatedUnion(`kind`, [
  imagePromptTextMessageSchema,
  imagePromptAssetMessageSchema,
]);

const generateImageInputSchema = z
  .object({
    messages: z.array(imagePromptMessageSchema).min(1).max(12),
    aspectRatio: geminiImageAspectRatioSchema.optional(),
  })
  .strict();

const generateImageOutputSchema = z
  .object({
    assetId: assetIdSchema,
  })
  .strict();

const enqueueLocationSetIdentityImagesInputSchema = z
  .object({
    locationId: locationIdSchema,
  })
  .strict();

const enqueueLocationSetIdentityImagesOutputSchema = z
  .object({
    enqueued: z.literal(true),
  })
  .strict();

const enqueueActorSpecInputSchema = z
  .object({
    actorId: actorIdSchema,
    actorName: z.string(),
  })
  .strict();

const enqueueActorSpecOutputSchema = z
  .object({
    enqueued: z.literal(true),
  })
  .strict();

export const aiRouter = router({
  enqueueLocationSetIdentityImages: authedProcedure
    .input(enqueueLocationSetIdentityImagesInputSchema)
    .output(enqueueLocationSetIdentityImagesOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await inngest.send(
        locationPopulateLocationEvent.create({
          userId: ctx.session.userId,
          locationId: input.locationId,
        }),
      );

      return { enqueued: true };
    }),

  enqueueActorSpec: authedProcedure
    .input(enqueueActorSpecInputSchema)
    .output(enqueueActorSpecOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await inngest.send(
        actorPopulateActorSpecEvent.create({
          userId: ctx.session.userId,
          actorId: input.actorId,
          actorName: input.actorName,
        }),
      );

      return { enqueued: true };
    }),

  generatePronunciationHints: authedProcedure
    .input(pronunciationHintInputSchema)
    .output(pronunciationHintOutputSchema)
    .mutation(async ({ input, signal }) => {
      const { leadCharacter, location, cue, count } = input;

      const strategyPlans = [
        buildPronunciationHintFantasyPrompt,
        buildPronunciationHintRealisticPrompt,
      ];

      const baseCount = Math.floor(count / strategyPlans.length);
      const remainder = count % strategyPlans.length;

      const strategyCounts = strategyPlans.map((_, index) => {
        return baseCount + (index < remainder ? 1 : 0);
      });

      const strategyResults = await Promise.all(
        strategyPlans.map(async (buildPrompt, index) => {
          const strategyCount = strategyCounts[index] ?? 0;
          if (strategyCount <= 0) {
            return [];
          }

          const strategyLabel = buildPrompt.strategy;
          const prompt = buildPrompt({
            leadCharacter,
            location,
            cue,
            count: strategyCount,
          });

          try {
            const { data } = await requestOpenAiResponseJson(prompt, {
              signal,
            });

            return data.suggestions
              .filter((suggestion) => {
                return !containsPronunciationArtifacts(suggestion.hint);
              })
              .map((suggestion) => ({
                ...suggestion,
                strategyLabel,
              }));
          } catch (error) {
            console.error(
              `Failed to generate ${strategyLabel} pronunciation hints:`,
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

  generateMeaningHints: authedProcedure
    .input(meaningHintInputSchema)
    .output(meaningHintOutputSchema)
    .mutation(async ({ input, signal }) => {
      const { hanzi, meaning, components, count } = input;

      const strategyPlans = [
        buildMeaningHintPrompt,
        buildMeaningHintLogicalPrompt,
        buildMeaningHintCausualBridgePrompt,
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
            const { data } = await requestOpenAiResponseJson(prompt, {
              signal,
            });

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

  generateMnemonicActorSpec: authedProcedure
    .input(mnemonicActorIdentityInputSchema)
    .output(mnemonicActorSpecSchema)
    .mutation(async ({ input, signal }) => {
      const { identity } = input;

      const prompt = buildMnemonicActorSpecPrompt({
        identity: identity,
      });

      try {
        const { data } = await requestOpenAiResponseJson(prompt, {
          signal,
        });
        return data;
      } catch (error) {
        console.error(`Failed to generate mnemonic actor spec:`, error);
        throw new TRPCError({
          code: `INTERNAL_SERVER_ERROR`,
          message: `Unable to generate mnemonic actor spec`,
        });
      }
    }),

  generateHintImage: authedProcedure
    .input(generateImageInputSchema)
    .output(generateImageOutputSchema)
    .mutation(async ({ input }) => {
      const { messages, aspectRatio, ...rest } = input;
      true satisfies IsExhaustedRest<typeof rest>;

      try {
        const assetId = await requestGeminiImageAsAsset({
          model: `gemini-2.5-flash-image`,
          messages,
          aspectRatio,
        });

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
