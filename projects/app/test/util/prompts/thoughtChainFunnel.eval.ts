import { createHarness, createJudge, describeEval } from "vitest-evals";
import type { JudgeContext } from "vitest-evals";
import type {
  EvaluateGuidedImaginationPromptInputType,
  EvaluateThoughtChainFunnelPromptOutputType,
  GuidedImaginationCriticismType,
  GuidedImaginationEvaluationResultType,
  GuidedImaginationPromptInputType,
  GuidedImaginationPromptOutputType,
  ThoughtChainFunnelChainType,
  ThoughtChainFunnelCriticismType,
  ThoughtChainFunnelPromptInputType,
  ThoughtChainFunnelPromptOutputType,
  ThoughtChainFunnelRefinementResultType,
  ThoughtChainFunnelType,
} from "#util/prompts/thoughtChainFunnel.ts";
import {
  buildGuidedImaginationPrompt,
  buildEvaluateThoughtChainFunnelPrompt,
  buildThoughtChainFunnelPrompt,
  evaluateGuidedImagination,
  parseMnemonicConcepts,
  renderThoughtChainFunnelAscii,
  runGuidedImaginationDeterministicChecks,
  runThoughtChainFunnelRefinementPipeline,
} from "#util/prompts/thoughtChainFunnel.ts";
import { createResponsePromptHarness } from "./eval.ts";

interface ExpectedCriticismType {
  code: ThoughtChainFunnelCriticismType[`code`];
  section?: ThoughtChainFunnelCriticismType[`section`];
  cueConcept?: string | null;
  stepIndex?: number | null;
  severity?: ThoughtChainFunnelCriticismType[`severity`];
  messageIncludes?: string;
}

interface EvaluateThoughtChainFunnelCaseType {
  name: string;
  target: string;
  concepts: string[];
  thoughtFunnel: ThoughtChainFunnelType;
  expect: ExpectedCriticismType[];
}

function parseArrowChain(chain: string): ThoughtChainFunnelChainType {
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
    elaboration: null,
    because:
      index === 0
        ? null
        : `This is a common immediate association from the previous thought.`,
  }));
}

