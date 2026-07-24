import type { LocationSpec } from "#data/model.js";
import { buildLocationIdentityImagePrompt } from "#util/prompts/locationIdentityImage.ts";
import { describe, expect, test } from "vitest";

type LocationIdentityImagePromptInputType = {
  input: {
    locationSpec: LocationSpec;
  };
};

const exampleInput: LocationIdentityImagePromptInputType = {
  input: {
    locationSpec: {
      location: `Aircraft hangar`,
      recognitionHooks: [
        `giant hangar doors`,
        `aircraft in open bay`,
        `steel roof trusses`,
        `vast concrete floor`,
        `high open interior`,
      ],
      designRules: [
        `The hangar reads as one huge clear-span interior rather than a maze of rooms.`,
        `An aircraft sits directly in the open bay and clearly reads within the building volume.`,
      ],
      emblem: {
        subject: `aircraft nose framed by hangar doors`,
        rationale: `The aircraft identifies aviation, while the oversized doorway distinguishes a hangar from an airport or aircraft alone.`,
      },
      sets: {
        arrival: {
          name: `Hangar entrance`,
          designRules: [
            `The approach is from the apron toward a towering open doorway.`,
          ],
          canonicalFraming: `The viewer stands on the apron just outside the open hangar doors and looks inward.`,
          avoidFraming: [
            `Views so close that the doorway no longer reads as enormous`,
          ],
        },
        heart: {
          name: `Main bay`,
          designRules: [
            `The composition is dominated by the aircraft and the vast open volume around it.`,
          ],
          canonicalFraming: `The viewer stands on the hangar floor a short distance from the aircraft, slightly off center.`,
          avoidFraming: [
            `Wide empty interiors with the aircraft reduced to a tiny detail`,
          ],
        },
        below: {
          name: `Under the wing`,
          designRules: [
            `The viewer is positioned low beneath part of the aircraft while still on the hangar floor.`,
          ],
          canonicalFraming: `The viewer stands low on the hangar floor beneath the aircraft and looks outward past its underside.`,
          avoidFraming: [
            `Generic undercarriage close-ups with no sense of the hangar around them`,
          ],
        },
        ascent: {
          name: `Aircraft stairs`,
          designRules: [
            `The climb uses a mobile stair or service platform positioned directly against the aircraft inside the hangar.`,
          ],
          canonicalFraming: `The viewer stands partway up the aircraft stairs or service platform and looks upward along the climb.`,
          avoidFraming: [`Views that crop out the sense of upward movement`],
        },
        summit: {
          name: `Service platform at the aircraft`,
          designRules: [
            `The destination is an elevated platform beside the aircraft rather than a distant upper walkway.`,
          ],
          canonicalFraming: `The viewer stands on an elevated service platform beside the aircraft and looks out across the hangar interior.`,
          avoidFraming: [
            `Pure bird's-eye views that turn the hangar into a flat plan`,
          ],
        },
      },
    },
  },
};

describe(
  `buildLocationIdentityImagePrompt` satisfies HasNameOf<
    typeof buildLocationIdentityImagePrompt
  >,
  () => {
    test(`builds a square image prompt with trading-card location guidance`, () => {
      const result = buildLocationIdentityImagePrompt(exampleInput);

      expect(result.model).toBe(`gemini-3.1-flash-lite-image`);
      expect(result.aspectRatio).toBe(`1:1`);
      expect(result.resolution).toBe(`1K`);
      expect(result.messages).toHaveLength(3);

      const styleImageMessage = result.messages[0];
      expect(styleImageMessage).toEqual({
        role: `user`,
        kind: `asset`,
        assetId: `sha256/gWfpeVUB_w_w6j5uoF79d2kKhIx40r3KrOjCrU1NV-k`,
      });

      const styleInstructionMessage = result.messages[1];
      expect(styleInstructionMessage).toEqual({
        role: `user`,
        kind: `text`,
        content: `Copy the style of the previous image.`,
      });

      const content =
        result.messages[2] != null && result.messages[2].kind === `text`
          ? result.messages[2].content
          : ``;
      expect(content).toContain(`<input>`);
      expect(content).toContain(`"location": "Aircraft hangar"`);
      expect(content).toContain(
        `"subject": "aircraft nose framed by hangar doors"`,
      );
      expect(content).not.toContain(`<locationSpec>`);

      const systemInstruction = result.systemInstruction ?? ``;
      expect(systemInstruction).toContain(`trading card illustration`);
      expect(systemInstruction).toContain(`Square composition`);
      expect(systemInstruction).toContain(
        `Text, labels, logos, symbols, or decorative borders.`,
      );
      expect(systemInstruction).not.toContain(`Aircraft hangar`);
    });
  },
);
