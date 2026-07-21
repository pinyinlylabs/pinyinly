import { createHarness, createJudge, describeEval } from "vitest-evals";
import type { JudgeContext } from "vitest-evals";
import type {
  EvaluateThoughtChainConceptUsagePromptOutputType,
  ThoughtChainRefinementResultType,
  ThoughtChainPromptInputType,
  ThoughtChainPromptOutputType,
} from "#util/prompts/thoughtChain.ts";
import {
  buildEvaluateThoughtChainConceptUsagePrompt,
  buildThoughtChainPrompt,
  runThoughtChainRefinementPipeline,
} from "#util/prompts/thoughtChain.ts";
import { createResponsePromptHarness } from "./eval.ts";

type ThoughtChainType = ThoughtChainPromptOutputType[`thoughtChains`][number];
type ThoughtChainCriticismType =
  EvaluateThoughtChainConceptUsagePromptOutputType[`criticisms`][number];

interface ExpectedCriticismType {
  code: ThoughtChainCriticismType[`code`];
  stepIndex?: number | null;
  severity?: ThoughtChainCriticismType[`severity`];
  messageIncludes?: string;
}

interface EvaluateThoughtChainConceptUsageCaseType {
  name: string;
  target: string;
  concepts: string[];
  chain: string;
  expect: ExpectedCriticismType[];
}

function parseArrowChain(chain: string): ThoughtChainType {
  const steps = chain
    .replaceAll(/\r\n?/gu, `\n`)
    .replaceAll(/[ \t]*(?:->|→|↓)[ \t]*/gu, `\n`)
    .split(`\n`)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (steps.length === 0) {
    throw new Error(`Thought chain must include at least one step`);
  }

  return steps.map((thought, index) => ({
    thought,
    because:
      index === 0
        ? null
        : `This is a common immediate association from the previous thought.`,
  }));
}

function criticismMatchesExpected(
  criticism: ThoughtChainCriticismType,
  expected: ExpectedCriticismType,
): boolean {
  if (criticism.code !== expected.code) {
    return false;
  }
  if (
    expected.stepIndex !== undefined &&
    criticism.stepIndex !== expected.stepIndex
  ) {
    return false;
  }
  if (
    expected.severity !== undefined &&
    criticism.severity !== expected.severity
  ) {
    return false;
  }
  if (
    expected.messageIncludes !== undefined &&
    !criticism.message.includes(expected.messageIncludes)
  ) {
    return false;
  }

  return true;
}

function formatCriticism(criticism: ThoughtChainCriticismType): string {
  return `[${criticism.severity}] ${criticism.code} index=${criticism.stepIndex} ${criticism.message}`;
}