function createSupportingCue(
  concept: string,
  chain: string,
  joinBackboneStepIndex: number,
): ThoughtChainFunnelType[`supportingCues`][number] {
  return {
    concept,
    cueThoughtChain: parseArrowChain(chain),
    joinBackboneStepIndex,
  };
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function canonicalConcepts(values: string[]): string[] {
  return parseMnemonicConcepts(values).map((concept) =>
    normalizeText(concept.canonicalIdentity),
  );
}

function criticismMatchesExpected(
  criticism: ThoughtChainFunnelCriticismType,
  expected: ExpectedCriticismType,
): boolean {
  if (criticism.code !== expected.code) {
    return false;
  }
  if (
    expected.section !== undefined &&
    criticism.section !== expected.section
  ) {
    return false;
  }
  if (
    expected.cueConcept !== undefined &&
    criticism.cueConcept !== expected.cueConcept
  ) {
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

function formatCriticism(criticism: ThoughtChainFunnelCriticismType): string {
  return `[${criticism.severity}] ${criticism.code} section=${criticism.section} cue=${criticism.cueConcept} index=${criticism.stepIndex} ${criticism.message}`;
}

function buildEvaluateThoughtFunnelCasePrompt(
  input: EvaluateThoughtChainFunnelCaseType,
) {
  return buildEvaluateThoughtChainFunnelPrompt({
    target: input.target,
    concepts: input.concepts,
    thoughtFunnel: input.thoughtFunnel,
  });
}

const BasicThoughtFunnelStructureJudge = createJudge(
  `BasicThoughtFunnelStructureJudge`,
  async ({
    input,
    output,
  }: JudgeContext<
    ThoughtChainFunnelPromptInputType,
    ThoughtChainFunnelPromptOutputType
  >) => {
    const thoughtFunnel = output.thoughtFunnel;
    const backboneRootThought = thoughtFunnel.backboneThoughtChain[0]?.thought;
    const lastBackboneThought =
      thoughtFunnel.backboneThoughtChain.at(-1)?.thought;

    const uniqueInputConcepts = new Set(canonicalConcepts(input.concepts));
    const normalizedBackboneRoot =
      backboneRootThought == null ? null : normalizeText(backboneRootThought);

    const supportingCueConcepts = thoughtFunnel.supportingCues.map((cue) =>
      normalizeText(cue.concept),
    );

    const allCoveredConcepts =
      normalizedBackboneRoot == null
        ? supportingCueConcepts
        : [normalizedBackboneRoot, ...supportingCueConcepts];
    const uniqueCoveredConcepts = new Set(allCoveredConcepts);

    const conceptCoverageMatches =
      normalizedBackboneRoot != null &&
      uniqueInputConcepts.has(normalizedBackboneRoot) &&
      thoughtFunnel.supportingCues.length === input.concepts.length - 1 &&
      uniqueCoveredConcepts.size === uniqueInputConcepts.size &&
      [...uniqueCoveredConcepts].every((concept) =>
        uniqueInputConcepts.has(concept),
      );

    const allCueRootsMatch = thoughtFunnel.supportingCues.every((cue) => {
      const firstThought = cue.cueThoughtChain[0]?.thought;
      return (
        firstThought != null &&
        normalizeText(firstThought) === normalizeText(cue.concept)
      );
    });

    const allCueJoinsValid = thoughtFunnel.supportingCues.every((cue) => {
      if (
        cue.joinBackboneStepIndex < 0 ||
        cue.joinBackboneStepIndex >= thoughtFunnel.backboneThoughtChain.length
      ) {
        return false;
      }

      const joinedBackboneThought =
        thoughtFunnel.backboneThoughtChain[cue.joinBackboneStepIndex]?.thought;
      const cueEndThought = cue.cueThoughtChain.at(-1)?.thought;

      return (
        joinedBackboneThought != null &&
        cueEndThought != null &&
        normalizeText(cueEndThought) === normalizeText(joinedBackboneThought)
      );
    });

    const backboneReachesTarget =
      lastBackboneThought != null &&
      normalizeText(lastBackboneThought) === normalizeText(input.target);

    const checksPassed =
      Number(conceptCoverageMatches) +
      Number(allCueRootsMatch) +
      Number(allCueJoinsValid) +
      Number(backboneReachesTarget);

    return {
      score: checksPassed / 4,
      metadata: {
        rationale: [
          conceptCoverageMatches
            ? `All supplied canonical concept identities are covered exactly once as backbone root or supporting cue concept.`
            : `Concept coverage mismatch. backboneRoot=${JSON.stringify(backboneRootThought)} cueConcepts=${JSON.stringify(thoughtFunnel.supportingCues.map((cue) => cue.concept))} inputCanonicalConcepts=${JSON.stringify(parseMnemonicConcepts(input.concepts).map((concept) => concept.canonicalIdentity))}`,
          allCueRootsMatch
            ? `Every supporting cue begins with its exact cue concept.`
            : `One or more cue roots do not match the cue concept.`,
          allCueJoinsValid
            ? `Every supporting cue joins a valid backbone step and ends at that joined thought.`
            : `One or more supporting cues have an invalid join index or mismatched joined thought.`,
          backboneReachesTarget
            ? `Backbone thought chain reaches the target.`
            : `Backbone thought chain does not reach the target. last=${JSON.stringify(lastBackboneThought)} target=${JSON.stringify(input.target)}`,
          `Flow:\n${renderThoughtChainFunnelAscii(thoughtFunnel)}`,
        ].join(`\n`),
      },
    };
  },
);

const thoughtFunnelCases: ThoughtChainFunnelPromptInputType[] = [
  { target: `to smelt`, concepts: [`fire`, `east`] },
  { target: `to freeze`, concepts: [`ice`, `east`, `winter`] },
  { target: `at`, concepts: [`arch`, `earth; soil`] },
  {
    target: `to store money`,
    concepts: [`vault`, `bank; financial institution; money handling`],
  },
];

describeEval(
  `buildThoughtChainFunnelPrompt eval`,
  {
    harness: createResponsePromptHarness(buildThoughtChainFunnelPrompt),
    judges: [BasicThoughtFunnelStructureJudge],
  },
  (it) => {
    it.for(thoughtFunnelCases)(`$concepts → $target`, async (spec, { run }) => {
      await run(spec);
    });
  },
);

const ThoughtChainFunnelRefinementPipelineJudge = createJudge(
  `ThoughtChainFunnelRefinementPipelineJudge`,
  async ({
    output,
  }: JudgeContext<
    ThoughtChainFunnelPromptInputType,
    ThoughtChainFunnelRefinementResultType
  >) => {
    const majorCriticisms = output.finalEvaluation.criticisms.filter(
      (criticism) => criticism.severity === `major`,
    );
    const minorCriticisms = output.finalEvaluation.criticisms.filter(
      (criticism) => criticism.severity === `minor`,
    );

    const withinAttemptBudget = output.attempts.length <= 5;
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
          `Final flow:\n${renderThoughtChainFunnelAscii(output.finalThoughtFunnel)}`,
        ].join(`\n`),
      },
    };
  },
);

