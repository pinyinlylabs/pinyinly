import {
  buildMeaningHintCausualBridgePrompt,
  buildMeaningHintLogicalPrompt,
  buildMeaningHintPrompt,
} from "#util/prompts/meaningHint.ts";
import { describe, expect, test } from "vitest";

describe(
  `buildMeaningHintCausualBridgePrompt` satisfies HasNameOf<
    typeof buildMeaningHintCausualBridgePrompt
  >,
  () => {
    test(`builds target and cue payload`, () => {
      const result = buildMeaningHintCausualBridgePrompt({
        hanzi: `好`,
        meaning: {
          hanziWord: `好`,
          glosses: [`good`],
        },
        components: [
          { hanzi: `女`, meaning: `woman` },
          { hanzi: `子`, label: `child` },
        ],
        count: 3,
      });

      expect(result.model).toBe(`gpt-5.4`);
      expect(result.reasoningEffort).toBe(`none`);
      expect(buildMeaningHintCausualBridgePrompt.strategy).toBe(
        `casual-bridge`,
      );
      expect(result.messages[1]?.content).toContain(`"target": "good"`);
      expect(result.messages[1]?.content).toContain(`"woman"`);
      expect(result.messages[1]?.content).toContain(`"child"`);
    });
  },
);

describe(
  `buildMeaningHintPrompt` satisfies HasNameOf<typeof buildMeaningHintPrompt>,
  () => {
    test(`builds visual meaning prompt`, () => {
      const result = buildMeaningHintPrompt({
        hanzi: `好`,
        meaning: {
          hanziWord: `好`,
          glosses: [`good`, `well`],
        },
        components: [
          { hanzi: `女`, meaning: `woman` },
          { hanzi: `子`, label: `child`, meaning: `child` },
        ],
        count: 4,
      });

      expect(result.model).toBe(`gpt-5.4`);
      expect(buildMeaningHintPrompt.strategy).toBe(`visual`);
      expect(result.messages[0]?.content).toContain(
        `Focus on meaning recall, not pronunciation.`,
      );
      expect(result.messages[1]?.content).toContain(
        `Generate 4 distinct mnemonic hints.`,
      );
    });
  },
);

describe(
  `buildMeaningHintLogicalPrompt` satisfies HasNameOf<
    typeof buildMeaningHintLogicalPrompt
  >,
  () => {
    test(`builds logical meaning prompt with disambiguation`, () => {
      const result = buildMeaningHintLogicalPrompt({
        hanzi: `好`,
        meaning: {
          hanziWord: `好`,
          glosses: [`good`, `well`, `fine`],
        },
        components: [
          { hanzi: `女`, meaning: `woman` },
          { hanzi: `子`, label: `child` },
        ],
        count: 4,
      });

      expect(result.model).toBe(`gpt-5.4`);
      expect(buildMeaningHintLogicalPrompt.strategy).toBe(`logical`);
      expect(result.messages[1]?.content).toContain(
        `"disambiguation": "well; fine"`,
      );
      expect(result.messages[1]?.content).toContain(`"gloss": "woman"`);
      expect(result.messages[1]?.content).toContain(`"gloss": "child"`);
    });
  },
);
