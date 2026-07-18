import type { ChatPrompt, ChatPromptMessage } from "#server/lib/ai.js";
import { requestOpenAiResponseJson } from "#server/lib/ai.js";
import { renderPromptTemplate } from "#util/prompts.js";
import makeDebug from "debug";
import { z } from "zod";

const debug = makeDebug(`pyly:place`);

/**
 * A place specification is a canonical, reusable design brief for one fictional
 * place. It fixes five recurring experiences in a stable order so later art can
 * reuse the same location across many illustrations. The `heart` is the most
 * memorable destination for a first-time visitor, not the architectural center.
 */

export const placePromptInputSchema = z
  .object({
    place: z.string().min(1),
  })
  .strict();

export type PlacePromptInputType = z.infer<typeof placePromptInputSchema>;

export const placeExperienceRoleSchema = z.enum([
  `arrival`,
  `heart`,
  `below`,
  `ascent`,
  `summit`,
]);

export type PlaceExperienceRole = z.infer<typeof placeExperienceRoleSchema>;

export type PlaceExperience = {
  name: string;
  designRules: string[];
  canonicalFraming: string;
  avoidFraming: string[];
};

export type PlaceSpecification = {
  place: string;
  recognitionHooks: string[];
  designRules: string[];
  experiences: {
    arrival: PlaceExperience;
    heart: PlaceExperience;
    below: PlaceExperience;
    ascent: PlaceExperience;
    summit: PlaceExperience;
  };
};

const placeExperienceSchema = z
  .object({
    name: z.string().min(1),
    designRules: z.array(z.string().min(1)),
    canonicalFraming: z.string().min(1),
    avoidFraming: z.array(z.string().min(1)),
  })
  .strict();

const placeSpecificationBaseSchema = z
  .object({
    place: z.string().min(1),
    recognitionHooks: z.array(z.string().min(1)),
    designRules: z.array(z.string().min(1)),
    experiences: z
      .object({
        arrival: placeExperienceSchema,
        heart: placeExperienceSchema,
        below: placeExperienceSchema,
        ascent: placeExperienceSchema,
        summit: placeExperienceSchema,
      })
      .strict(),
  })
  .strict();

function validatePlaceSpecificationShape(
  value: z.infer<typeof placeSpecificationBaseSchema>,
  ctx: z.RefinementCtx,
): void {
  if (value.recognitionHooks.length < 3 || value.recognitionHooks.length > 5) {
    ctx.addIssue({
      code: `custom`,
      path: [`recognitionHooks`],
      message: `Expected 3 to 5 recognition hooks.`,
    });
  }

  if (value.designRules.length === 0) {
    ctx.addIssue({
      code: `custom`,
      path: [`designRules`],
      message: `Expected at least one global design rule.`,
    });
  }

  for (const role of placeExperienceRoleSchema.options) {
    const experience = value.experiences[role];

    if (experience.designRules.length === 0) {
      ctx.addIssue({
        code: `custom`,
        path: [`experiences`, role, `designRules`],
        message: `Expected at least one design rule for experience ${role}.`,
      });
    }
  }
}

export const placeSpecificationSchema =
  placeSpecificationBaseSchema.superRefine(validatePlaceSpecificationShape);

export type PlaceSpecificationSchemaType = z.infer<
  typeof placeSpecificationSchema
>;

