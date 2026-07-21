import { createHarness, createJudge, describeEval } from "vitest-evals";
import type { JudgeContext } from "vitest-evals";
import {
  buildLocationSpecificationPrompt,
  runLocationSpecificationRefinementPipeline,
} from "#util/prompts/location.ts";
import type {
  LocationPromptInputType,
  LocationSpecificationRefinementResultType,
  LocationSpecification,
} from "#util/prompts/location.ts";
import { createResponsePromptHarness } from "./eval.ts";

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isValidLocationSpecification(spec: LocationSpecification): boolean {
  const sets = spec.sets;

  return (
    spec.location.trim().length > 0 &&
    spec.recognitionHooks.length >= 3 &&
    spec.recognitionHooks.length <= 5 &&
    spec.designRules.length > 0 &&
    [sets.arrival, sets.heart, sets.below, sets.ascent, sets.summit].every(
      (set) => set.designRules.length > 0,
    )
  );
}

const LocationSpecificationJudge = createJudge(
  `LocationSpecificationJudge`,
  async ({
    input,
    output,
  }: JudgeContext<LocationPromptInputType, LocationSpecification>) => {
    const score =
      isValidLocationSpecification(output) &&
      normalized(output.location) === normalized(input.location)
        ? 1
        : 0;

    return {
      score,
      metadata: {
        rationale:
          score === 1
            ? `Valid canonical location specification.`
            : `The output did not satisfy the required structure.`,
      },
    };
  },
);

const LocationPipelineJudge = createJudge(
  `LocationPipelineJudge`,
  async ({
    output,
  }: JudgeContext<
    LocationPromptInputType,
    LocationSpecificationRefinementResultType
  >) => {
    const final = output.finalLocationSpecification;
    const structureScore = isValidLocationSpecification(final) ? 1 : 0;
    const budgetScore = output.attempts.length <= 3 ? 1 : 0;
    const locationScore = normalized(final.location).length > 0 ? 1 : 0;

    return {
      score: (structureScore + budgetScore + locationScore) / 3,
      metadata: {
        rationale: [
          `attempts=${output.attempts.length}`,
          `stopReason=${output.stopReason}`,
          `finalScore=${output.finalEvaluation.score}`,
        ].join(`\n`),
      },
    };
  },
);

const promptCases: LocationPromptInputType[] = [
  { location: `Pirate ship` },
  { location: `Mountain temple` },
  { location: `Aircraft hangar` },
];

describeEval(
  `buildLocationSpecificationPrompt eval`,
  {
    harness: createResponsePromptHarness(buildLocationSpecificationPrompt),
    judges: [LocationSpecificationJudge],
  },
  (it) => {
    it.for(promptCases)(`$location`, async (spec, { run }) => {
      await run(spec);
    });
  },
);

describeEval(
  `runLocationSpecificationRefinementPipeline eval`,
  {
    harness: createHarness<
      LocationPromptInputType,
      LocationSpecificationRefinementResultType
    >({
      name: `locationSpecificationRefinementPipelineHarness`,
      run: async ({ input, signal }) => {
        const output = await runLocationSpecificationRefinementPipeline(input, {
          maxAttempts: 3,
          signal,
        });

        return {
          output,
          messages: [],
        };
      },
    }),
    judges: [LocationPipelineJudge],
  },
  (it) => {
    it.for(promptCases)(
      `$location`,
      { timeout: 3 * 60_000 },
      async (spec, { run }) => {
        await run(spec);
      },
    );
  },
);