describeEval(
  `runThoughtChainFunnelRefinementPipeline eval`,
  {
    harness: createHarness<
      ThoughtChainFunnelPromptInputType,
      ThoughtChainFunnelRefinementResultType
    >({
      name: `thoughtChainFunnelRefinementPipelineHarness`,
      run: async ({ input, signal }) => {
        const output = await runThoughtChainFunnelRefinementPipeline(input, {
          maxAttempts: 5,
          signal,
        });

        return {
          output,
          messages: [],
        };
      },
    }),
    judges: [ThoughtChainFunnelRefinementPipelineJudge],
  },
  (it) => {
    it.for([
      { target: `sunrise`, concepts: [`east`, `morning`] },
      { target: `to freeze`, concepts: [`ice`, `east`] },
      { target: `to smelt`, concepts: [`fire`, `east`] },
      { target: `to select`, concepts: [`hand`, `east`] },
      { target: `at`, concepts: [`arch`, `earth; soil`] },
      {
        target: `to store money`,
        concepts: [`vault`, `bank; financial institution; money handling`],
      },
      {
        target: `to balance`,
        concepts: [`scale`, `bank; financial institution`, `ledger`],
      },
    ] satisfies ThoughtChainFunnelPromptInputType[])(
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
    EvaluateThoughtChainFunnelCaseType,
    EvaluateThoughtChainFunnelPromptOutputType
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
            ? `All expected criticisms were present.\nFlow:\n${renderThoughtChainFunnelAscii(input.thoughtFunnel)}`
            : `Missing expected criticisms:\n${unmatched
                .map(
                  (expected) =>
                    `- ${expected.code} section=${expected.section ?? `<any>`} cue=${expected.cueConcept ?? `<any>`} index=${expected.stepIndex ?? `<any>`} severity=${expected.severity ?? `<any>`}`,
                )
                .join(`\n`)}\n\nActual criticisms:\n${output.criticisms
                .map((criticism) => `- ${formatCriticism(criticism)}`)
                .join(
                  `\n`,
                )}\n\nFlow:\n${renderThoughtChainFunnelAscii(input.thoughtFunnel)}`,
      },
    };
  },
);