export const placeCriticismCodeSchema = z.enum([
  `NON_CANONICAL`,
  `INVENTED_LORE`,
  `AWKWARD_EXPERIENCE`,
  `WEAK_HEART`,
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

export type PlaceCriticismCode = z.infer<typeof placeCriticismCodeSchema>;

export const placeCriticismScopeSchema = z.enum([
  `place`,
  `recognitionHooks`,
  `designRules`,
  `arrival`,
  `heart`,
  `below`,
  `ascent`,
  `summit`,
]);

export type PlaceCriticismScope = z.infer<typeof placeCriticismScopeSchema>;

export const placeCriticismSchema = z
  .object({
    code: placeCriticismCodeSchema,
    scope: placeCriticismScopeSchema,
    severity: z.enum([`minor`, `major`]),
    message: z.string().min(1),
    recommendation: z.string().min(1),
  })
  .strict();

export type PlaceCriticismType = z.infer<typeof placeCriticismSchema>;

export const placeEvaluationSchema = z
  .object({
    passed: z.boolean(),
    score: z.number().min(0).max(1),
    criticisms: z.array(placeCriticismSchema),
  })
  .strict();

export type PlaceEvaluationType = z.infer<typeof placeEvaluationSchema>;

export const placeSpecificationRefinementAttemptSchema = z
  .object({
    attempt: z.number().int().min(1),
    placeSpecification: placeSpecificationSchema,
    evaluation: placeEvaluationSchema,
  })
  .strict();

export type PlaceSpecificationRefinementAttemptType = z.infer<
  typeof placeSpecificationRefinementAttemptSchema
>;

export const placeSpecificationRefinementStopReasonSchema = z.enum([
  `no_major_criticisms`,
  `max_attempts_reached`,
]);

export type PlaceSpecificationRefinementStopReasonType = z.infer<
  typeof placeSpecificationRefinementStopReasonSchema
>;

export const placeSpecificationRefinementResultSchema = z
  .object({
    attempts: z.array(placeSpecificationRefinementAttemptSchema),
    succeeded: z.boolean(),
    stopReason: placeSpecificationRefinementStopReasonSchema,
    finalPlaceSpecification: placeSpecificationSchema,
    finalEvaluation: placeEvaluationSchema,
  })
  .strict();

export type PlaceSpecificationRefinementResultType = z.infer<
  typeof placeSpecificationRefinementResultSchema
>;

function buildPlacePromptData(entry: PlacePromptInputType) {
  return { place: entry.place };
}

export const buildPlaceSpecificationPrompt = (
  entry: PlacePromptInputType,
): ChatPrompt<typeof placeSpecificationSchema> => {
  const systemTemplate = `
You are an expert production designer creating the canonical design specification for a recurring fictional place.

This specification will be used by artists and image-generation models to create hundreds of illustrations over many years.

Your goal is not to design a unique place or describe a single illustration.

Your goal is to define the version of the place that already exists in people's shared imagination.

Future illustrations should feel like different visits to the same place.

Whenever originality and recognisability disagree, choose recognisability.

Whenever realism and recognisability disagree, choose recognisability.

Do not invent lore, history, proper nouns, named landmarks, or backstory.

Prefer timeless, widely recognised interpretations over clever or unusual ones.

## Recognition hooks

List the 3–5 strongest recurring visual ideas that instantly identify the place.

Hooks should be simple iconic objects, landmarks, silhouettes, or architectural features.

Keep each hook to only a few words.

Hooks should remain meaningful across different artistic styles.

## Global design rules

Write concise recurring visual rules that preserve the identity of the place.

Every rule must describe something directly observable in an illustration.

Prefer visual outcomes over implementation details or abstract intentions.

Prefer large recurring ideas over small decorative details.

Every rule should introduce one new visual idea.

Merge redundant rules.

Avoid unnecessary specificity.

## Canonical experiences

Every place has exactly five recurring experiences.

### Arrival

Where visitors first enter the place.

### Heart

The highlight of visiting the place.

Imagine giving a first-time visitor a tour.

If you could show them only one destination before they had to leave, where would you take them?

Choose the destination visitors are most excited to reach and most enjoy remembering.

Do not choose a circulation hub merely because it connects the rest of the environment or provides the best overview.

Choose the destination, not the hub.

### Below

The canonical lower part of the place.

### Ascent

The primary upward journey through the place.

### Summit

The highest significant destination and the natural reward for completing the ascent.

## Experience specification

For each experience:

- use the simplest widely recognised name
- write concise observable design rules
- define a canonical framing
- list viewpoints that weaken recognition

The canonical framing should state:

- where the viewer stands
- what they look toward
- what dominates the composition
- which recognition hooks should remain visible when naturally possible

Before finalising, silently check:

- every rule is observable
- every rule adds a distinct idea
- redundant rules have been merged
- no lore or invented proper names were introduced
- each experience is a natural fit for the supplied place
- the Heart is genuinely the highlight of visiting the place
- another artist could recreate essentially the same place from the specification

Output only the structured result.
`.trim();

  const userTemplate = `
Generate the canonical place specification for the following input.

<data>
{{ data }}
</data>
`.trim();

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        data: JSON.stringify(buildPlacePromptData(entry), null, 2),
      }),
    },
  ];

  return {
    messages,
    model: `gpt-5.4`,
    reasoningEffort: `medium`,
    schema: placeSpecificationSchema,
  };
};

