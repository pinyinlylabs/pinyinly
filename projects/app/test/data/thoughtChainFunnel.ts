import type { ChatPrompt, ChatPromptMessage } from "#server/lib/ai.js";
import { requestOpenAiResponseJson } from "#server/lib/ai.js";
import { renderPromptTemplate } from "#util/prompts.js";
import { z } from "zod";

export const thoughtChainFunnelPromptInputSchema = z.object({
  target: z.string(),
  concepts: z.array(z.string()).min(1),
});

export type ThoughtChainFunnelPromptInputType = z.infer<
  typeof thoughtChainFunnelPromptInputSchema
>;

export const thoughtChainFunnelStepSchema = z.object({
  thought: z.string(),
  elaboration: z.string().nullable(),
  because: z.string().nullable(),
});

export type ThoughtChainFunnelStepType = z.infer<
  typeof thoughtChainFunnelStepSchema
>;

export const thoughtChainFunnelChainSchema = z.array(
  thoughtChainFunnelStepSchema,
);

export type ThoughtChainFunnelChainType = z.infer<
  typeof thoughtChainFunnelChainSchema
>;

export const thoughtChainFunnelSupportingCueSchema = z.object({
  concept: z.string(),
  cueThoughtChain: thoughtChainFunnelChainSchema,
  joinBackboneStepIndex: z.number().int().min(0),
});

export type ThoughtChainFunnelSupportingCueType = z.infer<
  typeof thoughtChainFunnelSupportingCueSchema
>;

export const thoughtChainFunnelSchema = z.object({
  backboneThoughtChain: thoughtChainFunnelChainSchema,
  supportingCues: z.array(thoughtChainFunnelSupportingCueSchema),
});

export type ThoughtChainFunnelType = z.infer<typeof thoughtChainFunnelSchema>;

/**
 * Render a compact ASCII flow diagram in a git-log-like style.
 *
 * This is intended for quick human inspection of model output during evals.
 */
export function renderThoughtChainFunnelAscii(
  thoughtFunnel: ThoughtChainFunnelType,
): string {
  function formatStep(
    thought: string,
    elaboration: string | null,
    because: string | null,
  ): string {
    const step = elaboration == null ? thought : `${thought} (${elaboration})`;
    return because == null ? step : `${step} (${because})`;
  }

  const lines: string[] = [];
  const joinIndexToCues = new Map<
    number,
    ThoughtChainFunnelSupportingCueType[]
  >();
  const invalidJoinCues: ThoughtChainFunnelSupportingCueType[] = [];
  const backboneLength = thoughtFunnel.backboneThoughtChain.length;

  for (const cue of thoughtFunnel.supportingCues) {
    if (
      cue.joinBackboneStepIndex < 0 ||
      cue.joinBackboneStepIndex >= backboneLength
    ) {
      invalidJoinCues.push(cue);
      continue;
    }

    const existing = joinIndexToCues.get(cue.joinBackboneStepIndex);
    if (existing == null) {
      joinIndexToCues.set(cue.joinBackboneStepIndex, [cue]);
    } else {
      existing.push(cue);
    }
  }

  for (const cues of joinIndexToCues.values()) {
    cues.sort((left, right) => left.concept.localeCompare(right.concept));
  }
  invalidJoinCues.sort((left, right) =>
    left.concept.localeCompare(right.concept),
  );

  lines.push(`GRAPH`);

  if (backboneLength === 0) {
    lines.push(`* [empty backbone]`);
  }

  for (const [index, step] of thoughtFunnel.backboneThoughtChain.entries()) {
    const cues = joinIndexToCues.get(index) ?? [];

    const isTarget = index === thoughtFunnel.backboneThoughtChain.length - 1;
    lines.push(
      `* ${formatStep(step.thought, step.elaboration, step.because)}${isTarget ? ` (target)` : ``}`,
    );

    if (cues.length > 0) {
      lines.push(`|`);
      for (const cue of cues) {
        for (const cueStep of cue.cueThoughtChain) {
          lines.push(
            `| * ${formatStep(cueStep.thought, cueStep.elaboration, cueStep.because)}`,
          );
        }
        lines.push(`|/`);
      }

      if (index < thoughtFunnel.backboneThoughtChain.length - 1) {
        lines.push(`|`);
      }
    } else if (index < thoughtFunnel.backboneThoughtChain.length - 1) {
      lines.push(`|`);
    }
  }

  if (invalidJoinCues.length > 0) {
    lines.push(`|`);
    lines.push(`* INVALID JOIN CUES`);
    for (const cue of invalidJoinCues) {
      for (const cueStep of cue.cueThoughtChain) {
        lines.push(
          `| * ${formatStep(cueStep.thought, cueStep.elaboration, cueStep.because)}`,
        );
      }
      lines.push(`|/ INVALID joins [${cue.joinBackboneStepIndex}]`);
    }
  }

  return lines.join(`\n`);
}

export const thoughtChainFunnelPromptOutputSchema = z.object({
  thoughtFunnel: thoughtChainFunnelSchema,
});

export type ThoughtChainFunnelPromptOutputType = z.infer<
  typeof thoughtChainFunnelPromptOutputSchema
>;

export const guidedImaginationPromptInputSchema = z.object({
  target: z.string(),
  concepts: z.array(z.string()).min(1),
  thoughtFunnel: thoughtChainFunnelSchema,
});

export type GuidedImaginationPromptInputType = z.infer<
  typeof guidedImaginationPromptInputSchema
>;

export const guidedImaginationPromptOutputSchema = z.object({
  guidedImagination: z.string(),
});

export type GuidedImaginationPromptOutputType = z.infer<
  typeof guidedImaginationPromptOutputSchema
>;

