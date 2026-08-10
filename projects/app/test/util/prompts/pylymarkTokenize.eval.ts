import { createJudge, describeEval } from "vitest-evals";
import type { HarnessMetadata, JudgeContext } from "vitest-evals";
import { diffStringsUnified } from "@vitest/utils/diff";
import { z } from "zod";
import { buildPylymarkTokenizePrompt } from "#util/prompts/pylymarkTokenize.ts";
import type { PylymarkTokenizeInput } from "#util/prompts/pylymarkTokenize.ts";
import { createResponsePromptHarness } from "./eval.ts";

interface PylymarkTokenizeHarnessMetadata extends HarnessMetadata {
  expectedText: string;
}

interface PylymarkTokenizeEvalCase {
  name: string;
  input: PylymarkTokenizeInput;
  expectedText: string;
}

const ExpectedTextJudge = createJudge(
  `ExpectedTextJudge`,
  async ({
    output,
    metadata,
  }: JudgeContext<
    PylymarkTokenizeInput,
    { text: string },
    PylymarkTokenizeHarnessMetadata
  >) => {
    const score = output.text === metadata.expectedText ? 1 : 0;

    return {
      score,
      metadata: {
        rationale:
          score === 1
            ? `Exact text match.`
            : `Annotated text mismatch:\n${diffStringsUnified(metadata.expectedText, output.text)}`,
      },
    };
  },
);

const pylymarkTokenizeCases: PylymarkTokenizeEvalCase[] = [
  {
    name: `baseline exact and inflection matching`,
    input: {
      text: `Bigfoot hides in the barn basement and expresses himself.`,
      references: [
        { reference: `bi-`, terms: [`Bigfoot`] },
        { reference: `-ao`, terms: [`barn`] },
        { reference: `3`, terms: [`basement`] },
        { reference: `表`, terms: [`to express`] },
      ],
    },
    expectedText: `[bi- Bigfoot] hides in the [-ao barn] [3 basement] and [表 expresses] himself.`,
  },
  {
    name: `preserves punctuation and spacing around inserted markers`,
    input: {
      text: `Barn, basement, and Bigfoot.`,
      references: [
        { reference: `-ao`, terms: [`Barn`] },
        { reference: `3`, terms: [`basement`] },
        { reference: `bi-`, terms: [`Bigfoot`] },
      ],
    },
    expectedText: `[-ao Barn], [3 basement], and [bi- Bigfoot].`,
  },
  {
    name: `matches smallest span for inflected verb`,
    input: {
      text: `He can express himself clearly.`,
      references: [{ reference: `表`, terms: [`to express`] }],
    },
    expectedText: `He can [表 express] himself clearly.`,
  },
  {
    name: `does not match paraphrase or related word`,
    input: {
      text: `His expression changed abruptly.`,
      references: [{ reference: `表`, terms: [`to express`] }],
    },
    expectedText: `His expression changed abruptly.`,
  },
  {
    name: `supports multiple terms for a single reference`,
    input: {
      text: `The barn stands behind the hill.`,
      references: [
        { reference: `-ao`, terms: [`warehouse`, `barn`, `stable`] },
      ],
    },
    expectedText: `The [-ao barn] stands behind the hill.`,
  },
  {
    name: `leaves text unchanged when no reference terms match`,
    input: {
      text: `The attic is quiet at night.`,
      references: [
        { reference: `3`, terms: [`basement`] },
        { reference: `bi-`, terms: [`Bigfoot`] },
      ],
    },
    expectedText: `The attic is quiet at night.`,
  },
  {
    name: `supports mixed reference identifiers`,
    input: {
      text: `Bigfoot entered the barn and began to express gratitude in the basement.`,
      references: [
        { reference: `bi-`, terms: [`Bigfoot`] },
        { reference: `-ao`, terms: [`barn`] },
        { reference: `表`, terms: [`to express`] },
        { reference: `3`, terms: [`basement`] },
      ],
    },
    expectedText: `[bi- Bigfoot] entered the [-ao barn] and began [表 to express] gratitude in the [3 basement].`,
  },
  {
    name: `does not alter non-target formatting markers`,
    input: {
      text: `**Bigfoot** waits in the barn.`,
      references: [
        { reference: `bi-`, terms: [`Bigfoot`] },
        { reference: `-ao`, terms: [`barn`] },
      ],
    },
    expectedText: `**[bi- Bigfoot]** waits in the [-ao barn].`,
  },
  {
    name: `tokenzises all instances of references`,
    input: {
      text: `Difficult = Tuskie finding the ancient pyramid stairway hilariously hard to climb because his tusk keeps making the cramped ascent a bad fit.`,
      references: [
        { reference: `n-`, terms: [`Tuskie the Narwhal`] },
        { reference: `-an`, terms: [`Ancient pyramid`] },
        { reference: "2", terms: ["Ascending passage"] },
        { reference: `难`, terms: [`difficult`] },
      ],
    },
    expectedText: `[难 Difficult] = [n- Tuskie] finding the [-an ancient pyramid] stairway hilariously hard to climb because his tusk keeps making the cramped [2 ascent a bad fit.`,
  },
];

describeEval(
  `buildPylymarkTokenizePrompt eval`,
  {
    harness: createResponsePromptHarness(
      buildPylymarkTokenizePrompt,
      z.object({ expectedText: z.string() }),
    ),
    judges: [ExpectedTextJudge],
  },
  (it) => {
    it.for(pylymarkTokenizeCases)(`$name`, async (spec, { run }) => {
      await run(spec.input, {
        metadata: {
          expectedText: spec.expectedText,
        },
      });
    });
  },
);
