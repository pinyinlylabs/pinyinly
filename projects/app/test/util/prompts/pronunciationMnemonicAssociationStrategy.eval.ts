import { describeEval } from "vitest-evals";
import { buildPronunciationMnemonicAssociationStrategyPrompt } from "#util/prompts/pronunciationMnemonicAssociationStrategy.js";
import type { PronunciationMnemonicRecurringPromptAssociationStrategyKind } from "#util/prompts/pronunciationMnemonicRecurring.js";
import { createResponsePromptHarness } from "./eval";
import { expect } from "vitest";

const promptCases: {
  label: string;
  expected: PronunciationMnemonicRecurringPromptAssociationStrategyKind;
}[] = [
  { label: `key`, expected: `objectBinding` },
  { label: `afraid`, expected: `behaviourConsequence` },
  { label: `hot`, expected: `environmentRule` },
  { label: `old`, expected: `identityBinding` },
];

describeEval(
  `buildPronunciationMnemonicAssociationStrategyPrompt eval`,
  {
    harness: createResponsePromptHarness(
      buildPronunciationMnemonicAssociationStrategyPrompt,
    ),
  },
  (it) => {
    it.for(promptCases)(`$label`, async ({ label, expected }, { run }) => {
      const result = await run({ cue: { label } });

      expect.soft(result.output.associationStrategy).toBe(expected);
    });
  },
);