const guidedImaginationCriticismCodes = [
  `IMPORTANT_IDEA_MISSING`,
  `SUPPORTING_CUE_MISSING`,
  `INVENTED_ASSOCIATION`,
  `REASONING_CHANGED`,
  `ORDER_CHANGED`,
  `OVERCOMPRESSED`,
  `UNDERCOMPRESSED`,
  `TOO_VERBOSE`,
  `AWKWARD_LANGUAGE`,
  `REPEATED_IDEA`,
  `UNCLEAR_TRANSITION`,
  `OVERLY_LITERAL_RENDERING`,
  `OVERLY_CREATIVE_RENDERING`,
  `EM_DASH_USED`,
  `EMPTY_OUTPUT`,
  `FORBIDDEN_FORMATTING`,
  `METADATA_LEAKAGE`,
  `OTHER`,
] as const;

export const guidedImaginationCriticismSchema = z.object({
  severity: z.enum([`minor`, `major`]),
  code: z.enum(guidedImaginationCriticismCodes),
  message: z.string(),
  section: z.enum([`guided_imagination`, `backbone`, `cue`, `funnel`]),
  cueConcept: z.string().nullable(),
  stepIndex: z.number().nullable(),
});

export type GuidedImaginationCriticismType = z.infer<
  typeof guidedImaginationCriticismSchema
>;

export const evaluateGuidedImaginationPromptInputSchema = z.object({
  target: z.string(),
  concepts: z.array(z.string()).min(1),
  thoughtFunnel: thoughtChainFunnelSchema,
  guidedImagination: z.string(),
});

export type EvaluateGuidedImaginationPromptInputType = z.infer<
  typeof evaluateGuidedImaginationPromptInputSchema
>;

export const evaluateGuidedImaginationPromptOutputSchema = z.object({
  fidelityScore: z.number().min(0).max(1),
  readabilityScore: z.number().min(0).max(1),
  compressionScore: z.number().min(0).max(1),
  overallScore: z.number().min(0).max(1),
  criticisms: z.array(guidedImaginationCriticismSchema),
});

export type EvaluateGuidedImaginationPromptOutputType = z.infer<
  typeof evaluateGuidedImaginationPromptOutputSchema
>;

export const guidedImaginationDeterministicChecksSchema = z.object({
  passed: z.boolean(),
  characterCount: z.number().int().min(0),
  criticisms: z.array(guidedImaginationCriticismSchema),
});

export type GuidedImaginationDeterministicChecksType = z.infer<
  typeof guidedImaginationDeterministicChecksSchema
>;

export const guidedImaginationEvaluationResultSchema = z.object({
  fidelityScore: z.number().min(0).max(1),
  readabilityScore: z.number().min(0).max(1),
  compressionScore: z.number().min(0).max(1),
  overallScore: z.number().min(0).max(1),
  passed: z.boolean(),
  criticisms: z.array(guidedImaginationCriticismSchema),
  deterministicChecks: guidedImaginationDeterministicChecksSchema,
});

export type GuidedImaginationEvaluationResultType = z.infer<
  typeof guidedImaginationEvaluationResultSchema
>;

export const GUIDED_IMAGINATION_MAX_CHARACTERS = 320;

export const GUIDED_IMAGINATION_SCORE_THRESHOLDS = {
  fidelity: 0.8,
  readability: 0.75,
  compression: 0.7,
  overall: 0.78,
} as const;

const guidedImaginationFatalCriticismCodeSet = new Set<
  GuidedImaginationCriticismType[`code`]
>([
  `INVENTED_ASSOCIATION`,
  `REASONING_CHANGED`,
  `IMPORTANT_IDEA_MISSING`,
  `SUPPORTING_CUE_MISSING`,
  `ORDER_CHANGED`,
]);

function createGuidedImaginationCriticism(
  criticism: Omit<
    GuidedImaginationCriticismType,
    `cueConcept` | `stepIndex`
  > & {
    cueConcept?: string | null;
    stepIndex?: number | null;
  },
): GuidedImaginationCriticismType {
  return {
    cueConcept: null,
    stepIndex: null,
    ...criticism,
  };
}

