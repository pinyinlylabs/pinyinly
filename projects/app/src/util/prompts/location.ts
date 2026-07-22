import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { requestOpenAiResponseJson } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";

/**
 * A location specification is a canonical, reusable design brief for one
 * fictional location. It fixes five recurring sets in a stable order so later
 * art can reuse the same location across many illustrations. The `heart` is
 * the most memorable destination for a first-time visitor, not the
 * architectural center.
 */

export const locationPromptInputSchema = z
  .object({
    location: z.string().min(1),
  })
  .strict();

export type LocationPromptInputType = z.infer<typeof locationPromptInputSchema>;

export const locationSetRoleSchema = z.enum([
  `arrival`,
  `heart`,
  `below`,
  `ascent`,
  `summit`,
]);

export type LocationSetRole = z.infer<typeof locationSetRoleSchema>;

export type LocationSet = {
  name: string;
  designRules: string[];
  canonicalFraming: string;
  avoidFraming: string[];
};

export type LocationSpecification = {
  location: string;
  recognitionHooks: string[];
  designRules: string[];
  sets: {
    arrival: LocationSet;
    heart: LocationSet;
    below: LocationSet;
    ascent: LocationSet;
    summit: LocationSet;
  };
};

const locationSetSchema = z
  .object({
    name: z.string().min(1),
    designRules: z.array(z.string().min(1)),
    canonicalFraming: z.string().min(1),
    avoidFraming: z.array(z.string().min(1)),
  })
  .strict();

const locationSpecificationBaseSchema = z
  .object({
    location: z.string().min(1),
    recognitionHooks: z.array(z.string().min(1)),
    designRules: z.array(z.string().min(1)),
    sets: z
      .object({
        arrival: locationSetSchema,
        heart: locationSetSchema,
        below: locationSetSchema,
        ascent: locationSetSchema,
        summit: locationSetSchema,
      })
      .strict(),
  })
  .strict();

function validateLocationSpecificationShape(
  value: z.infer<typeof locationSpecificationBaseSchema>,
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

  for (const role of locationSetRoleSchema.options) {
    const set = value.sets[role];

    if (set.designRules.length === 0) {
      ctx.addIssue({
        code: `custom`,
        path: [`sets`, role, `designRules`],
        message: `Expected at least one design rule for set ${role}.`,
      });
    }
  }
}

export const locationSpecificationSchema =
  locationSpecificationBaseSchema.superRefine(
    validateLocationSpecificationShape,
  );

export type LocationSpecificationSchemaType = z.infer<
  typeof locationSpecificationSchema
>;

export const locationCriticismCodeSchema = z.enum([
  `NON_CANONICAL`,
  `INVENTED_LORE`,
  `AWKWARD_SET`,
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
    message: z.string().min(1),
    recommendation: z.string().min(1),
  })
  .strict();

export type LocationCriticismType = z.infer<typeof locationCriticismSchema>;

export const locationEvaluationSchema = z
  .object({
    passed: z.boolean(),
    score: z.number().min(0).max(1),
    criticisms: z.array(locationCriticismSchema),
  })
  .strict();

export type LocationEvaluationType = z.infer<typeof locationEvaluationSchema>;

export const locationSpecificationRefinementAttemptSchema = z
  .object({
    attempt: z.number().int().min(1),
    locationSpecification: locationSpecificationSchema,
    evaluation: locationEvaluationSchema,
  })
  .strict();

export type LocationSpecificationRefinementAttemptType = z.infer<
  typeof locationSpecificationRefinementAttemptSchema
>;

export const locationSpecificationRefinementStopReasonSchema = z.enum([
  `no_major_criticisms`,
  `max_attempts_reached`,
]);

export type LocationSpecificationRefinementStopReasonType = z.infer<
  typeof locationSpecificationRefinementStopReasonSchema
>;

export const locationSpecificationRefinementResultSchema = z
  .object({
    attempts: z.array(locationSpecificationRefinementAttemptSchema),
    succeeded: z.boolean(),
    stopReason: locationSpecificationRefinementStopReasonSchema,
    finalLocationSpecification: locationSpecificationSchema,
    finalEvaluation: locationEvaluationSchema,
  })
  .strict();

