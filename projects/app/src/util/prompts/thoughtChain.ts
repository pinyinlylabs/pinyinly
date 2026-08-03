import type { ChatPrompt, ChatPromptMessage } from "@/server/lib/ai";
import { requestOpenAiResponseJson } from "@/server/lib/ai";
import { renderPromptTemplate } from "@/util/prompts/shared";
import { z } from "zod";

export const thoughtChainPromptInputSchema = z.object({
  target: z.string(),
  concepts: z.array(z.string()),
  maxCount: z
    .number()
    .optional()
    .describe(`Maximum number of chains to generate.`),
});

export type ThoughtChainPromptInputType = z.infer<
  typeof thoughtChainPromptInputSchema
>;

export const thoughtChainSchema = z.array(
  z.object({
    thought: z.string(),
    because: z.string().nullable(),
  }),
);

export const thoughtChainPromptOutputSchema = z.object({
  thoughtChains: z.array(thoughtChainSchema),
});

export type ThoughtChainPromptOutputType = z.infer<
  typeof thoughtChainPromptOutputSchema
>;

export const buildThoughtChainPrompt = (
  entry: ThoughtChainPromptInputType,
): ChatPrompt<typeof thoughtChainPromptOutputSchema> => {
  const systemTemplate = `
  You are given:

- A **target**: the final idea to reach.
- A list of **concepts**: the starting ideas.

Each concept may contain multiple equivalent words or phrases separated by semicolons (\`;\`). These are alternative expressions of the same concept, not different concepts. Choose whichever wording creates the strongest immediate associations.

Your task is to generate **one** high-quality thought chain.

## Thought chains

A thought chain is a sequence of immediate thoughts that begins with one of the supplied concepts and ends at the target.

Each thought should answer only one question:

> "What's the first thing that comes to mind?"

Each step should feel immediate.

If someone would pause to ask "Why?", the jump is too large.

Prefer several small, obvious steps over one clever step.

The chain should be discovered greedily:

- Ignore the target when choosing the next thought.
- Always choose the strongest immediate association.
- Only after the chain has naturally developed should you verify that it reaches the target.

Do not skip over the supplied concept that begins the chain.

If the first inferred thought comes from a supplied concept, include the supplied concept itself as the first thought.

Do not begin with an inferred association.

Every inferred thought should appear as its own explicit step.

## Concepts

The supplied concepts should remain recognizable.

Do not reinterpret them into different meanings simply because they are more convenient.

Use whichever supplied concept leads to the strongest thought chain.

Other supplied concepts do not need to appear in the thought chain if they do not naturally contribute.

## Thoughts

Each thought should:

- be a short phrase,
- represent a single concept,
- avoid explanations,
- avoid metaphors,
- avoid symbolism,
- avoid abstract reasoning.

Prefer concrete concepts and actions.

Avoid repeating thoughts.

The final thought must exactly match the target.

## Explanations

Every thought after the first should include a \`because\` field explaining why it immediately follows from the previous thought.

Each explanation should:

- explain only that single transition,
- be one short sentence,
- describe an immediate, common association,
- not justify the overall chain.

The first thought has no previous thought, so it must not include a \`because\` field.

## Self-check

Before returning the chain, verify:

- Every transition feels immediate.
- Many English speakers would naturally make each association.
- No step was chosen simply because it helps reach the target.
- No obvious intermediate thought has been skipped.
- The chain ends exactly at the target.

If any transition feels forced, revise the chain before returning it.
`.trim();

  const userTemplate = `
Generate thought chain results for the following input:

<data>
{{ data }}
</data>
`.trim();

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        data: JSON.stringify(entry),
      }),
    },
  ];

  return {
    messages,
    model: `gpt-5.4`,
    reasoningEffort: `low`,
    schema: thoughtChainPromptOutputSchema,
  };
};

export const evaluateThoughtChainConceptUsagePromptInputSchema = z.object({
  target: z.string(),
  concepts: z.array(z.string()),
  thoughtChain: thoughtChainSchema,
});

export type EvaluateThoughtChainConceptUsagePromptInputType = z.infer<
  typeof evaluateThoughtChainConceptUsagePromptInputSchema
>;

export const thoughtChainCriticismSchema = z.object({
  severity: z.enum([`minor`, `major`]),
  code: z.enum([
    `WEAK_TRANSITION`,
    `MISSING_INTERMEDIATE_STEP`,
    `TARGET_FORCING`,
    `CONCEPT_MISSING`,
    `CONCEPT_REINTERPRETED`,
    `SEMANTIC_ERROR`,
    `REDUNDANT_STEP`,
    `CHAIN_TOO_LONG`,
    `TARGET_NOT_REACHED`,
    `OTHER`,
  ]),
  message: z.string(),
  stepIndex: z.number().nullable(),
});