const evaluateThoughtChainFunnelCases: EvaluateThoughtChainFunnelCaseType[] = [
  {
    name: `canonical identity should remain learner-facing for semicolon concepts`,
    target: `at`,
    concepts: [`arch`, `earth; soil`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(`arch → at`),
      supportingCues: [createSupportingCue(`earth`, `earth → arch`, 0)],
    },
    expect: [],
  },
  {
    name: `missing supporting cue concept is a major structural failure`,
    target: `to smelt`,
    concepts: [`fire`, `east`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(`fire → furnace → to smelt`),
      supportingCues: [],
    },
    expect: [
      {
        code: `CONCEPT_COVERAGE_MISSING`,
        section: `funnel`,
        severity: `major`,
      },
    ],
  },
  {
    name: `cue that misses joined backbone thought should be criticized`,
    target: `to freeze`,
    concepts: [`ice`, `east`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(`ice → cold → to freeze`),
      supportingCues: [
        createSupportingCue(`east`, `east → sunrise → morning`, 1),
      ],
    },
    expect: [
      {
        code: `CUE_JOIN_MISMATCH`,
        section: `cue`,
        cueConcept: `east`,
      },
    ],
  },
  {
    name: `raw semicolon concept string should be identity mismatch`,
    target: `at`,
    concepts: [`arch`, `earth; soil`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(`earth; soil → at`),
      supportingCues: [createSupportingCue(`arch`, `arch → earth; soil`, 0)],
    },
    expect: [
      {
        code: `CONCEPT_IDENTITY_MISMATCH`,
        section: `funnel`,
        severity: `major`,
      },
    ],
  },
  {
    name: `context gloss used as learner-facing concept should be identity mismatch`,
    target: `at`,
    concepts: [`arch`, `earth; soil`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(`arch → at`),
      supportingCues: [createSupportingCue(`soil`, `soil → arch`, 0)],
    },
    expect: [
      {
        code: `CONCEPT_IDENTITY_MISMATCH`,
        section: `cue`,
        severity: `major`,
      },
    ],
  },
  {
    name: `context gloss treated as separate component should be identity mismatch`,
    target: `at`,
    concepts: [`arch`, `earth; soil`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(`arch → at`),
      supportingCues: [
        createSupportingCue(`earth`, `earth → arch`, 0),
        createSupportingCue(`soil`, `soil → arch`, 0),
      ],
    },
    expect: [
      {
        code: `CONCEPT_IDENTITY_MISMATCH`,
        section: `cue`,
        severity: `major`,
      },
      {
        code: `CONCEPT_COVERAGE_MISSING`,
        section: `funnel`,
        severity: `major`,
      },
    ],
  },
  {
    name: `multi-gloss concept can remain canonical with no identity criticism`,
    target: `to store money`,
    concepts: [`vault`, `bank; financial institution; money handling`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(`vault → to store money`),
      supportingCues: [createSupportingCue(`bank`, `bank → vault`, 0)],
    },
    expect: [],
  },
  {
    name: `concept without semicolon behaves unchanged`,
    target: `sunrise`,
    concepts: [`east`, `morning`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(`east → sunrise`),
      supportingCues: [
        createSupportingCue(`morning`, `morning → dawn → sunrise`, 1),
      ],
    },
    expect: [],
  },
  {
    name: `mixed concepts with and without glosses preserve canonical identities`,
    target: `to freeze`,
    concepts: [`ice`, `east`, `bank; financial institution`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(`ice → cold → to freeze`),
      supportingCues: [
        createSupportingCue(`east`, `east → winter morning → cold`, 1),
        createSupportingCue(`bank`, `bank → vault → cold`, 1),
      ],
    },
    expect: [],
  },
];

describeEval(
  `buildEvaluateThoughtChainFunnelPrompt eval`,
  {
    harness: createResponsePromptHarness(buildEvaluateThoughtFunnelCasePrompt),
    judges: [expectedCriticismsJudge],
  },
  (it) => {
    it.for(evaluateThoughtChainFunnelCases)(`$name`, async (spec, { run }) => {
      await run(spec);
    });
  },
);

type GuidedImaginationCriticismCodeType =
  GuidedImaginationCriticismType[`code`];

interface GuidedImaginationScoreRangeType {
  min?: number;
  max?: number;
}