function hasForbiddenGuidedImaginationFormatting(text: string): boolean {
  if (/```/u.test(text)) {
    return true;
  }

  if (/^#{1,6}\s+/mu.test(text)) {
    return true;
  }

  if (/(?:^|\n)\s*(?:[-*]\s+|\d+\.\s+)/u.test(text)) {
    return true;
  }

  return false;
}

function hasGuidedImaginationMetadataLeakage(text: string): boolean {
  return /\b(?:analysis|rationale|score|criticism|criticisms|fidelity|readability|compression)\s*:/iu.test(
    text,
  );
}

export function runGuidedImaginationDeterministicChecks(
  guidedImagination: string,
): GuidedImaginationDeterministicChecksType {
  const trimmed = guidedImagination.trim();
  const criticisms: GuidedImaginationCriticismType[] = [];

  if (trimmed.length === 0) {
    criticisms.push(
      createGuidedImaginationCriticism({
        severity: `major`,
        code: `EMPTY_OUTPUT`,
        section: `guided_imagination`,
        message: `Guided imagination must not be empty.`,
      }),
    );
  }

  if (trimmed.length > GUIDED_IMAGINATION_MAX_CHARACTERS) {
    criticisms.push(
      createGuidedImaginationCriticism({
        severity: `minor`,
        code: `TOO_VERBOSE`,
        section: `guided_imagination`,
        message: `Guided imagination is too long and should be shortened.`,
      }),
    );
  }

  if (/—/u.test(trimmed)) {
    criticisms.push(
      createGuidedImaginationCriticism({
        severity: `minor`,
        code: `EM_DASH_USED`,
        section: `guided_imagination`,
        message: `Guided imagination must not use an em dash.`,
      }),
    );
  }

  if (/\n\s*\n/u.test(trimmed)) {
    criticisms.push(
      createGuidedImaginationCriticism({
        severity: `minor`,
        code: `FORBIDDEN_FORMATTING`,
        section: `guided_imagination`,
        message: `Guided imagination should be a single short paragraph.`,
      }),
    );
  }

  if (hasForbiddenGuidedImaginationFormatting(trimmed)) {
    criticisms.push(
      createGuidedImaginationCriticism({
        severity: `minor`,
        code: `FORBIDDEN_FORMATTING`,
        section: `guided_imagination`,
        message: `Guided imagination must not contain markdown formatting.`,
      }),
    );
  }

  if (hasGuidedImaginationMetadataLeakage(trimmed)) {
    criticisms.push(
      createGuidedImaginationCriticism({
        severity: `major`,
        code: `METADATA_LEAKAGE`,
        section: `guided_imagination`,
        message: `Guided imagination must not include analysis metadata.`,
      }),
    );
  }

  return {
    passed: criticisms.length === 0,
    characterCount: trimmed.length,
    criticisms,
  };
}

function scoresMeetGuidedImaginationThresholds(
  evaluation: EvaluateGuidedImaginationPromptOutputType,
): boolean {
  return (
    evaluation.fidelityScore >= GUIDED_IMAGINATION_SCORE_THRESHOLDS.fidelity &&
    evaluation.readabilityScore >=
      GUIDED_IMAGINATION_SCORE_THRESHOLDS.readability &&
    evaluation.compressionScore >=
      GUIDED_IMAGINATION_SCORE_THRESHOLDS.compression &&
    evaluation.overallScore >= GUIDED_IMAGINATION_SCORE_THRESHOLDS.overall
  );
}

function hasFatalGuidedImaginationCriticisms(
  criticisms: GuidedImaginationCriticismType[],
): boolean {
  return criticisms.some(
    (criticism) =>
      criticism.severity === `major` &&
      guidedImaginationFatalCriticismCodeSet.has(criticism.code),
  );
}

export const buildThoughtChainFunnelPrompt = (
  entry: ThoughtChainFunnelPromptInputType,
): ChatPrompt<typeof thoughtChainFunnelPromptOutputSchema> => {
  const systemTemplate = `
You are given:

- A **target**: the final idea to remember.
- A list of **concepts**: component ideas that must appear in the final mnemonic.

Your task is to generate one high-quality thought funnel.

## Purpose

The funnel must help a learner remember the target while preserving the strongest natural route to the target.

The route does not need equal contribution from every concept.

One concept may carry most of the semantic route.

Other concepts may contribute mainly as disambiguating cues.

Every supplied concept must still make an essential contribution through either:

- **semantic contribution**: it advances the route toward the target;
- **disambiguating contribution**: it makes the mnemonic more uniquely identifiable and distinguishes it from mnemonics using only some of the same concepts.

## Thought funnel structure

A thought funnel contains:

1. one \`backboneThoughtChain\`;
2. zero or more \`supportingCues\`.

The \`backboneThoughtChain\` is the main route.

It must begin with exactly one supplied concept and end exactly at the target.

Each supporting cue represents one remaining supplied concept.

Each supporting cue must include:

- \`concept\`: the exact supplied concept it represents;
- \`cueThoughtChain\`: a thought chain beginning with that exact concept;
- \`joinBackboneStepIndex\`: the index of the backbone step it joins.

The final thought of each \`cueThoughtChain\` must exactly match the thought at \`backboneThoughtChain[joinBackboneStepIndex]\`.

If there are N supplied concepts:

- choose one concept as the backbone root;
- create N − 1 supporting cues;
- create zero supporting cues when N = 1.

## Construction strategy

Use this order:

1. Find the strongest natural backbone route from one supplied concept to the target.
2. For every remaining supplied concept, attach it to the earliest natural and memorable point on the backbone.
3. Simplify the result by collapsing unnecessary intermediate thoughts into short elaborations where appropriate.

Do not weaken a strong backbone merely to make the supplied concepts contribute symmetrically.

Do not attach supporting cues as irrelevant background decoration.

Branches may differ substantially in length.

## Thoughts and elaborations

Each thought is a distinct cognitive step the learner must retrieve.

Each thought may optionally contain a short \`elaboration\`.

An elaboration adds imagery, context, or a familiar description to the current thought without creating another step in the chain.

For example, an elaboration may clarify how the learner should picture or interpret the current thought.

Use an elaboration when an intermediate idea helps make the next transition natural but does not deserve to become a separate cognitive hop.

Do not create separate thoughts for minor restatements, descriptive details, or bridge phrases that can be understood as part of the existing thought.

An elaboration must:

- be a short phrase, not a sentence;
- elaborate only the current thought;
- remain immediately understandable;
- avoid introducing an independent event or separate chain step;
- avoid mentioning the target merely to steer the chain toward it.

The learner should be able to read a thought with its elaboration as:

> thought (elaboration)

An elaboration must not hide a genuinely missing transition. If the learner would still need to retrieve a distinct intermediate idea, represent that idea as its own thought.

## Minimizing cognitive hops

Optimize for the fewest necessary cognitive hops, not merely the fewest words.

A cognitive hop occurs whenever the learner must retrieve a new thought.

Supporting detail inside an elaboration does not count as another hop.

Prefer:

> thought (short supporting detail) → next thought

over:

> thought → minor restatement → supporting detail → next thought

when the shorter form remains natural and easy to reconstruct.

Do not collapse steps so aggressively that the transition becomes surprising, forced, or dependent on an explanation.

## Transition quality

Every transition must be natural, familiar, and easy to reconstruct once shown.

Ask:

> “Would many English speakers readily understand why this thought follows?”

The next thought does not need to be the single most common spontaneous association, but it must be a strong and readily understandable association.

Common descriptions, familiar comparisons, and conventional relationships are allowed when they are immediate and memorable.

Do not choose a transition merely because it helps reach the target.

Do not use a relationship that only seems plausible after knowing the target.

Reject transitions that require:

- obscure knowledge;
- specialist facts;
- strained metaphors;
- elaborate interpretation;
- private symbolism;
- weak cultural stereotypes.

Prefer a short, clear route over a clever route.

## Global quality

Evaluate the funnel as a whole, not only one transition at a time.

The funnel should:

- include every supplied concept exactly once by role, either as the backbone root or as a supporting cue concept;
- preserve the strongest natural backbone route;
- use supporting cues that are meaningful and memorable;
- remain easy to mentally rehearse;
- minimize unnecessary cognitive hops;
- avoid unnecessary detours;
- avoid circling back to earlier thoughts;
- avoid restating the same idea as multiple thoughts;
- reach the target without disguising a definition as an association.

Do not optimize only for the smallest number of thoughts.

Prefer the smallest number of cognitive hops that still preserves natural transitions, concept distinctiveness, and memorability.

## Thought fields

Each thought should:

- be a short phrase;
- represent one clear idea;
- remain recognizable to a general English-speaking learner;
- avoid explanations;
- avoid abstract reasoning;
- avoid unnecessary repetition.

Concrete objects, actions, situations, and familiar ideas are preferred.

Each thought may include:

- \`thought\`: the main cognitive step;
- \`elaboration\`: an optional short phrase strengthening or clarifying that thought;
- \`because\`: an explanation of why the thought follows from the previous thought.

## Because fields

In the \`backboneThoughtChain\`:

- the first thought has no previous thought, so its \`because\` field must be \`null\`;
- every later thought must include one short \`because\` sentence explaining only why it follows from the previous thought.

In each \`cueThoughtChain\`:

- the first thought is the cue concept, so its \`because\` field must be \`null\`;
- every later thought must include one short \`because\` sentence explaining only why it follows from the previous thought.

A \`because\` sentence must:

- explain only one transition;
- be concise;
- accurately support the destination thought, including any meaning introduced by its wording;
- not justify the entire funnel;
- not refer to the target as the reason the transition was selected.

Do not smuggle unsupported meaning into a thought.

For example, if the explanation supports only a general object, the destination thought must not silently add an unsupported property such as intensity, temperature, emotion, or purpose.

The \`elaboration\` field may clarify the current thought, but the \`because\` field must still justify why that complete thought follows from the previous one.

## Counterfactual self-check

Before returning the funnel, perform the following checks.

### Concept removal

For each supplied concept:

1. mentally remove that concept and its route from the funnel;
2. ask whether the remaining mnemonic would still identify the target almost as well.

If yes, revise the funnel because that concept is not making a meaningful semantic or disambiguating contribution.

A supporting concept does not need to advance the target directly, but it must make the mnemonic more distinctive or memorable.

### Cue placement quality

For each supporting cue, ask:

- Does it join the backbone at a natural point?
- Is the joined thought genuinely supported by the cue?
- Does the cue add distinctiveness or recall value?
- Is the cue merely decorative?
- Could it join the backbone earlier and more simply?
- Has the backbone been weakened merely to accommodate it?

Revise weak or unnecessarily long cues.

### Cognitive-hop quality

For every thought, ask:

- Is this a distinct idea the learner needs to retrieve?
- Could it instead be a short elaboration of the preceding or following thought?
- Is it merely restating another thought?
- Does removing it preserve a natural transition?

Collapse unnecessary thoughts into elaborations when doing so reduces cognitive load without weakening recall.

### Elaboration quality

For every elaboration, ask:

- Does it clarify or strengthen the current thought?
- Is it short enough to process as part of that thought?
- Is it being used to conceal a missing cognitive step?
- Does it introduce information not justified by the preceding transition?

Convert an elaboration into its own thought when it represents a genuinely separate idea.

Remove it when it adds clutter without improving the transition.

### Transition quality

For every transition, ask:

- Is the relationship readily understandable?
- Does the \`because\` sentence justify the complete destination thought?
- Has an obvious intermediate idea been skipped?
- Was this step selected mainly to steer toward the target?
- Is it merely a restatement of the previous thought?
- Would the transition remain understandable without reading a long explanation?

Revise weak transitions.

## Final verification

Before returning the funnel, verify:

- the \`backboneThoughtChain\` begins with exactly one supplied concept;
- the \`backboneThoughtChain\` ends exactly at the target;
- each remaining supplied concept appears as exactly one supporting cue;
- each \`cueThoughtChain\` begins with its exact supplied concept;
- each \`cueThoughtChain\` ends exactly at its joined backbone thought;
- every \`joinBackboneStepIndex\` identifies a valid backbone step;
- every concept makes a semantic or disambiguating contribution;
- no concept is merely decorative;
- each thought represents a necessary cognitive hop;
- minor supporting details are expressed as elaborations rather than unnecessary thoughts;
- no elaboration conceals a missing transition;
- every \`because\` sentence supports the full destination thought;
- all transitions are natural and readily understandable;
- the funnel is concise enough to remember;
- the backbone remains the strongest available route.

If no completely natural funnel can satisfy every requirement, return the strongest available funnel, but do not conceal weak transitions using vague explanations or overloaded elaborations.
`.trim();

  const userTemplate = `
Generate a thought funnel for the following input:

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
    schema: thoughtChainFunnelPromptOutputSchema,
  };
};

export const buildGuidedImaginationPrompt = (
  entry: GuidedImaginationPromptInputType,
): ChatPrompt<typeof guidedImaginationPromptOutputSchema> => {
  const systemTemplate = `
You are given a mnemonic thought funnel and must render it as a guided imagination.

The thought funnel is the source of truth.

Your output must be a concise natural-language walkthrough of that exact funnel.

## Task

Convert the provided thought funnel into a short guided imagination that a learner can mentally replay.

The guided imagination is not a new mnemonic.

It must preserve the same mental progression while sounding natural and easy to remember.

## Fidelity

Do not invent new associations.

Do not change the reasoning.

Do not change the backbone order.

Do not introduce unrelated people, objects, events, or imagery.

Supporting cues should be woven in naturally around the point where each cue joins the backbone.

## Compression

You may omit intermediate thoughts only when:

- the omitted thought is easily recoverable;
- the transition remains natural;
- the same overall progression is preserved;
- compression makes replay shorter and easier.

Do not omit a thought when that creates a surprising leap or changes the mnemonic logic.

The goal is the shortest guided imagination that preserves important inferences and contributions.

## Elaborations

Thought elaborations may be incorporated naturally into prose.

Do not turn elaborations into unnecessary extra steps.

Do not use elaborations to introduce unsupported meaning.

## Voice and style

Use simple conversational English.

Sound calm, confident, and matter-of-fact.

Use concrete imagery rather than poetic imagery.

Usually produce one short paragraph of one to three sentences.

Keep it as short as possible while preserving the important progression.

Avoid:

- em dashes;
- flowery or dramatic prose;
- dialogue;
- excessive scene setting;
- unnecessary adjectives;
- repeated descriptions of the same idea;
- awkward phrases like "also brings in";
- phrasing that implies unsupported literal transformation;
- explanations of mnemonic theory;
- rhetorical flourishes.
`.trim();

  const userTemplate = `
Convert the following mnemonic representation into a guided imagination.

<input>
{{ input }}
</input>
`.trim();

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        input: JSON.stringify(entry, null, 2),
      }),
    },
  ];

  return {
    messages,
    model: `gpt-5.4`,
    reasoningEffort: `low`,
    schema: guidedImaginationPromptOutputSchema,
  };
};

export const buildEvaluateGuidedImaginationPrompt = (
  entry: EvaluateGuidedImaginationPromptInputType,
): ChatPrompt<typeof evaluateGuidedImaginationPromptOutputSchema> => {
  const systemTemplate = `
You are evaluating a guided imagination rendered from a source thought funnel.

You are not rewriting the guided imagination.

You are not proposing alternative prose.

## Inputs

You receive:

- target;
- concepts;
- source thought funnel;
- guided imagination output.

## Goal

Decide whether the guided imagination preserves the mnemonic progression in a concise and natural learner-facing form.

Return scores and concise criticisms.

## Fidelity

The source thought funnel is the authority.

A high-fidelity rendering preserves:

- important backbone progression;
- meaningful supporting cues;
- the target;
- the core reasoning route.

It may compress recoverable details.

It must not invent associations, substitute reasoning, or reorder key progression.

Use these criticism codes when applicable:

- IMPORTANT_IDEA_MISSING
- SUPPORTING_CUE_MISSING
- INVENTED_ASSOCIATION
- REASONING_CHANGED
- ORDER_CHANGED

## Readability

The guided imagination should sound natural when spoken, concise, and easy to follow.

It should feel like guided imagination, not a graph dump.

Penalize awkward wording, unclear transitions, repeated phrasing, and heavy literary style.

Use these codes when applicable:

- AWKWARD_LANGUAGE
- UNCLEAR_TRANSITION
- REPEATED_IDEA
- OVERLY_CREATIVE_RENDERING

## Compression

Good compression removes unnecessary cognitive hops while preserving reconstructability.

Penalize:

- OVERCOMPRESSED when key inference is lost;
- UNDERCOMPRESSED when graph mechanics are verbalized too literally;
- TOO_VERBOSE when prose adds no mnemonic value;
- OVERLY_LITERAL_RENDERING when every node is mechanically narrated.

Do not reward brevity when fidelity is damaged.

## Scoring

Return scores from 0.0 to 1.0 for:

- fidelityScore
- readabilityScore
- compressionScore
- overallScore

Overall should reflect whether a learner who already studied the funnel could use this output to reactivate roughly the same progression.

## Criticisms

Only include genuine defects.

Each criticism must use one of the allowed codes and contain one concise defect sentence.

Set section to guided_imagination, backbone, cue, or funnel.

Set cueConcept and stepIndex when clearly applicable, otherwise null.

If no specific code fits, use OTHER.
`.trim();

  const userTemplate = `
Evaluate the following guided imagination.

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
    schema: evaluateGuidedImaginationPromptOutputSchema,
  };
};

