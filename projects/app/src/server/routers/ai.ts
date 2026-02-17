import { requestOpenAiJson } from "@/server/lib/ai";
import { authedProcedure, router } from "@/server/lib/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

type SoundDetails = {
  soundId: string;
  name?: string | null;
  description?: string | null;
};

const soundDetailsSchema = z
  .object({
    soundId: z.string(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  })
  .strict();

const sceneDetailsSchema = z
  .object({
    description: z.string().nullable().optional(),
  })
  .strict();

const pronunciationHintInputSchema = z
  .object({
    hanzi: z.string(),
    pinyin: z.string(),
    gloss: z.string(),
    initial: soundDetailsSchema.nullable(),
    final: soundDetailsSchema.nullable(),
    tone: soundDetailsSchema.nullable(),
    toneNumber: z.number().int().min(1).max(5).nullable(),
    finalToneScene: sceneDetailsSchema.nullable(),
    count: z.number().int().min(1).max(6).optional(),
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

function cleanText(value?: string | null) {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function summarizeSound(details: SoundDetails | null) {
  if (details == null) {
    return `(missing)`;
  }
  const name = cleanText(details.name) ?? details.soundId;
  const description = cleanText(details.description);
  return description == null ? name : `${name} - ${description}`;
}

export const aiRouter = router({
  generatePronunciationHints: authedProcedure
    .input(pronunciationHintInputSchema)
    .output(pronunciationHintOutputSchema)
    .mutation(async (opts) => {
      const {
        hanzi,
        pinyin,
        gloss,
        initial,
        final,
        tone,
        toneNumber,
        finalToneScene,
      } = opts.input;
      const count = opts.input.count ?? 4;

      const finalToneDescription = cleanText(finalToneScene?.description);

      const system =
        `You write short pronunciation mnemonic hints for Mandarin learners. ` +
        `Each hint should be 1-2 sentences, vivid, and easy to remember. ` +
        `Always tie the hint to the user's chosen character names and scene details. ` +
        `Avoid explaining meaning; focus on sound. ` +
        `Do not mention pinyin letters or tone numbers directly. ` +
        `Return only JSON with the requested shape.`;

      const user = [
        `Hanzi: ${hanzi}`,
        `Pinyin: ${pinyin}`,
        `Gloss (context only): ${gloss}`,
        `Initial character: ${summarizeSound(initial)}`,
        `Final character: ${summarizeSound(final)}`,
        `Tone character: ${summarizeSound(tone)}`,
        `Tone number: ${toneNumber ?? `(missing)`}`,
        `Final+tone scene: ${finalToneDescription ?? `(missing)`}`,
        ``,
        `Generate ${count} distinct hints.`,
        `Each hint must reference the initial, final, and tone characters by name.`,
        `If a scene description exists, include it as the location of the action.`,
        `Return JSON: { suggestions: [{ hint, explanation, confidence }] }`,
        `Confidence is a number from 0 to 1.`,
      ].join(`\n`);

      try {
        const data = await requestOpenAiJson<unknown>({
          system,
          user,
          temperature: 0.7,
          maxTokens: 700,
        });

        return pronunciationHintOutputSchema.parse(data);
      } catch (error) {
        console.error(`Failed to generate pronunciation hints:`, error);
        throw new TRPCError({
          code: `INTERNAL_SERVER_ERROR`,
          message: `Unable to generate hints`,
        });
      }
    }),
});