export const evaluateThoughtChainConceptUsagePromptOutputSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  criticisms: z.array(thoughtChainCriticismSchema),
});

export type EvaluateThoughtChainConceptUsagePromptOutputType = z.infer<
  typeof evaluateThoughtChainConceptUsagePromptOutputSchema
>;

export const refineThoughtChainPromptInputSchema = z.object({
  target: z.string(),
  concepts: z.array(z.string()),
  thoughtChain: thoughtChainSchema,
  criticisms: z.array(thoughtChainCriticismSchema),
});

export type RefineThoughtChainPromptInputType = z.infer<
  typeof refineThoughtChainPromptInputSchema
>;

export const refineThoughtChainPromptOutputSchema = z.object({
  thoughtChain: thoughtChainSchema,
});

export type RefineThoughtChainPromptOutputType = z.infer<
  typeof refineThoughtChainPromptOutputSchema
>;

export const thoughtChainRefinementStopReasonSchema = z.enum([
  `no_major_criticisms`,
  `max_attempts_reached`,
]);

export type ThoughtChainRefinementStopReasonType = z.infer<
  typeof thoughtChainRefinementStopReasonSchema
>;

export const thoughtChainRefinementAttemptSchema = z.object({
  attempt: z.number().int().min(1),
  thoughtChain: thoughtChainSchema,
  evaluation: evaluateThoughtChainConceptUsagePromptOutputSchema,
});

export type ThoughtChainRefinementAttemptType = z.infer<
  typeof thoughtChainRefinementAttemptSchema
>;

export const thoughtChainRefinementResultSchema = z.object({
  attempts: z.array(thoughtChainRefinementAttemptSchema),
  succeeded: z.boolean(),
  stopReason: thoughtChainRefinementStopReasonSchema,
  finalThoughtChain: thoughtChainSchema,
  finalEvaluation: evaluateThoughtChainConceptUsagePromptOutputSchema,
});

export type ThoughtChainRefinementResultType = z.infer<
  typeof thoughtChainRefinementResultSchema
>;

export const buildEvaluateThoughtChainConceptUsagePrompt = (
  entry: EvaluateThoughtChainConceptUsagePromptInputType,
): ChatPrompt<typeof evaluateThoughtChainConceptUsagePromptOutputSchema> => {
  const systemTemplate = `
You are evaluating the quality of a thought chain.

A thought chain is a sequence of immediate thoughts that begins with one of the supplied concepts and ends at the target.

Your task is to critically evaluate the thought chain.

You are **not** trying to improve it or rewrite it.

You are **not** judging whether the final answer is correct.

You are judging whether the thought chain represents a natural sequence of immediate thoughts.

## Immediate associations

Each transition should answer only one question:

> "What's the first thing that comes to mind?"

Every transition should feel immediate.

If someone would naturally pause to ask "Why?", the transition is too weak.

Prefer several small, obvious steps over one clever step.

A chain should feel as though each thought naturally caused the next thought to arise.

## Concepts

The supplied concepts should retain their intended meanings.

Every supplied concept must be used somewhere in the thought chain.

If one or more supplied concepts are unused, this should be treated as a major issue.

Do not reinterpret a supplied concept into a different meaning simply because it creates a better route.

## Evaluation

Be skeptical.

Do not reward a chain simply because it eventually reaches the target.

Evaluate every transition independently before considering the chain as a whole.

A single weak transition should significantly reduce the score.

Look for issues such as:

- weak or unnatural transitions,
- skipped intermediate thoughts,
- target-driven reasoning,
- missing use of one or more supplied concepts,
- reinterpreting supplied concepts,
- semantic mistakes,
- unnecessary or redundant thoughts,
- chains that are longer than necessary.

## Score

Return a score between **0.0** and **1.0**.

Use the following guidance:

- **1.0** — Every transition is immediate, natural, concise and memorable.
- **0.8** — Good overall, with only minor weaknesses.
- **0.6** — Understandable, but contains noticeable weaknesses.
- **0.4** — Multiple weak or forced transitions.
- **0.2** — Mostly unnatural or difficult to follow.
- **0.0** — Completely unusable.

## Criticisms

Only include criticisms for genuine weaknesses.

Each criticism should:

- identify a specific issue,
- use the most appropriate criticism code,
- use CONCEPT_MISSING with major severity when any supplied concept is not used,
- include the index of the thought where the problem begins when applicable,
- explain the issue in one concise sentence.

Avoid generic feedback.

Do not suggest improvements.

Do not rewrite the chain.
`.trim();

  const userTemplate = `
Evaluate the following thought chain.

<data>
{{ data }}
</data>
`.trim();

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        data: JSON.stringify(entry),
      }),
    },
  ];

  return {
    messages,
    model: `gpt-5.4`,
    reasoningEffort: `low`,
    schema: evaluateThoughtChainConceptUsagePromptOutputSchema,
  };
};