export const evaluateThoughtChainFunnelPromptInputSchema = z.object({
  target: z.string(),
  concepts: z.array(z.string()).min(1),
  thoughtFunnel: thoughtChainFunnelSchema,
});

export type EvaluateThoughtChainFunnelPromptInputType = z.infer<
  typeof evaluateThoughtChainFunnelPromptInputSchema
>;

export const thoughtChainFunnelCriticismSchema = z.object({
  severity: z.enum([`minor`, `major`]),
  code: z.enum([
    `WEAK_TRANSITION`,
    `MISSING_INTERMEDIATE_STEP`,
    `TARGET_FORCING`,
    `CONCEPT_COVERAGE_MISSING`,
    `BACKBONE_ROOT_MISMATCH`,
    `CUE_ROOT_MISMATCH`,
    `INVALID_JOIN_INDEX`,
    `CUE_JOIN_MISMATCH`,
    `CONCEPT_REINTERPRETED`,
    `SEMANTIC_ERROR`,
    `REDUNDANT_STEP`,
    `FUNNEL_TOO_LONG`,
    `TARGET_NOT_REACHED`,
    `OTHER`,
  ]),
  message: z.string(),
  section: z.enum([`cue`, `backbone`, `funnel`]),
  cueConcept: z.string().nullable(),
  stepIndex: z.number().nullable(),
});

