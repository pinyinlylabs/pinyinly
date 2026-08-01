import { createHarness, createJudge, describeEval } from "vitest-evals";
import type { JudgeContext } from "vitest-evals";
import { generateLocationSpec } from "#server/lib/inngest/location.ts";
import { InngestTestEngine } from "@inngest/test";
import type { LocationSpecWithDetail } from "#util/prompts/locationSpec.js";
import { buildLocationSpecPrompt } from "#util/prompts/locationSpec.js";
import { createResponsePromptHarness } from "#test/util/prompts/eval.ts";
import type { LocationSpecRefinementResultType } from "#util/prompts/locationSpecEvaluate.js";

type LocationPromptInput = {
  location: string;
};

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

const LocationSpecJudge = createJudge(
  `LocationSpecJudge`,
  async ({ input, output }: JudgeContext<LocationPromptInput, any>) => {
    const spec = output as LocationSpecWithDetail;
    const score =
      normalized(spec.location) === normalized(input.location) ? 1 : 0;

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
  }: JudgeContext<LocationPromptInput, LocationSpecRefinementResultType>) => {
    const final = output.finalLocationSpec;
    const budgetScore = output.attempts.length <= 3 ? 1 : 0;
    const locationScore = normalized(final.location).length > 0 ? 1 : 0;

    return {
      score: (budgetScore + locationScore) / 3,
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

const promptCases: LocationPromptInput[] = [
  { location: `Pirate ship` },
  { location: `Mountain temple` },
  { location: `Aircraft hangar` },
];

describeEval(
  `buildLocationSpecPrompt eval`,
  {
    harness: createResponsePromptHarness(buildLocationSpecPrompt),
    judges: [LocationSpecJudge],
  },
  (it) => {
    it.for(promptCases)(`$location`, async (spec, { run }) => {
      await run(spec);
    });
  },
);

describeEval(
  `runLocationSpecRefinementPipeline eval`,
  {
    harness: createHarness<
      LocationPromptInput,
      LocationSpecRefinementResultType
    >({
      name: `locationSpecRefinementPipelineHarness`,
      run: async ({ input, signal }) => {
        const testEngine = new InngestTestEngine({
          function: generateLocationSpec,
        });

        const { result } = await testEngine.execute({
          events: [
            {
              name: `inngest/function.invoked`,
              data: {
                location: input.location,
                maxAttempts: 3,
              },
            },
          ],
        });

        signal?.throwIfAborted();

        return {
          output: result as LocationSpecRefinementResultType,
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
