import {
  buildLocationSetIdentityImagePrompt,
  locationSetIdentityImagePromptInputSchema,
} from "#util/prompts/locationSetIdentityImage.ts";
import type { LocationSetIdentityImagePromptInputType } from "#util/prompts/locationSetIdentityImage.ts";
import { describe, expect, test } from "vitest";

const exampleInput: LocationSetIdentityImagePromptInputType = {
  input: {
    locationSpec: {
      location: `Haunted castle`,
      recognitionHooks: [
        `spiked towers and turrets`,
        `pointed arched windows`,
        `full moon silhouette`,
        `wrought-iron gate`,
        `crooked stone staircase`,
      ],
      designRules: [
        `Use a massive dark stone castle silhouette with steep roofs, jagged battlements, and uneven towers.`,
      ],
      sets: {
        arrival: {
          name: `Front Gate`,
          designRules: [
            `A tall wrought-iron gate stands between dark stone posts or outer walls.`,
          ],
          canonicalFraming: `The viewer stands outside the grounds on the path, looking through or up at the wrought-iron gate toward the castle facade.`,
          avoidFraming: [
            `Close view of only the gate hardware with no castle visible`,
          ],
        },
        heart: {
          name: `Great Hall`,
          designRules: [
            `A vast gothic hall stretches upward with pointed arches, high windows, and a shadowed ceiling.`,
          ],
          canonicalFraming: `The viewer stands near the entrance of the Great Hall and looks down the length of the room.`,
          avoidFraming: [
            `Tight still life of tableware or candles with no hall scale`,
          ],
        },
        below: {
          name: `Dungeon`,
          designRules: [
            `Low stone chambers and narrow corridors sit beneath heavy arches or vaulted ceilings.`,
          ],
          canonicalFraming: `The viewer stands in a low stone corridor or cell entrance, looking toward iron bars or a heavy barred door under a rough arch.`,
          avoidFraming: [
            `Bright cellar storage room without bars or restraints`,
          ],
        },
        ascent: {
          name: `Spiral Staircase`,
          designRules: [
            `A narrow stone spiral staircase winds tightly upward inside a tower.`,
          ],
          canonicalFraming: `The viewer stands on the lower steps inside the tower, looking upward along the twisting stone spiral.`,
          avoidFraming: [`Straight grand staircase in a palace foyer`],
        },
        summit: {
          name: `Tower Top`,
          designRules: [
            `The highest point is an open or partly ruined tower platform ringed by battlements.`,
          ],
          canonicalFraming: `The viewer stands on the tower platform near the battlements and looks outward over the castle roofs toward the moonlit sky.`,
          avoidFraming: [`Interior attic room with no view or battlements`],
        },
      },
    },
    targetSet: `below`,
  },
};

describe(
  `buildLocationSetIdentityImagePrompt` satisfies HasNameOf<
    typeof buildLocationSetIdentityImagePrompt
  >,
  () => {
    test(`builds image prompt with pinned Gemini settings and single input payload`, () => {
      const result = buildLocationSetIdentityImagePrompt(exampleInput);

      expect(result.model).toBe(`gemini-3.1-flash-lite-image`);
      expect(result.aspectRatio).toBe(`5:4`);
      expect(result.resolution).toBe(`1K`);
      expect(result.messages).toHaveLength(1);

      const content = result.messages[0]?.content ?? ``;
      expect(content).toContain(`<input>`);
      expect(content).toContain(`"location": "Haunted castle"`);
      expect(content).toContain(`"targetSet": "below"`);
      expect(content).not.toContain(`<targetSet>`);
      expect(content).not.toContain(`<locationSpec>`);

      const systemInstruction = result.systemInstruction ?? ``;
      expect(systemInstruction).toContain(`Loose animator location sketch.`);
      expect(systemInstruction).toContain(`No color.`);
      expect(systemInstruction).toContain(`No shading.`);
      expect(systemInstruction).not.toContain(`targetSet`);
      expect(systemInstruction).not.toContain(`canonical framing`);
    });

    test(`rejects invalid target set`, () => {
      const result = locationSetIdentityImagePromptInputSchema.safeParse({
        input: {
          ...exampleInput.input,
          targetSet: `attic`,
        },
      });

      expect(result.success).toBe(false);
    });

    test(`is strict at top level and input level`, () => {
      const topLevel = locationSetIdentityImagePromptInputSchema.safeParse({
        ...exampleInput,
        extra: true,
      });

      const nested = locationSetIdentityImagePromptInputSchema.safeParse({
        input: {
          ...exampleInput.input,
          extra: true,
        },
      });

      expect(topLevel.success).toBe(false);
      expect(nested.success).toBe(false);
    });
  },
);