export type ThoughtChainFunnelCriticismType = z.infer<
  typeof thoughtChainFunnelCriticismSchema
>;

export const evaluateThoughtChainFunnelPromptOutputSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  criticisms: z.array(thoughtChainFunnelCriticismSchema),
});

export type EvaluateThoughtChainFunnelPromptOutputType = z.infer<
  typeof evaluateThoughtChainFunnelPromptOutputSchema
>;

export const buildEvaluateThoughtChainFunnelPrompt = (
  entry: EvaluateThoughtChainFunnelPromptInputType,
): ChatPrompt<typeof evaluateThoughtChainFunnelPromptOutputSchema> => {
  const systemTemplate = `
You are evaluating the quality of a thought funnel.

A thought funnel contains one \`backboneThoughtChain\` and zero or more \`supportingCues\`.

You are not rewriting the funnel.

Your job is to determine whether the funnel would be easy for a learner to understand, mentally rehearse, and later recall.

## Structural requirements

The \`backboneThoughtChain\` must begin with exactly one supplied concept.

The \`backboneThoughtChain\` must end exactly at the target.

Every supplied concept not used as the backbone root must appear as exactly one supporting cue concept.

Each supporting cue must begin with that exact cue concept.

Each supporting cue has \`joinBackboneStepIndex\`.

\`joinBackboneStepIndex\` must reference a valid index in \`backboneThoughtChain\`.

The final thought of each \`cueThoughtChain\` must exactly match \`backboneThoughtChain[joinBackboneStepIndex].thought\`.

If concept coverage is missing or duplicated, use \`CONCEPT_COVERAGE_MISSING\`.

If the backbone root is not an exact supplied concept, use \`BACKBONE_ROOT_MISMATCH\`.

If a cue root is not an exact cue concept, use \`CUE_ROOT_MISMATCH\`.

If \`joinBackboneStepIndex\` is invalid, use \`INVALID_JOIN_INDEX\`.

If a cue does not end at its joined backbone thought, use \`CUE_JOIN_MISMATCH\`.

If the backbone does not end exactly at the target, use \`TARGET_NOT_REACHED\`.

## Contribution

Every supplied concept must make an essential contribution.

A concept may contribute by:

- advancing the semantic route toward the target; or
- making the mnemonic more distinctive and memorable.

Do not require every concept to contribute equally.

Do not penalize a supporting cue simply because it mainly serves as a disambiguating cue.

However, if removing a concept would leave the mnemonic essentially unchanged, that concept is not contributing enough.

Treat decorative, generic, or irrelevant concepts as a weakness.

## Transition quality

Evaluate transitions from the learner's perspective.

Ask:

> "Would this transition feel natural and easy to reconstruct after seeing it once?"

The transition does **not** need to be the single most common spontaneous association.

It should instead be:

- familiar,
- understandable,
- easy to mentally reconstruct,
- and not dependent on obscure knowledge.

Do not penalize a transition simply because several other reasonable associations also exist.

Reject transitions that rely on:

- obscure facts;
- strained metaphors;
- elaborate interpretation;
- hidden assumptions;
- target-driven reasoning.

## Thoughts and elaborations

Each thought represents one cognitive step.

A thought may include an optional \`elaboration\`.

An elaboration strengthens or clarifies the current thought.

It is **not** another thought.

Do not treat a useful elaboration as an unnecessary extra step.

However, if an elaboration introduces a genuinely new concept that the learner would have to retrieve separately, it should have been represented as its own thought.

Likewise, if a separate thought merely restates or elaborates the previous thought, it should probably have been an elaboration instead.

## Cognitive hops

Evaluate the number of cognitive hops rather than simply counting thoughts.

Prefer funnels that:

- minimise unnecessary cognitive hops;
- avoid restating the same idea;
- keep genuinely distinct ideas as separate thoughts.

Do not criticise a funnel for having more thoughts if every thought is necessary.

Do not reward an overly short funnel if it skips important intermediate ideas.

## Because fields

Every \`because\` sentence should justify only one transition.

The explanation should fully support the destination thought.

Watch carefully for "smuggled meaning."

For example, if the explanation only justifies "sun", then the destination thought should not suddenly become "hot sun" unless the added idea is separately justified or provided as an elaboration.

Likewise, if the explanation only supports "metal", the destination thought should not become "molten metal" without supporting that additional meaning.

## Global quality

Evaluate the mnemonic as a whole.

Ask:

- Is the backbone still the strongest natural route?
- Do the supporting cues strengthen the mnemonic?
- Does every concept matter?
- Would a learner probably remember this after studying it?
- Are there unnecessary detours?
- Does the funnel rely on definitions disguised as associations?

Judge the overall mnemonic rather than isolated transitions.

## Score

Return a score between 0.0 and 1.0.

Use the following guidance:

- 1.0 — Excellent. Natural, memorable, structurally correct, and easy to mentally rehearse.
- 0.8 — Strong overall with only minor weaknesses.
- 0.6 — Generally understandable but contains noticeable issues.
- 0.4 — Multiple weak or forced transitions that reduce memorability.
- 0.2 — Mostly unnatural, confusing, or structurally broken.
- 0.0 — Fundamentally unusable.

## Criticisms

Only report genuine weaknesses.

Do not invent criticisms simply because perfection is unlikely.

Each criticism should:

- identify one concrete issue;
- use the most appropriate criticism code;
- set \`section\` to \`backbone\`, \`cue\`, or \`funnel\`;
- set \`cueConcept\` when applicable;
- include the step index where the issue begins when appropriate;
- explain the issue in one concise sentence.

Prefer fewer high-quality criticisms over many minor observations.

Do not suggest improvements.

Do not rewrite the funnel.
`.trim();

  const userTemplate = `
Evaluate the following thought funnel.

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
    schema: evaluateThoughtChainFunnelPromptOutputSchema,
  };
};

export const refineThoughtChainFunnelPromptInputSchema = z.object({
  target: z.string(),
  concepts: z.array(z.string()).min(1),
  thoughtFunnel: thoughtChainFunnelSchema,
  criticisms: z.array(thoughtChainFunnelCriticismSchema),
});

export type RefineThoughtChainFunnelPromptInputType = z.infer<
  typeof refineThoughtChainFunnelPromptInputSchema
>;

export const refineThoughtChainFunnelPromptOutputSchema = z.object({
  thoughtFunnel: thoughtChainFunnelSchema,
});

export type RefineThoughtChainFunnelPromptOutputType = z.infer<
  typeof refineThoughtChainFunnelPromptOutputSchema
>;

export const thoughtChainFunnelRefinementStopReasonSchema = z.enum([
  `no_major_criticisms`,
  `max_attempts_reached`,
]);

export type ThoughtChainFunnelRefinementStopReasonType = z.infer<
  typeof thoughtChainFunnelRefinementStopReasonSchema
>;

export const thoughtChainFunnelRefinementAttemptSchema = z.object({
  attempt: z.number().int().min(1),
  thoughtFunnel: thoughtChainFunnelSchema,
  evaluation: evaluateThoughtChainFunnelPromptOutputSchema,
});

export type ThoughtChainFunnelRefinementAttemptType = z.infer<
  typeof thoughtChainFunnelRefinementAttemptSchema
>;

export const thoughtChainFunnelRefinementResultSchema = z.object({
  attempts: z.array(thoughtChainFunnelRefinementAttemptSchema),
  succeeded: z.boolean(),
  stopReason: thoughtChainFunnelRefinementStopReasonSchema,
  finalThoughtFunnel: thoughtChainFunnelSchema,
  finalEvaluation: evaluateThoughtChainFunnelPromptOutputSchema,
});

export type ThoughtChainFunnelRefinementResultType = z.infer<
  typeof thoughtChainFunnelRefinementResultSchema
>;

export const buildRefineThoughtChainFunnelPrompt = (
  entry: RefineThoughtChainFunnelPromptInputType,
): ChatPrompt<typeof refineThoughtChainFunnelPromptOutputSchema> => {
  const systemTemplate = `
You revise thought funnels based on evaluator criticisms.

You are given:

- a target;
- a list of supplied concepts;
- the current thought funnel;
- an evaluation containing criticisms.

Your task is to improve the funnel while preserving as much of its existing quality as possible.

The evaluation is guidance, not ground truth.

If a criticism is incorrect or conflicts with a stronger overall mnemonic, ignore it.

## Overall objective

Produce the strongest mnemonic for remembering the target.

The backbone should remain the strongest natural route to the target.

Supporting cues should strengthen the mnemonic without weakening the backbone.

Do not make large changes merely to satisfy every criticism.

Prefer the smallest changes that produce the largest improvement.

## Structural rules

The \`backboneThoughtChain\` must:

- begin with exactly one supplied concept;
- end exactly at the target.

Every remaining supplied concept must appear as exactly one supporting cue.

Each supporting cue must:

- begin with its exact supplied concept;
- contain a valid \`joinBackboneStepIndex\`;
- end exactly at the joined backbone thought.

Do not duplicate supplied concepts.

Do not omit supplied concepts.

## Preserving good structure

Treat the existing funnel as the starting point.

Preserve strong routes whenever possible.

Do not replace an excellent backbone merely because a supporting cue could be slightly improved.

Do not introduce symmetry unless it genuinely improves the mnemonic.

Supporting cues may differ substantially in length.

## Contributions

Every supplied concept must make an essential contribution.

A concept may contribute by:

- advancing the semantic route toward the target;
- making the mnemonic more distinctive and memorable.

Supporting cues are not required to contribute equally to the semantic route.

However, they must not be decorative.

Removing a supporting cue should noticeably weaken the mnemonic's distinctiveness or memorability.

## Thoughts and elaborations

Each thought represents one cognitive step.

A thought may include an optional \`elaboration\`.

An elaboration strengthens or clarifies the current thought.

It is not another thought.

When refining:

- remove unnecessary thoughts that merely elaborate an adjacent thought;
- replace them with an elaboration when this reduces cognitive hops without weakening recall;
- create a separate thought only when the learner must retrieve a genuinely new idea.

Do not use elaborations to hide missing transitions.

## Minimizing cognitive hops

Prefer the fewest cognitive hops that preserve:

- natural transitions;
- concept distinctiveness;
- memorability.

Do not remove intermediate thoughts that are genuinely needed.

Do not keep intermediate thoughts that merely restate another thought.

## Transition quality

Every transition should be:

- natural;
- familiar;
- easy to mentally reconstruct;
- understandable after seeing it once.

The transition does not need to be the single strongest possible association.

Do not introduce:

- obscure facts;
- strained metaphors;
- hidden assumptions;
- target-driven reasoning.

Prefer a short, memorable route over a clever one.

## Because fields

The first backbone thought must have \`because = null\`.

The first thought of every supporting cue must have \`because = null\`.

Every later thought must contain a short \`because\` sentence explaining only why it follows from the previous thought.

A \`because\` sentence must fully justify the destination thought.

Do not smuggle additional meaning into a thought that is not supported by its explanation.

If extra context is useful but does not deserve another thought, use an \`elaboration\` instead.

## Responding to criticisms

Address every valid criticism when practical.

When multiple criticisms conflict, prioritise:

1. preserving the strongest mnemonic;
2. preserving a strong backbone;
3. preserving natural transitions;
4. resolving remaining criticisms.

If fixing one criticism would substantially weaken the overall mnemonic, prefer the stronger mnemonic.

## Before returning

Verify:

- every supplied concept is represented exactly once;
- the backbone remains the strongest available route;
- supporting cues strengthen rather than distract;
- every thought represents a necessary cognitive hop;
- unnecessary thoughts have become elaborations where appropriate;
- no elaboration hides a missing transition;
- every \`because\` fully supports the destination thought;
- no concept is merely decorative;
- all transitions are natural and memorable;
- the target is reached exactly.

Return only the revised thought funnel.
`.trim();

  const userTemplate = `
Revise the following thought funnel based on the criticisms.

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
    schema: refineThoughtChainFunnelPromptOutputSchema,
  };
};

interface RunThoughtChainFunnelRefinementPipelineOptions {
  maxAttempts?: number;
  signal?: AbortSignal;
}

interface RunGuidedImaginationOptions {
  signal?: AbortSignal;
}

function hasMajorCriticisms(
  evaluation: EvaluateThoughtChainFunnelPromptOutputType,
): boolean {
  return evaluation.criticisms.some(
    (criticism) => criticism.severity === `major`,
  );
}

async function evaluateThoughtChainFunnel(
  entry: EvaluateThoughtChainFunnelPromptInputType,
  options: RunThoughtChainFunnelRefinementPipelineOptions,
): Promise<EvaluateThoughtChainFunnelPromptOutputType> {
  const response = await requestOpenAiResponseJson(
    buildEvaluateThoughtChainFunnelPrompt(entry),
    {
      signal: options.signal,
    },
  );

  return response.data;
}

async function evaluateGuidedImaginationWithModel(
  entry: EvaluateGuidedImaginationPromptInputType,
  options?: RunGuidedImaginationOptions,
): Promise<EvaluateGuidedImaginationPromptOutputType> {
  const response = await requestOpenAiResponseJson(
    buildEvaluateGuidedImaginationPrompt(entry),
    {
      signal: options?.signal,
    },
  );

  return response.data;
}

export async function renderGuidedImagination(
  entry: GuidedImaginationPromptInputType,
  options?: RunGuidedImaginationOptions,
): Promise<GuidedImaginationPromptOutputType> {
  const response = await requestOpenAiResponseJson(
    buildGuidedImaginationPrompt(entry),
    {
      signal: options?.signal,
    },
  );

  return response.data;
}

export async function evaluateGuidedImagination(
  entry: EvaluateGuidedImaginationPromptInputType,
  options?: RunGuidedImaginationOptions,
): Promise<GuidedImaginationEvaluationResultType> {
  const [modelEvaluation, deterministicChecks] = await Promise.all([
    evaluateGuidedImaginationWithModel(entry, options),
    Promise.resolve(
      runGuidedImaginationDeterministicChecks(entry.guidedImagination),
    ),
  ]);

  const criticisms = [
    ...modelEvaluation.criticisms,
    ...deterministicChecks.criticisms,
  ];

  const passed =
    deterministicChecks.passed &&
    scoresMeetGuidedImaginationThresholds(modelEvaluation) &&
    !hasFatalGuidedImaginationCriticisms(criticisms);

  return {
    ...modelEvaluation,
    passed,
    criticisms,
    deterministicChecks,
  };
}

export async function runThoughtChainFunnelRefinementPipeline(
  entry: ThoughtChainFunnelPromptInputType,
  options?: RunThoughtChainFunnelRefinementPipelineOptions,
): Promise<ThoughtChainFunnelRefinementResultType> {
  const maxAttempts = options?.maxAttempts ?? 3;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error(
      `maxAttempts must be an integer greater than or equal to 1`,
    );
  }

  const attempts: ThoughtChainFunnelRefinementAttemptType[] = [];

  const initialResponse = await requestOpenAiResponseJson(
    buildThoughtChainFunnelPrompt(entry),
    {
      signal: options?.signal,
    },
  );

  let thoughtFunnel = initialResponse.data.thoughtFunnel;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const evaluation = await evaluateThoughtChainFunnel(
      {
        target: entry.target,
        concepts: entry.concepts,
        thoughtFunnel,
      },
      { signal: options?.signal, maxAttempts },
    );

    attempts.push({
      attempt,
      thoughtFunnel,
      evaluation,
    });

    if (!hasMajorCriticisms(evaluation)) {
      return {
        attempts,
        succeeded: true,
        stopReason: `no_major_criticisms`,
        finalThoughtFunnel: thoughtFunnel,
        finalEvaluation: evaluation,
      };
    }

    if (attempt === maxAttempts) {
      return {
        attempts,
        succeeded: false,
        stopReason: `max_attempts_reached`,
        finalThoughtFunnel: thoughtFunnel,
        finalEvaluation: evaluation,
      };
    }

    const refinedResponse = await requestOpenAiResponseJson(
      buildRefineThoughtChainFunnelPrompt({
        target: entry.target,
        concepts: entry.concepts,
        thoughtFunnel,
        criticisms: evaluation.criticisms,
      }),
      {
        signal: options?.signal,
      },
    );

    thoughtFunnel = refinedResponse.data.thoughtFunnel;
  }

  throw new Error(`Unexpected pipeline state`);
}