export type LocationSpecificationRefinementResultType = z.infer<
  typeof locationSpecificationRefinementResultSchema
>;

function buildLocationPromptData(entry: LocationPromptInputType) {
  return { location: entry.location };
}

export function buildLocationSetDescriptionPrompt({
  label,
  location,
  locationNotes,
  locationSet,
  count,
}: {
  label: string;
  location: string;
  locationNotes?: string;
  locationSet: string;
  count: number;
}): ChatPrompt<typeof buildLocationSetDescriptionPrompt.schema> {
  const systemTemplate = `
You're a helpful assistant that creates reusable location descriptions for Mandarin pronunciation mnemonic scenes.
Your goal is to define a stable mental image of a place that can be reused across many stories.
You will be given a primary location and a location set within or around it. Combine them into one clear, vivid, always-true mental setting.
Focus on persistent features such as layout, materials, signage, objects, textures, lighting style, and ambient sensory details.
Avoid time-specific or temporary details such as time of day, weather, ongoing events, or people doing actions.
Keep each description to 1-2 sentences. Make them specific, visual, and easy to remember.
Each suggestion must clearly reflect both the Location and the Location Set.
Describe stable, always-true aspects of the place.
Return only the descriptive fragment itself, don't prefix with the place label.
Avoid time of day, weather, or temporary events.
Avoid actions or specific story moments.
Be easy to visualize and reuse in different mnemonic scenes.
Good suggestions feel like a reusable mental stage.
Bad suggestions feel like a one-time scene.
`;

  const data = {
    label,
    location,
    locationSet,
    ...(locationNotes == null ? {} : { locationNotes }),
  };

  const userTemplate = `
Generate {{ count }} distinct reusable location descriptions for this exact combined place.

<data>
{{ data }}
</data>
`;

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        count: String(count),
        data: JSON.stringify(data, null, 2),
      }),
    },
  ];

  return {
    messages,
    schema: buildLocationSetDescriptionPrompt.schema,
    model: `gpt-5-mini`,
    reasoningEffort: `medium`,
  };
}

const locationSetDescriptionOutputSchema = z
  .object({
    suggestions: z.array(
      z
        .object({
          description: z.string(),
          explanation: z.string().nullable(),
        })
        .strict(),
    ),
  })
  .strict();

buildLocationSetDescriptionPrompt.schema = locationSetDescriptionOutputSchema;

export const buildLocationSpecificationPrompt = (
  entry: LocationPromptInputType,
): ChatPrompt<typeof locationSpecificationSchema> => {
  const systemTemplate = `
You are an expert production designer creating the canonical design specification for a recurring fictional location.

This specification will be used by artists and image-generation models to create hundreds of illustrations over many years.

Your goal is not to design a unique location or describe a single illustration.

Your goal is to define the version of the location that already exists in people's shared imagination.

Future illustrations should feel like different visits to the same location.

Whenever originality and recognisability disagree, choose recognisability.

Whenever realism and recognisability disagree, choose recognisability.

Do not invent lore, history, proper nouns, named landmarks, or backstory.

Prefer timeless, widely recognised interpretations over clever or unusual ones.

## Recognition hooks

List the 3–5 strongest recurring visual ideas that instantly identify the location.

Hooks should be simple iconic objects, landmarks, silhouettes, or architectural features.

Keep each hook to only a few words.

Hooks should remain meaningful across different artistic styles.

## Global design rules

Write concise recurring visual rules that preserve the identity of the location.

Every rule must describe something directly observable in an illustration.

Prefer visual outcomes over implementation details or abstract intentions.

Prefer large recurring ideas over small decorative details.

Every rule should introduce one new visual idea.

Merge redundant rules.

Avoid unnecessary specificity.

## Canonical sets

Every location has exactly five recurring sets.

### Arrival

Where visitors first enter the location.

### Heart

The highlight of visiting the location.

Imagine giving a first-time visitor a tour.

If you could show them only one destination before they had to leave, where would you take them?

Choose the destination visitors are most excited to reach and most enjoy remembering.

Do not choose a circulation hub merely because it connects the rest of the environment or provides the best overview.

Choose the destination, not the hub.

### Below

The canonical lower part of the location.

### Ascent

The canonical route upward within the location.
Prefer staircases, ramps, catwalks, ladders, elevators, escalators, or other persistent architectural features that connect the lower parts of the location to its highest destination.
Do not choose an exterior approach unless the ascent itself is one of the location's defining and most recognisable features.

### Summit

The highest significant destination and the natural reward for completing the ascent.

## Set specification

For each set:

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
- each set is a natural fit for the supplied location
- the Heart is genuinely the highlight of visiting the location
- another artist could recreate essentially the same location from the specification

Output only the structured result.
`.trim();

  const userTemplate = `
Generate the canonical location specification for the following input.

<data>
{{ data }}
</data>
`.trim();

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        data: JSON.stringify(buildLocationPromptData(entry), null, 2),
      }),
    },
  ];

  return {
    messages,
    model: `gpt-5.4`,
    reasoningEffort: `medium`,
    schema: locationSpecificationSchema,
  };
};

