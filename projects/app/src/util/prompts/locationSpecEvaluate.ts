import type { LocationSpec } from "@/data/model";
import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";
import { locationSpecWithDetailSchema } from "./locationSpec";

export const locationCriticismCodeSchema = z.enum([
  `NON_CANONICAL`,
  `INVENTED_LORE`,
  `AWKWARD_SET`,
  `WEAK_RECOGNITION_HOOK`,
  `REDUNDANT_RULE`,
  `UNOBSERVABLE_RULE`,
  `OVER_SPECIFIC`,
  `WEAK_DISTINCTIVENESS`,
  `WEAK_COHERENCE`,
  `WEAK_FRAMING`,
  `LOW_GUEST_APPEAL`,
  `OTHER`,
]);

export type LocationCriticismCode = z.infer<typeof locationCriticismCodeSchema>;

export const locationCriticismScopeSchema = z.enum([
  `location`,
  `recognitionHooks`,
  `designRules`,
  `arrival`,
  `heart`,
  `below`,
  `ascent`,
  `summit`,
]);

export type LocationCriticismScope = z.infer<
  typeof locationCriticismScopeSchema
>;

export const locationCriticismSchema = z
  .object({
    code: locationCriticismCodeSchema,
    scope: locationCriticismScopeSchema,
    severity: z.enum([`minor`, `major`]),
    message: z.string(),
    recommendation: z.string(),
  })
  .strict();

export type LocationCriticismType = z.infer<typeof locationCriticismSchema>;

export const locationEvaluationSchema = z
  .object({
    passed: z.boolean(),
    score: z.number().min(0).max(1),
    criticisms: z.array(locationCriticismSchema),
  })
  .strict()
  .meta({ title: `locationEvaluationSchema` });

export type LocationEvaluationType = z.infer<typeof locationEvaluationSchema>;

export const locationSpecRefinementAttemptSchema = z
  .object({
    attempt: z.number().int(),
    locationSpec: locationSpecWithDetailSchema,
    evaluation: locationEvaluationSchema,
  })
  .strict();

export type LocationSpecRefinementAttemptType = z.infer<
  typeof locationSpecRefinementAttemptSchema
>;

export const locationSpecRefinementStopReasonSchema = z.enum([
  `no_major_criticisms`,
  `max_attempts_reached`,
]);

export type LocationSpecRefinementStopReasonType = z.infer<
  typeof locationSpecRefinementStopReasonSchema
>;

export const locationSpecRefinementResultSchema = z
  .object({
    attempts: z.array(locationSpecRefinementAttemptSchema),
    succeeded: z.boolean(),
    stopReason: locationSpecRefinementStopReasonSchema,
    finalLocationSpec: locationSpecWithDetailSchema,
    finalEvaluation: locationEvaluationSchema,
  })
  .strict();

export type LocationSpecRefinementResultType = z.infer<
  typeof locationSpecRefinementResultSchema
>;

export const buildLocationSpecEvaluatePrompt = (entry: {
  location: string;
  locationSpec: LocationSpec;
}): ChatPrompt<typeof locationEvaluationSchema> => {
  const systemTemplate = `
You are evaluating a location specification for a recurring fictional location.

Your task is to diagnose problems in the specification.

Do not rewrite it.

Do not improve it.

You are judging whether the specification is canonical, reusable, visually coherent, and useful for repeated illustration.

## Canonicality

Check whether the output represents the shared, default mental image of the supplied location.

Reject invented lore, proper nouns, overly specialised variants, and arbitrary distinguishing details.

Names should be simple and widely recognised.

## Natural set selection

Check whether each set naturally exists within the location.

Reject contrived sets that only exist to satisfy the schema.

The Heart must be the highlight visitors would most want to reach, not a courtyard, corridor, circulation hub, or overview chosen for architectural convenience.

The Ascent should naturally lead toward the Summit.

The Below set must be meaningfully distinct from the others.

## Recognition

Check whether there are 3–5 strong recognition hooks.

Hooks should be iconic, concise, visual, and useful across different art styles.

Reject hooks that depend on arbitrary colours, materials, moods, or implementation details.

Global and set-level rules should preserve recognisability.

## Distinctiveness and coherence

Check whether the five sets are visually and spatially distinct while still belonging to the same location.

Repeated scenes should be easy to distinguish by set.

Canonical framings should provide stable, recognisable compositions.

## Rule quality

Every design rule must be directly observable.

Rules should be concise and non-redundant.

Reject abstract intentions, overly specific details, and repeated global rules in individual sets.

## Guest appeal and revisitability

The location should be enjoyable to imagine revisiting.

The Heart should have strong appeal, wonder, and story potential.

Technically correct but boring or unrewarding sets should be criticised.

The Summit should feel like a satisfying payoff after the Ascent.

## Framing quality

Each canonical framing should clearly define viewpoint, direction, dominant composition, and relevant hooks.

Avoid impossible visibility or frames that force unrelated exterior hooks into enclosed interior spaces.

Return structured criticisms only.
`.trim();

  const userTemplate = `
Evaluate the following location specification.

<data>
{{ data }}
</data>
`.trim();

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        data: JSON.stringify(entry, null, 2),
      }),
    },
  ];

  return {
    messages,
    model: `gpt-5.4`,
    reasoningEffort: `medium`,
    schema: locationEvaluationSchema,
  };
};

export function hasMajorCriticisms(
  evaluation: LocationEvaluationType,
): boolean {
  return evaluation.criticisms.some(
    (criticism) => criticism.severity === `major`,
  );
}

export function isFundamentalFailure(
  evaluation: LocationEvaluationType,
): boolean {
  return evaluation.criticisms.some(
    (criticism) =>
      criticism.severity === `major` && criticism.scope === `location`,
  );
}

export function updateBestAttempt(
  bestAttempt: LocationSpecRefinementAttemptType | null,
  currentAttempt: LocationSpecRefinementAttemptType,
): LocationSpecRefinementAttemptType {
  if (bestAttempt == null) {
    return currentAttempt;
  }

  if (currentAttempt.evaluation.score >= bestAttempt.evaluation.score) {
    return currentAttempt;
  }

  return bestAttempt;
}