interface EvaluateGuidedImaginationCaseType {
  name: string;
  target: string;
  concepts: string[];
  thoughtFunnel: ThoughtChainFunnelType;
  guidedImagination: string;
  expectPass?: boolean;
  expectAllCodes?: GuidedImaginationCriticismCodeType[];
  expectAnyCodes?: GuidedImaginationCriticismCodeType[];
  scoreRanges?: {
    fidelity?: GuidedImaginationScoreRangeType;
    readability?: GuidedImaginationScoreRangeType;
    compression?: GuidedImaginationScoreRangeType;
    overall?: GuidedImaginationScoreRangeType;
  };
}

function rangeIncludes(
  value: number,
  range: GuidedImaginationScoreRangeType | undefined,
): boolean {
  if (range == null) {
    return true;
  }

  if (range.min != null && value < range.min) {
    return false;
  }

  if (range.max != null && value > range.max) {
    return false;
  }

  return true;
}

const GuidedImaginationDeterministicJudge = createJudge(
  `GuidedImaginationDeterministicJudge`,
  async ({
    output,
  }: JudgeContext<
    GuidedImaginationPromptInputType,
    GuidedImaginationPromptOutputType
  >) => {
    const deterministicChecks = runGuidedImaginationDeterministicChecks(
      output.guidedImagination,
    );

    return {
      score: deterministicChecks.passed ? 1 : 0,
      metadata: {
        rationale: deterministicChecks.passed
          ? `Guided imagination passed deterministic checks.`
          : `Deterministic failures:\n${deterministicChecks.criticisms
              .map(
                (criticism) =>
                  `- [${criticism.severity}] ${criticism.code}: ${criticism.message}`,
              )
              .join(`\n`)}`,
      },
    };
  },
);

describeEval(
  `buildGuidedImaginationPrompt eval`,
  {
    harness: createResponsePromptHarness(buildGuidedImaginationPrompt),
    judges: [GuidedImaginationDeterministicJudge],
  },
  (it) => {
    it.for([
      {
        target: `to negotiate`,
        concepts: [`table`, `peace`, `bridge`],
        thoughtFunnel: {
          backboneThoughtChain: parseArrowChain(
            `table → meeting → agreement → to negotiate`,
          ),
          supportingCues: [
            createSupportingCue(`peace`, `peace → truce → agreement`, 2),
            createSupportingCue(`bridge`, `bridge → crossing → agreement`, 2),
          ],
        },
      },
      {
        target: `sunrise`,
        concepts: [`east`, `morning`],
        thoughtFunnel: {
          backboneThoughtChain: parseArrowChain(`east → sunrise`),
          supportingCues: [
            createSupportingCue(`morning`, `morning → dawn → sunrise`, 1),
          ],
        },
      },
      {
        target: `to select`,
        concepts: [`hand`, `east`],
        thoughtFunnel: {
          backboneThoughtChain: [
            { thought: `hand`, elaboration: null, because: null },
            {
              thought: `point`,
              elaboration: `with your hand`,
              because: `You use your hand to point at something.`,
            },
            {
              thought: `single out one item`,
              elaboration: `by pointing at it`,
              because: `Pointing at one thing among several singles that one out.`,
            },
            {
              thought: `to select`,
              elaboration: null,
              because: `To single out one item from others is to select it.`,
            },
          ],
          supportingCues: [
            {
              concept: `east`,
              cueThoughtChain: [
                {
                  thought: `east`,
                  elaboration: null,
                  because: null,
                },
                {
                  thought: `point`,
                  elaboration: `toward the east`,
                  because: `East is a direction you can point toward.`,
                },
              ],
              joinBackboneStepIndex: 1,
            },
          ],
        },
      },
    ] satisfies GuidedImaginationPromptInputType[])(
      `$concepts → $target`,
      async (spec, { run }) => {
        await run(spec);
      },
    );
  },
);

