import type { PinyinSoundId } from "@/data/model";
import { isFinalSoundId } from "@/data/pinyin";
import { z } from "zod";

const locationSoundThoughtChainPathStepSchema = z
  .object({
    anchor: z.string(),
    reason: z.string().nullable(),
  })
  .strict();

export const locationSoundThoughtChainCandidateSchema = z
  .object({
    path: z.array(locationSoundThoughtChainPathStepSchema),
    score: z.number().min(0).max(100),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  })
  .strict();

export type LocationSoundThoughtChainCandidateType = z.infer<
  typeof locationSoundThoughtChainCandidateSchema
>;

export const locationSoundThoughtChainPromptOutputSchema = z
  .object({
    candidates: z.array(locationSoundThoughtChainCandidateSchema),
  })
  .strict()
  .meta({ title: `locationSoundThoughtChainPromptOutputSchema` });

export type LocationSoundThoughtChainPromptOutputType = z.infer<
  typeof locationSoundThoughtChainPromptOutputSchema
>;

export const locationSoundThoughtChainsBySoundIdSchema = z
  .record(z.string(), z.array(locationSoundThoughtChainCandidateSchema))
  .superRefine((value, ctx) => {
    for (const key of Object.keys(value)) {
      if (!isFinalSoundId(key as PinyinSoundId)) {
        ctx.addIssue({
          code: `custom`,
          message: `Expected final sound id key, got ${JSON.stringify(key)}.`,
          path: [key],
        });
      }
    }
  });

export type LocationSoundThoughtChainsBySoundIdType = z.infer<
  typeof locationSoundThoughtChainsBySoundIdSchema
>;

export function getHighestScoreLocationSoundThoughtChainCandidate(
  candidates: LocationSoundThoughtChainCandidateType[],
): LocationSoundThoughtChainCandidateType | null {
  let bestCandidate: LocationSoundThoughtChainCandidateType | null = null;
  for (const candidate of candidates) {
    if (bestCandidate == null || candidate.score > bestCandidate.score) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}
