import { describe, expect, test } from "vitest";
import {
  buildLocationPopulateSetDescriptionPrompt,
  locationPopulateSetDescriptionInputSchema,
} from "#util/prompts/locationPopulateSetDescription.js";
import type { LocationSpecWithDetail } from "#util/prompts/locationSpec.js";

function makeLocationSpec(location: string): LocationSpecWithDetail {
  return {
    location,
    recognitionHooks: [`mast`, `bow`, `anchor`],
    designRules: [`Keep the hull dominant in the composition.`],
    sets: {
      arrival: {
        name: `dock`,
        props: [],
        designRules: [`Show the gangplank and mooring ropes.`],
        canonicalFraming: `View from the dock looking toward the deck entrance.`,
        avoidFraming: [`Do not frame it as a distant open-sea panorama.`],
      },
      heart: {
        name: `captain's cabin`,
        props: [`Desk with a map on it`],
        designRules: [`Show the richest interior detail.`],
        canonicalFraming: `View from the doorway looking toward the captain's chair and desk.`,
        avoidFraming: [`Do not reduce it to a plain hallway.`],
      },
      below: {
        name: `cargo hold`,
        props: [`Barrels`],
        designRules: [`Show stacked crates and a low ceiling.`],
        canonicalFraming: `View from knee height looking into the lower hold.`,
        avoidFraming: [`Do not frame it like the main deck.`],
      },
      ascent: {
        name: `stairs`,
        props: [`Handrail`],
        designRules: [`Show the climb upward along the mast.`],
        canonicalFraming: `View from below looking up the rigging and steps.`,
        avoidFraming: [`Do not frame it as a flat side path.`],
      },
      summit: {
        name: `crow's nest`,
        props: [`Binoculars`],
        designRules: [`Show the tiny lookout at the top of the mast.`],
        canonicalFraming: `View from the deck looking up to the lookout platform.`,
        avoidFraming: [`Do not frame it as the same as the cabin interior.`],
      },
    },
  };
}

describe(
  `buildLocationPopulateSetDescriptionPrompt` satisfies HasNameOf<
    typeof buildLocationPopulateSetDescriptionPrompt
  >,
  () => {
    test(`builds a single-description prompt from location spec and target set`, () => {
      const result = buildLocationPopulateSetDescriptionPrompt({
        locationSpec: makeLocationSpec(`Pirate ship`),
        setKey: `below`,
      });

      expect(result.model).toBe(`gpt-5.5`);
      expect(result.reasoningEffort).toBe(`low`);
      expect(result.messages).toHaveLength(2);

      const system = result.messages[0]?.content ?? ``;
      const user = result.messages[1]?.content ?? ``;

      expect(system).toContain(
        `You are an expert guidebook writer creating an illustrated guide to a collection of famous fictional locations.`,
      );
      expect(system).toContain(`Write 60–100 words.`);
      expect(system).toContain(
        `Do not invent lore, history, characters, stories, or new architectural features.`,
      );

      expect(user).toContain(`<input>`);
      expect(user).toContain(`"location": "Pirate ship"`);
      expect(user).toContain(`"set": "below"`);
      expect(user).toContain(`"name": "cargo hold"`);
      expect(user).not.toContain(`{{ input }}`);
    });

    test(`input schema rejects unexpected fields`, () => {
      const result = locationPopulateSetDescriptionInputSchema.safeParse({
        locationSpec: makeLocationSpec(`Pirate ship`),
        setKey: `heart`,
        extra: true,
      });

      expect(result.success).toBe(false);
    });
  },
);