const evaluateGuidedImaginationCases: EvaluateGuidedImaginationCaseType[] = [
  {
    name: `strong guided imagination should preserve progression and pass`,
    target: `to negotiate`,
    concepts: [`table`, `peace`, `bridge`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(
        `table → meeting → agreement → to negotiate`,
      ),
      supportingCues: [
        createSupportingCue(`peace`, `peace → truce → agreement`, 2),
        createSupportingCue(`bridge`, `bridge → crossing → agreement`, 2),
      ],
    },
    guidedImagination: `Picture people at a table moving into a meeting, and that meeting lands on an agreement that leads to negotiating. Let peace move through truce into that agreement, and let bridge move through crossing into it too.`,
    expectPass: true,
    scoreRanges: {
      fidelity: { min: 0.75 },
      readability: { min: 0.7 },
      compression: { min: 0.65 },
      overall: { min: 0.72 },
    },
  },
  {
    name: `mechanical rendering should be flagged as overly literal`,
    target: `to negotiate`,
    concepts: [`table`, `peace`, `bridge`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(
        `table → meeting → agreement → to negotiate`,
      ),
      supportingCues: [
        createSupportingCue(`peace`, `peace → truce → agreement`, 2),
        createSupportingCue(`bridge`, `bridge → crossing → agreement`, 2),
      ],
    },
    guidedImagination: `Start with table. Then meeting. Then agreement. Then to negotiate. Also peace then truce then agreement. Also bridge then crossing then agreement.`,
    expectPass: false,
    expectAnyCodes: [`OVERLY_LITERAL_RENDERING`, `UNDERCOMPRESSED`],
  },
  {
    name: `overcompressed rendering should be flagged`,
    target: `to negotiate`,
    concepts: [`table`, `peace`, `bridge`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(
        `table → meeting → agreement → to negotiate`,
      ),
      supportingCues: [
        createSupportingCue(`peace`, `peace → truce → agreement`, 2),
        createSupportingCue(`bridge`, `bridge → crossing → agreement`, 2),
      ],
    },
    guidedImagination: `Think table, then jump straight to negotiating.`,
    expectPass: false,
    expectAnyCodes: [`OVERCOMPRESSED`, `IMPORTANT_IDEA_MISSING`],
  },
  {
    name: `invented imagery should be flagged`,
    target: `to negotiate`,
    concepts: [`table`, `peace`, `bridge`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(
        `table → meeting → agreement → to negotiate`,
      ),
      supportingCues: [
        createSupportingCue(`peace`, `peace → truce → agreement`, 2),
        createSupportingCue(`bridge`, `bridge → crossing → agreement`, 2),
      ],
    },
    guidedImagination: `At a table, a dragon mediator appears and carries everyone into an agreement, which becomes negotiating.`,
    expectPass: false,
    expectAllCodes: [`INVENTED_ASSOCIATION`],
  },
  {
    name: `changed reasoning should be flagged`,
    target: `to negotiate`,
    concepts: [`table`, `peace`, `bridge`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(
        `table → meeting → agreement → to negotiate`,
      ),
      supportingCues: [
        createSupportingCue(`peace`, `peace → truce → agreement`, 2),
        createSupportingCue(`bridge`, `bridge → crossing → agreement`, 2),
      ],
    },
    guidedImagination: `Use table as a multiplication table, then use math strategy to negotiate from calculations.`,
    expectPass: false,
    expectAllCodes: [`REASONING_CHANGED`],
  },
  {
    name: `missing supporting cue should be flagged`,
    target: `to negotiate`,
    concepts: [`table`, `peace`, `bridge`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(
        `table → meeting → agreement → to negotiate`,
      ),
      supportingCues: [
        createSupportingCue(`peace`, `peace → truce → agreement`, 2),
        createSupportingCue(`bridge`, `bridge → crossing → agreement`, 2),
      ],
    },
    guidedImagination: `At the table, move into a meeting, reach agreement, and then negotiate.`,
    expectPass: false,
    expectAnyCodes: [`SUPPORTING_CUE_MISSING`, `IMPORTANT_IDEA_MISSING`],
  },
  {
    name: `awkward prose should be flagged`,
    target: `to negotiate`,
    concepts: [`table`, `peace`, `bridge`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(
        `table → meeting → agreement → to negotiate`,
      ),
      supportingCues: [
        createSupportingCue(`peace`, `peace → truce → agreement`, 2),
        createSupportingCue(`bridge`, `bridge → crossing → agreement`, 2),
      ],
    },
    guidedImagination: `Table also brings in meeting, and peace also brings in bridge, and then it turns into negotiation somehow.`,
    expectPass: false,
    expectAnyCodes: [`AWKWARD_LANGUAGE`, `UNCLEAR_TRANSITION`],
  },
  {
    name: `excessive literary style should be flagged`,
    target: `to negotiate`,
    concepts: [`table`, `peace`, `bridge`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(
        `table → meeting → agreement → to negotiate`,
      ),
      supportingCues: [
        createSupportingCue(`peace`, `peace → truce → agreement`, 2),
        createSupportingCue(`bridge`, `bridge → crossing → agreement`, 2),
      ],
    },
    guidedImagination: `In a moonlit hall, the sacred table glimmers while peace sings over a silver bridge, and destiny blossoms into negotiation.`,
    expectPass: false,
    expectAnyCodes: [`OVERLY_CREATIVE_RENDERING`, `TOO_VERBOSE`],
  },
  {
    name: `repeated idea should be flagged`,
    target: `to negotiate`,
    concepts: [`table`, `peace`, `bridge`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(
        `table → meeting → agreement → to negotiate`,
      ),
      supportingCues: [
        createSupportingCue(`peace`, `peace → truce → agreement`, 2),
        createSupportingCue(`bridge`, `bridge → crossing → agreement`, 2),
      ],
    },
    guidedImagination: `At the table, people seek calm agreement, peaceful agreement, and harmonious agreement before negotiating.`,
    expectPass: false,
    expectAllCodes: [`REPEATED_IDEA`],
  },
  {
    name: `em dash usage should be deterministically flagged`,
    target: `to negotiate`,
    concepts: [`table`, `peace`, `bridge`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(
        `table → meeting → agreement → to negotiate`,
      ),
      supportingCues: [
        createSupportingCue(`peace`, `peace → truce → agreement`, 2),
        createSupportingCue(`bridge`, `bridge → crossing → agreement`, 2),
      ],
    },
    guidedImagination: `At the table, the meeting reaches agreement—and that agreement leads to negotiating, with peace and bridge converging there.`,
    expectPass: false,
    expectAllCodes: [`EM_DASH_USED`],
  },
  {
    name: `valid aggressive compression should still pass`,
    target: `to negotiate`,
    concepts: [`table`, `peace`, `bridge`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(
        `table → meeting → agreement → to negotiate`,
      ),
      supportingCues: [
        createSupportingCue(`peace`, `peace → truce → agreement`, 2),
        createSupportingCue(`bridge`, `bridge → crossing → agreement`, 2),
      ],
    },
    guidedImagination: `At the table, a meeting reaches agreement and then cues negotiating. Peace moves through truce into that agreement, and bridge moves through crossing into the same point.`,
    expectPass: true,
    scoreRanges: {
      fidelity: { min: 0.75 },
      readability: { min: 0.68 },
      compression: { min: 0.7 },
      overall: { min: 0.72 },
    },
  },
  {
    name: `short funnel should remain concise`,
    target: `sunrise`,
    concepts: [`east`, `morning`],
    thoughtFunnel: {
      backboneThoughtChain: parseArrowChain(`east → sunrise`),
      supportingCues: [
        createSupportingCue(`morning`, `morning → dawn → sunrise`, 1),
      ],
    },
    guidedImagination: `Think east, picture sunrise there, and let morning join through dawn at that same sunrise.`,
    expectPass: true,
    scoreRanges: {
      fidelity: { min: 0.75 },
      readability: { min: 0.7 },
      compression: { min: 0.7 },
      overall: { min: 0.72 },
    },
  },
];

