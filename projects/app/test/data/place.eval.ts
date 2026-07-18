// pyly-not-src-test
import { createHarness, createJudge, describeEval } from "vitest-evals";
import type { JudgeContext } from "vitest-evals";
import {
  buildPlaceSpecificationPrompt,
  runPlaceSpecificationRefinementPipeline,
} from "./place";
import type {
  PlacePromptInputType,
  PlaceSpecificationRefinementResultType,
  PlaceSpecification,
} from "./place";
import { createResponsePromptHarness } from "./eval";

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isValidPlaceSpecification(spec: PlaceSpecification): boolean {
  const experiences = spec.experiences;

  return (
    spec.place.trim().length > 0 &&
    spec.recognitionHooks.length >= 3 &&
    spec.recognitionHooks.length <= 5 &&
    spec.designRules.length > 0 &&
    [
      experiences.arrival,
      experiences.heart,
      experiences.below,
      experiences.ascent,
      experiences.summit,
    ].every((experience) => experience.designRules.length > 0)
  );
}

const PlaceSpecificationJudge = createJudge(
  `PlaceSpecificationJudge`,
  async ({
    input,
    output,
  }: JudgeContext<PlacePromptInputType, PlaceSpecification>) => {
    const score =
      isValidPlaceSpecification(output) &&
      normalized(output.place) === normalized(input.place)
        ? 1
        : 0;

    return {
      score,
      metadata: {
        rationale:
          score === 1
            ? `Valid canonical place specification.`
            : `The output did not satisfy the required structure.`,
      },
    };
  },
);

const PlacePipelineJudge = createJudge(
  `PlacePipelineJudge`,
  async ({
    output,
  }: JudgeContext<
    PlacePromptInputType,
    PlaceSpecificationRefinementResultType
  >) => {
    const final = output.finalPlaceSpecification;
    const structureScore = isValidPlaceSpecification(final) ? 1 : 0;
    const budgetScore = output.attempts.length <= 3 ? 1 : 0;
    const placeScore = normalized(final.place).length > 0 ? 1 : 0;

    return {
      score: (structureScore + budgetScore + placeScore) / 3,
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

const promptCases: PlacePromptInputType[] = [
  { place: `Pirate ship` },
  { place: `Mountain temple` },
  { place: `Aircraft hangar` },
];

describeEval(
  `buildPlaceSpecificationPrompt eval`,
  {
    harness: createResponsePromptHarness(buildPlaceSpecificationPrompt),
    judges: [PlaceSpecificationJudge],
  },
  (it) => {
    it.for(promptCases)(`$place`, async (spec, { run }) => {
      await run(spec);
    });
  },
);

describeEval(
  `runPlaceSpecificationRefinementPipeline eval`,
  {
    harness: createHarness<
      PlacePromptInputType,
      PlaceSpecificationRefinementResultType
    >({
      name: `placeSpecificationRefinementPipelineHarness`,
      run: async ({ input, signal }) => {
        const output = await runPlaceSpecificationRefinementPipeline(input, {
          maxAttempts: 3,
          signal,
        });

        return {
          output,
          messages: [],
        };
      },
    }),
    judges: [PlacePipelineJudge],
  },
  (it) => {
    it.for(promptCases)(
      `$place`,
      { timeout: 3 * 60_000 },
      async (spec, { run }) => {
        await run(spec);
      },
    );
  },
);