export const buildEvaluatePlaceSpecificationPrompt = (entry: {
  place: string;
  placeSpecification: PlaceSpecification;
}): ChatPrompt<typeof placeEvaluationSchema> => {
  const systemTemplate = `
You are evaluating a place specification for a recurring fictional place.

Your task is to diagnose problems in the specification.

Do not rewrite it.

Do not improve it.

You are judging whether the specification is canonical, reusable, visually coherent, and useful for repeated illustration.

## Canonicality

Check whether the output represents the shared, default mental image of the supplied place.

Reject invented lore, proper nouns, overly specialised variants, and arbitrary distinguishing details.

Names should be simple and widely recognised.

## Natural experience selection

Check whether each experience naturally exists within the place.

Reject contrived experiences that only exist to satisfy the schema.

The Heart must be the highlight visitors would most want to reach, not a courtyard, corridor, circulation hub, or overview chosen for architectural convenience.

The Ascent should naturally lead toward the Summit.

The Below experience must be meaningfully distinct from the others.

## Recognition

Check whether there are 3–5 strong recognition hooks.

Hooks should be iconic, concise, visual, and useful across different art styles.

Reject hooks that depend on arbitrary colours, materials, moods, or implementation details.

Global and experience-level rules should preserve recognisability.

## Distinctiveness and coherence

Check whether the five experiences are visually and spatially distinct while still belonging to the same place.

Repeated scenes should be easy to distinguish by experience.

Canonical framings should provide stable, recognisable compositions.

## Rule quality

Every design rule must be directly observable.

Rules should be concise and non-redundant.

Reject abstract intentions, overly specific details, and repeated global rules in individual experiences.

## Guest appeal and revisitability

The place should be enjoyable to imagine revisiting.

The Heart should have strong appeal, wonder, and story potential.

Technically correct but boring or unrewarding experiences should be criticised.

The Summit should feel like a satisfying payoff after the Ascent.

## Framing quality

Each canonical framing should clearly define viewpoint, direction, dominant composition, and relevant hooks.

Avoid impossible visibility or frames that force unrelated exterior hooks into enclosed interior spaces.

Return structured criticisms only.
`.trim();

  const userTemplate = `
Evaluate the following place specification.

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
    schema: placeEvaluationSchema,
  };
};

export const buildRefinePlaceSpecificationPrompt = (entry: {
  place: string;
  placeSpecification: PlaceSpecification;
  criticisms: PlaceCriticismType[];
}): ChatPrompt<typeof placeSpecificationSchema> => {
  const systemTemplate = `
You revise place specifications based on evaluator criticisms.

You are given:

- the original place,
- the current place specification,
- a list of criticisms.

Return one revised place specification that resolves as many criticisms as possible while preserving the strongest existing parts.

Rules:

- Keep the supplied place unchanged.
- Preserve the five required experiences and their fixed order.
- Do not add new fields.
- Do not invent lore, proper nouns, or backstory.
- Use the simplest widely recognised names.
- Keep the recognition hooks compact and iconic.
- Keep design rules observable and non-redundant.

Fixes should be targeted.

If a criticism says an experience choice is weak, replace the experience choice rather than merely editing its wording.

If a criticism says a design rule is weak, improve the rule without redesigning the whole experience.

If a criticism says framing is weak, fix the framing without changing the experience itself.

If a criticism says rules are redundant or overly specific, prune them.

Do not include analysis.

Return only the revised place specification.
`.trim();

  const userTemplate = `
Revise the following place specification based on the criticisms.

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
    reasoningEffort: `low`,
    schema: placeSpecificationSchema,
  };
};

interface RunPlaceSpecificationRefinementPipelineOptions {
  maxAttempts?: number;
  signal?: AbortSignal;
}