const GuidedImaginationEvaluationJudge = createJudge(
  `GuidedImaginationEvaluationJudge`,
  async ({
    input,
    output,
  }: JudgeContext<
    EvaluateGuidedImaginationCaseType,
    GuidedImaginationEvaluationResultType
  >) => {
    const codes = new Set(output.criticisms.map((criticism) => criticism.code));
    const expectedAll = input.expectAllCodes ?? [];
    const expectedAny = input.expectAnyCodes ?? [];

    const missingAllCodes = expectedAll.filter((code) => !codes.has(code));
    const anyCodeSatisfied =
      expectedAny.length === 0 || expectedAny.some((code) => codes.has(code));
    const passMatches =
      input.expectPass === undefined || output.passed === input.expectPass;

    const fidelityInRange = rangeIncludes(
      output.fidelityScore,
      input.scoreRanges?.fidelity,
    );
    const readabilityInRange = rangeIncludes(
      output.readabilityScore,
      input.scoreRanges?.readability,
    );
    const compressionInRange = rangeIncludes(
      output.compressionScore,
      input.scoreRanges?.compression,
    );
    const overallInRange = rangeIncludes(
      output.overallScore,
      input.scoreRanges?.overall,
    );

    const checks = [
      missingAllCodes.length === 0,
      anyCodeSatisfied,
      passMatches,
      fidelityInRange,
      readabilityInRange,
      compressionInRange,
      overallInRange,
    ];

    const passedChecks = checks.filter(Boolean).length;

    return {
      score: passedChecks / checks.length,
      metadata: {
        rationale: [
          `pass=${output.passed}`,
          `scores fidelity=${output.fidelityScore} readability=${output.readabilityScore} compression=${output.compressionScore} overall=${output.overallScore}`,
          missingAllCodes.length === 0
            ? `All required criticism codes are present.`
            : `Missing required criticism codes: ${missingAllCodes.join(`, `)}`,
          anyCodeSatisfied
            ? `Any-code expectation satisfied.`
            : `Expected at least one of: ${(input.expectAnyCodes ?? []).join(`, `)}`,
          passMatches
            ? `Pass expectation satisfied.`
            : `Pass expectation mismatch: expected=${input.expectPass} actual=${output.passed}`,
          fidelityInRange
            ? `Fidelity range satisfied.`
            : `Fidelity out of expected range.`,
          readabilityInRange
            ? `Readability range satisfied.`
            : `Readability out of expected range.`,
          compressionInRange
            ? `Compression range satisfied.`
            : `Compression out of expected range.`,
          overallInRange
            ? `Overall range satisfied.`
            : `Overall out of expected range.`,
          `Criticisms:\n${output.criticisms
            .map(
              (criticism) =>
                `- [${criticism.severity}] ${criticism.code}: ${criticism.message}`,
            )
            .join(`\n`)}`,
          `Flow:\n${renderThoughtChainFunnelAscii(input.thoughtFunnel)}`,
        ].join(`\n`),
      },
    };
  },
);

describeEval(
  `evaluateGuidedImagination eval`,
  {
    harness: createHarness<
      EvaluateGuidedImaginationCaseType,
      GuidedImaginationEvaluationResultType
    >({
      name: `evaluateGuidedImaginationHarness`,
      run: async ({ input, signal }) => {
        const output = await evaluateGuidedImagination(
          {
            target: input.target,
            concepts: input.concepts,
            thoughtFunnel: input.thoughtFunnel,
            guidedImagination: input.guidedImagination,
          } satisfies EvaluateGuidedImaginationPromptInputType,
          {
            signal,
          },
        );

        return {
          output,
          messages: [],
        };
      },
    }),
    judges: [GuidedImaginationEvaluationJudge],
  },
  (it) => {
    it.for(evaluateGuidedImaginationCases)(`$name`, async (spec, { run }) => {
      await run(spec);
    });
  },
);