export const buildEvaluateLocationSpecificationPrompt = (entry: {
  location: string;
  locationSpecification: LocationSpecification;
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

export const buildRefineLocationSpecificationPrompt = (entry: {
  location: string;
  locationSpecification: LocationSpecification;
  criticisms: LocationCriticismType[];
}): ChatPrompt<typeof locationSpecificationSchema> => {
  const systemTemplate = `
You revise location specifications based on evaluator criticisms.

You are given:

- the original location,
- the current location specification,
- a list of criticisms.

Return one revised location specification that resolves as many criticisms as possible while preserving the strongest existing parts.

Rules:

- Keep the supplied location unchanged.
- Preserve the five required sets and their fixed order.
- Do not add new fields.
- Do not invent lore, proper nouns, or backstory.
- Use the simplest widely recognised names.
- Keep the recognition hooks compact and iconic.
- Keep design rules observable and non-redundant.

Fixes should be targeted.

If a criticism says a set choice is weak, replace the set choice rather than merely editing its wording.

If a criticism says a design rule is weak, improve the rule without redesigning the whole set.

If a criticism says framing is weak, fix the framing without changing the set itself.

If a criticism says rules are redundant or overly specific, prune them.

Do not include analysis.

Return only the revised location specification.
`.trim();

  const userTemplate = `
Revise the following location specification based on the criticisms.

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
    schema: locationSpecificationSchema,
  };
};

interface LocationSpecificationRequestOptions {
  signal?: AbortSignal;
}

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

export async function generateLocationSpecification(
  entry: LocationPromptInputType,
  options?: LocationSpecificationRequestOptions,
): Promise<LocationSpecification> {
  const response = await requestOpenAiResponseJson(
    buildLocationSpecificationPrompt(entry),
    {
      signal: options?.signal,
    },
  );

  return response.data;
}

export async function evaluateLocationSpecification(
  entry: {
    location: string;
    locationSpecification: LocationSpecification;
  },
  options?: LocationSpecificationRequestOptions,
): Promise<LocationEvaluationType> {
  const response = await requestOpenAiResponseJson(
    buildEvaluateLocationSpecificationPrompt(entry),
    {
      signal: options?.signal,
    },
  );

  return response.data;
}

export async function refineLocationSpecification(
  entry: {
    location: string;
    locationSpecification: LocationSpecification;
    criticisms: LocationCriticismType[];
  },
  options?: LocationSpecificationRequestOptions,
): Promise<LocationSpecification> {
  const response = await requestOpenAiResponseJson(
    buildRefineLocationSpecificationPrompt(entry),
    {
      signal: options?.signal,
    },
  );

  return response.data;
}

export function updateBestAttempt(
  bestAttempt: LocationSpecificationRefinementAttemptType | null,
  currentAttempt: LocationSpecificationRefinementAttemptType,
): LocationSpecificationRefinementAttemptType {
  if (bestAttempt == null) {
    return currentAttempt;
  }

  if (currentAttempt.evaluation.score >= bestAttempt.evaluation.score) {
    return currentAttempt;
  }

  return bestAttempt;
}
