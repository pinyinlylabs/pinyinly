import {
  buildPronunciationHintFantasyPrompt,
  buildPronunciationHintRealisticPrompt,
} from "#util/prompts/pronunciationHint.ts";
import { describe, expect, test } from "vitest";

describe(
  `buildPronunciationHintFantasyPrompt` satisfies HasNameOf<
    typeof buildPronunciationHintFantasyPrompt
  >,
  () => {
    test(`builds a fantasy prompt with expected metadata`, () => {
      const result = buildPronunciationHintFantasyPrompt({
        leadCharacter: { name: `Ethan` },
        location: { name: `Gong Cha bathroom` },
        cue: { word: `use` },
        count: 3,
      });

      expect(result.model).toBe(`gpt-5-mini`);
      expect(result.reasoningEffort).toBe(`medium`);
      expect(buildPronunciationHintFantasyPrompt.strategy).toBe(`fantasy`);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]?.content).toContain(
        `Invent vivid, memorable mini-scenes`,
      );
      expect(result.messages[1]?.content).toContain(
        `Generate 3 distinct mnemonic story ideas.`,
      );
      expect(result.messages[1]?.content).toContain(`"word": "use"`);
      expect(result.messages[1]?.content).not.toContain(`"bio":`);
    });

    test(`includes optional context when provided`, () => {
      const result = buildPronunciationHintFantasyPrompt({
        leadCharacter: { name: `Ethan`, bio: `Loud and chaotic` },
        location: { name: `Gong Cha bathroom`, description: `Cramped room` },
        cue: { word: `use`, meaning: `to employ` },
        count: 4,
      });

      expect(result.messages[1]?.content).toContain(
        `"bio": "Loud and chaotic"`,
      );
      expect(result.messages[1]?.content).toContain(
        `"description": "Cramped room"`,
      );
      expect(result.messages[1]?.content).toContain(`"meaning": "to employ"`);
    });
  },
);

describe(
  `buildPronunciationHintRealisticPrompt` satisfies HasNameOf<
    typeof buildPronunciationHintRealisticPrompt
  >,
  () => {
    test(`builds a realistic prompt with style constraints`, () => {
      const result = buildPronunciationHintRealisticPrompt({
        leadCharacter: { name: `Ethan` },
        location: { name: `Gong Cha bathroom` },
        cue: { word: `use` },
        count: 3,
      });

      expect(result.model).toBe(`gpt-5-mini`);
      expect(result.reasoningEffort).toBe(`medium`);
      expect(buildPronunciationHintRealisticPrompt.strategy).toBe(`realistic`);
      expect(result.messages[0]?.content).toContain(
        `Keep scenes realistic and plausible in everyday life.`,
      );
      expect(result.messages[1]?.content).toContain(
        `Generate 3 distinct mnemonic story ideas.`,
      );
    });
  },
);