function buildEvaluateThoughtChainCasePrompt(
  input: EvaluateThoughtChainConceptUsageCaseType,
) {
  return buildEvaluateThoughtChainConceptUsagePrompt({
    target: input.target,
    concepts: input.concepts,
    thoughtChain: parseArrowChain(input.chain),
  });
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

const BasicThoughtChainStructureJudge = createJudge(
  `BasicThoughtChainStructureJudge`,
  async ({
    input,
    output,
  }: JudgeContext<
    ThoughtChainPromptInputType,
    ThoughtChainPromptOutputType
  >) => {
    const thoughtChain = output.thoughtChains[0];
    if (thoughtChain == null || thoughtChain.length === 0) {
      return {
        score: 0,
        metadata: {
          rationale: `No thought chain was produced.`,
        },
      };
    }

    const firstThought = thoughtChain[0]?.thought;
    const lastThought = thoughtChain.at(-1)?.thought;

    const firstThoughtMatchesConcept =
      firstThought != null &&
      input.concepts.some(
        (concept) => normalizeText(concept) === normalizeText(firstThought),
      );
    const finalThoughtMatchesTarget =
      lastThought != null &&
      normalizeText(lastThought) === normalizeText(input.target);

    const checksPassed =
      Number(firstThoughtMatchesConcept) + Number(finalThoughtMatchesTarget);

    return {
      score: checksPassed / 2,
      metadata: {
        rationale: [
          firstThoughtMatchesConcept
            ? `First thought matches one supplied concept.`
            : `First thought does not match any supplied concept. first=${JSON.stringify(firstThought)} concepts=${JSON.stringify(input.concepts)}`,
          finalThoughtMatchesTarget
            ? `Final thought matches target.`
            : `Final thought does not match target. last=${JSON.stringify(lastThought)} target=${JSON.stringify(input.target)}`,
        ].join(`\n`),
      },
    };
  },
);

const thoughtChainCases: ThoughtChainPromptInputType[] = [
  { target: `to smelt`, concepts: [`fire`, `east`] },
  { target: `to freeze`, concepts: [`ice`, `east`] },
];

describeEval(
  `buildThoughtChainPrompt eval`,
  {
    harness: createResponsePromptHarness(buildThoughtChainPrompt),
    judges: [BasicThoughtChainStructureJudge],
  },
  (it) => {
    it.for(thoughtChainCases)(`$concepts → $target`, async (spec, { run }) => {
      await run({ ...spec, maxCount: 1 });
    });
  },
);

const thoughtChainPipelineCases: ThoughtChainPromptInputType[] = [
  { target: `to smelt`, concepts: [`fire`] },
  { target: `to freeze`, concepts: [`ice`, `east`] },
];

const ThoughtChainRefinementPipelineJudge = createJudge(
  `ThoughtChainRefinementPipelineJudge`,
  async ({
    output,
  }: JudgeContext<
    ThoughtChainPromptInputType,
    ThoughtChainRefinementResultType
  >) => {
    const majorCriticisms = output.finalEvaluation.criticisms.filter(
      (criticism) => criticism.severity === `major`,
    );
    const minorCriticisms = output.finalEvaluation.criticisms.filter(
      (criticism) => criticism.severity === `minor`,
    );

    const withinAttemptBudget = output.attempts.length <= 3;
    const noMajorCriticisms = majorCriticisms.length === 0;
    const score = withinAttemptBudget && noMajorCriticisms ? 1 : 0;

    const attemptSummaries = output.attempts.map((attempt) => {
      const majorCount = attempt.evaluation.criticisms.filter(
        (criticism) => criticism.severity === `major`,
      ).length;
      const minorCount = attempt.evaluation.criticisms.filter(
        (criticism) => criticism.severity === `minor`,
      ).length;

      return `- attempt=${attempt.attempt} score=${attempt.evaluation.score} major=${majorCount} minor=${minorCount}`;
    });

    return {
      score,
      metadata: {
        rationale: [
          `stopReason=${output.stopReason}`,
          `attempts=${output.attempts.length}`,
          `majorCriticisms=${majorCriticisms.length}`,
          `minorCriticisms=${minorCriticisms.length}`,
          ...attemptSummaries,
        ].join(`\n`),
      },
    };
  },
);

describeEval(
  `runThoughtChainRefinementPipeline eval`,
  {
    harness: createHarness<
      ThoughtChainPromptInputType,
      ThoughtChainRefinementResultType
    >({
      name: `thoughtChainRefinementPipelineHarness`,
      run: async ({ input, signal }) => {
        const output = await runThoughtChainRefinementPipeline(input, {
          maxAttempts: 3,
          signal,
        });

        return {
          output,
          messages: [],
        };
      },
    }),
    judges: [ThoughtChainRefinementPipelineJudge],
  },
  (it) => {
    it.for(thoughtChainPipelineCases)(
      `$concepts → $target`,
      async (spec, { run }) => {
        await run(spec);
      },
    );
  },
);

const expectedCriticismsJudge = createJudge(
  `ExpectedCriticismsJudge`,
  async ({
    input,
    output,
  }: JudgeContext<
    EvaluateThoughtChainConceptUsageCaseType,
    EvaluateThoughtChainConceptUsagePromptOutputType
  >) => {
    const unmatched = input.expect.filter(
      (expected) =>
        !output.criticisms.some((actual) =>
          criticismMatchesExpected(actual, expected),
        ),
    );

    const score =
      input.expect.length === 0
        ? 1
        : (input.expect.length - unmatched.length) / input.expect.length;

    return {
      score,
      metadata: {
        rationale:
          unmatched.length === 0
            ? `All expected criticisms were present.`
            : `Missing expected criticisms:\n${unmatched
                .map(
                  (expected) =>
                    `- ${expected.code} index=${expected.stepIndex ?? `<any>`} severity=${expected.severity ?? `<any>`}`,
                )
                .join(`\n`)}\n\nActual criticisms:\n${output.criticisms
                .map((criticism) => `- ${formatCriticism(criticism)}`)
                .join(`\n`)}`,
      },
    };
  },
);

const evaluateThoughtChainConceptUsageCases: EvaluateThoughtChainConceptUsageCaseType[] =
  [
    {
      name: `fire -> heat -> metal -> to smelt has weak transition heat -> metal`,
      target: `to smelt`,
      concepts: [`fire`, `east`],
      chain: `fire → heat → metal → to smelt`,
      expect: [{ code: `WEAK_TRANSITION` }],
    },
    {
      name: `ice -> cold -> freezing -> to freeze misses concept east`,
      target: `to freeze`,
      concepts: [`ice`, `east`],
      chain: `ice → cold → freezing → to freeze`,
      expect: [{ code: `CONCEPT_MISSING`, severity: `major` }],
    },
  ];

describeEval(
  `buildEvaluateThoughtChainConceptUsagePrompt eval`,
  {
    harness: createResponsePromptHarness(buildEvaluateThoughtChainCasePrompt),
    judges: [expectedCriticismsJudge],
  },
  (it) => {
    it.for(evaluateThoughtChainConceptUsageCases)(
      `$name`,
      async (spec, { run }) => {
        await run(spec);
      },
    );
  },
);
