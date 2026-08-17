import {
  actorIdSchema,
  assetIdSchema,
  hanziWordSchema,
  locationIdSchema,
  locationSetKeySchema,
} from "@/data/model";
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
  actorPopulateActorSpecEvent,
  actorPopulateModelSheetImageEvent,
  locationPopulateLocationEvent,
  locationPopulateLocationSetEvent,
  populatePronunciationMnemonicSpecEvent,
} from "@/server/lib/inngest/client";
import { buildMeaningHintCausualBridgePrompt } from "@/util/prompts/meaningHintCausualBridge";
import { buildMeaningHintLogicalPrompt } from "@/util/prompts/meaningHintLogical";
import { pronunciationMnemonicRecurringPromptAssociationStrategyKindSchema } from "@/util/prompts/pronunciationMnemonicRecurring";

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

const enqueueLocationSetInputSchema = z
  .object({
    locationId: locationIdSchema,
    setKey: locationSetKeySchema,
  })
  .strict();

const enqueueLocationSetOutputSchema = z
  .object({
    enqueued: z.literal(true),
  })
  .strict();

const enqueuePronunciationRecurringHintInputSchema = z
  .object({
    hanziWord: hanziWordSchema,
    mnemonicId: z.string(),
    associationStrategy:
      pronunciationMnemonicRecurringPromptAssociationStrategyKindSchema.optional(),
  })
  .strict();

const enqueuePronunciationRecurringHintOutputSchema = z
  .object({
    enqueued: z.literal(true),
  })
  .strict();

export const aiRouter = router({
  enqueueLocationSet: authedProcedure
    .input(enqueueLocationSetInputSchema)
    .output(enqueueLocationSetOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await inngest.send(
        locationPopulateLocationSetEvent.create({
          userId: ctx.session.userId,
          locationId: input.locationId,
          setKey: input.setKey,
        }),
      );

      return { enqueued: true };
    }),

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
    .input(z.object({ actorId: actorIdSchema, actorName: z.string() }).strict())
    .output(z.object({ enqueued: z.literal(true) }).strict())
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

  enqueueActorModelSheet: authedProcedure
    .input(z.object({ actorId: actorIdSchema }).strict())
    .output(z.object({ enqueued: z.boolean() }).strict())
    .mutation(async ({ ctx, input }) => {
      await inngest.send(
        actorPopulateModelSheetImageEvent.create({
          userId: ctx.session.userId,
          actorId: input.actorId,
        }),
      );

      return { enqueued: true };
    }),

  enqueuePronunciationRecurringHint: authedProcedure
    .input(enqueuePronunciationRecurringHintInputSchema)
    .output(enqueuePronunciationRecurringHintOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await inngest.send(
        populatePronunciationMnemonicSpecEvent.create({
          userId: ctx.session.userId,
          hanziWord: input.hanziWord,
          mnemonicId: input.mnemonicId,
          associationStrategy: input.associationStrategy,
        }),
      );

      return { enqueued: true };
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