export const buildRefineThoughtChainPrompt = (
  entry: RefineThoughtChainPromptInputType,
): ChatPrompt<typeof refineThoughtChainPromptOutputSchema> => {
  const systemTemplate = `
You revise thought chains based on evaluator criticisms.

You are given:

- target,
- concepts,
- the current thought chain,
- a list of criticisms.

Return one revised thought chain that resolves as many criticisms as possible while preserving natural immediate associations.

Rules:

- The first thought must exactly match one supplied concept.
- The final thought must exactly match the target.
- Every step after the first must include a short because explanation.
- Keep thoughts concise and concrete.
- Use immediate associations only; avoid big jumps.
- Remove redundant or unnecessary steps.
- If a criticism points to a specific step, address that step directly.

Do not include analysis. Return only the revised thought chain.
`.trim();

  const userTemplate = `
Revise the following thought chain based on the criticisms.

<data>
{{ data }}
</data>
`.trim();

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        data: JSON.stringify(entry),
      }),
    },
  ];

  return {
    messages,
    model: `gpt-5.4`,
    reasoningEffort: `low`,
    schema: refineThoughtChainPromptOutputSchema,
  };
};

interface RunThoughtChainRefinementPipelineOptions {
  maxAttempts?: number;
  signal?: AbortSignal;
}

function hasMajorCriticisms(
  evaluation: EvaluateThoughtChainConceptUsagePromptOutputType,
): boolean {
  return evaluation.criticisms.some(
    (criticism) => criticism.severity === `major`,
  );
}

async function evaluateThoughtChain(
  entry: EvaluateThoughtChainConceptUsagePromptInputType,
  options: RunThoughtChainRefinementPipelineOptions,
): Promise<EvaluateThoughtChainConceptUsagePromptOutputType> {
  const response = await requestOpenAiResponseJson(
    buildEvaluateThoughtChainConceptUsagePrompt(entry),
    {
      signal: options.signal,
    },
  );

  return response.data;
}

export async function runThoughtChainRefinementPipeline(
  entry: ThoughtChainPromptInputType,
  options?: RunThoughtChainRefinementPipelineOptions,
): Promise<ThoughtChainRefinementResultType> {
  const maxAttempts = options?.maxAttempts ?? 3;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error(
      `maxAttempts must be an integer greater than or equal to 1`,
    );
  }

  const attempts: ThoughtChainRefinementAttemptType[] = [];

  const initialResponse = await requestOpenAiResponseJson(
    buildThoughtChainPrompt({ ...entry, maxCount: 1 }),
    {
      signal: options?.signal,
    },
  );

  const initialThoughtChain = initialResponse.data.thoughtChains[0];
  if (initialThoughtChain == null) {
    throw new Error(`Expected at least one generated thought chain`);
  }

  let thoughtChain: ThoughtChainPromptOutputType[`thoughtChains`][number] =
    initialThoughtChain;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const evaluation = await evaluateThoughtChain(
      {
        target: entry.target,
        concepts: entry.concepts,
        thoughtChain,
      },
      { signal: options?.signal, maxAttempts },
    );

    attempts.push({
      attempt,
      thoughtChain,
      evaluation,
    });

    if (!hasMajorCriticisms(evaluation)) {
      return {
        attempts,
        succeeded: true,
        stopReason: `no_major_criticisms`,
        finalThoughtChain: thoughtChain,
        finalEvaluation: evaluation,
      };
    }

    if (attempt === maxAttempts) {
      return {
        attempts,
        succeeded: false,
        stopReason: `max_attempts_reached`,
        finalThoughtChain: thoughtChain,
        finalEvaluation: evaluation,
      };
    }

    const refinePrompt = buildRefineThoughtChainPrompt({
      target: entry.target,
      concepts: entry.concepts,
      thoughtChain,
      criticisms: evaluation.criticisms,
    });

    const refinedResponse = await requestOpenAiResponseJson(refinePrompt, {
      signal: options?.signal,
    });

    thoughtChain = refinedResponse.data.thoughtChain;
  }

  throw new Error(`Unexpected pipeline state`);
}