function hasMajorCriticisms(evaluation: PlaceEvaluationType): boolean {
  return evaluation.criticisms.some(
    (criticism) => criticism.severity === `major`,
  );
}

function isFundamentalFailure(evaluation: PlaceEvaluationType): boolean {
  return evaluation.criticisms.some(
    (criticism) =>
      criticism.severity === `major` && criticism.scope === `place`,
  );
}

async function evaluatePlaceSpecification(
  entry: {
    place: string;
    placeSpecification: PlaceSpecification;
  },
  options: RunPlaceSpecificationRefinementPipelineOptions,
): Promise<PlaceEvaluationType> {
  const response = await requestOpenAiResponseJson(
    buildEvaluatePlaceSpecificationPrompt(entry),
    {
      signal: options.signal,
    },
  );

  return response.data;
}

function updateBestAttempt(
  bestAttempt: PlaceSpecificationRefinementAttemptType | null,
  currentAttempt: PlaceSpecificationRefinementAttemptType,
): PlaceSpecificationRefinementAttemptType {
  if (bestAttempt == null) {
    return currentAttempt;
  }

  if (currentAttempt.evaluation.score >= bestAttempt.evaluation.score) {
    return currentAttempt;
  }

  return bestAttempt;
}

export async function runPlaceSpecificationRefinementPipeline(
  entry: PlacePromptInputType,
  options?: RunPlaceSpecificationRefinementPipelineOptions,
): Promise<PlaceSpecificationRefinementResultType> {
  const maxAttempts = options?.maxAttempts ?? 3;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error(
      `maxAttempts must be an integer greater than or equal to 1`,
    );
  }

  const attempts: PlaceSpecificationRefinementAttemptType[] = [];
  let currentPlaceSpecification: PlaceSpecification;

  const initialResponse = await requestOpenAiResponseJson(
    buildPlaceSpecificationPrompt(entry),
    {
      signal: options?.signal,
    },
  );

  currentPlaceSpecification = initialResponse.data;
  let bestAttempt: PlaceSpecificationRefinementAttemptType | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const evaluation = await evaluatePlaceSpecification(
      {
        place: entry.place,
        placeSpecification: currentPlaceSpecification,
      },
      { signal: options?.signal, maxAttempts },
    );

    const currentAttempt: PlaceSpecificationRefinementAttemptType = {
      attempt,
      placeSpecification: currentPlaceSpecification,
      evaluation,
    };

    attempts.push(currentAttempt);
    bestAttempt = updateBestAttempt(bestAttempt, currentAttempt);

    debug(
      `attempt=%d score=%d passed=%s majorCriticisms=%d`,
      attempt,
      evaluation.score,
      evaluation.passed,
      evaluation.criticisms.filter(
        (criticism) => criticism.severity === `major`,
      ).length,
    );

    if (!hasMajorCriticisms(evaluation)) {
      return {
        attempts,
        succeeded: true,
        stopReason: `no_major_criticisms`,
        finalPlaceSpecification: currentPlaceSpecification,
        finalEvaluation: evaluation,
      };
    }

    if (attempt === maxAttempts) {
      const selectedAttempt = bestAttempt;

      return {
        attempts,
        succeeded: false,
        stopReason: `max_attempts_reached`,
        finalPlaceSpecification: selectedAttempt.placeSpecification,
        finalEvaluation: selectedAttempt.evaluation,
      };
    }

    const nextPrompt = isFundamentalFailure(evaluation)
      ? buildPlaceSpecificationPrompt(entry)
      : buildRefinePlaceSpecificationPrompt({
          place: entry.place,
          placeSpecification: currentPlaceSpecification,
          criticisms: evaluation.criticisms,
        });

    const nextResponse = await requestOpenAiResponseJson(nextPrompt, {
      signal: options?.signal,
    });

    currentPlaceSpecification = nextResponse.data;
  }

  throw new Error(`Unexpected pipeline state`);
}

export async function generatePlaceSpecification(
  entry: PlacePromptInputType,
  options?: RunPlaceSpecificationRefinementPipelineOptions,
): Promise<PlaceSpecificationRefinementResultType> {
  return runPlaceSpecificationRefinementPipeline(entry, options);
}
