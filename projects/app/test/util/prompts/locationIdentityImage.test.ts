import type { LocationSpec } from "#data/model.js";
import { buildLocationIdentityImagePrompt } from "#util/prompts/locationIdentityImage.ts";
import { describe, expect, test } from "vitest";
import { fmtImagePromptForSnapshot } from "./helpers";

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
      const prompt = buildLocationIdentityImagePrompt(exampleInput);

      expect(fmtImagePromptForSnapshot(prompt)).toMatchInlineSnapshot(`
        {
          "aspectRatio": "1:1",
          "messages": "
        =====================
         USER MESSAGE
        ---------------------
        [ASSET: sha256/gWfpeVUB_w_w6j5uoF79d2kKhIx40r3KrOjCrU1NV-k]
        =====================



        =====================
         USER MESSAGE
        ---------------------
        Copy the style of the previous image.
        =====================



        =====================
         USER MESSAGE
        ---------------------
        You are given a complete mnemonic location specification.

        Your task is to create the canonical portrait of this location.

        This image serves the same purpose as a person's profile photo or a trading card illustration, except for a place.

        Whenever a learner sees this portrait, they should instantly think:

        "Ah, that's the Aircraft hangar."

        The portrait will be displayed as a square thumbnail throughout the application. It should remain recognizable when scaled down, but it is not a tiny icon or logo. It should feel like the definitive visual identity of the location.

        Use the entire location specification as context, especially:

        - the location name;
        - recognition hooks;
        - location-wide design rules;
        - the proposed emblem concept, if present.

        The individual sets are provided only as supporting context. Do not depict one particular set or viewpoint.

        Artistic goal:

        Capture the essence of the location, not a documentary view of it.

        The portrait should evoke the place the same way a memorable trading card, game location, or storybook illustration evokes a world.

        Someone familiar with the location should immediately recognize it from this portrait alone.

        Composition:

        - Choose a single, iconic composition that best represents the location.
        - Do not try to show every important feature.
        - Identify the strongest visual identity of the location and build the portrait around that.
        - The composition should have one clear focal point.
        - Background elements should reinforce the location without competing for attention.

        Design principles:

        - Represent the overall location rather than one particular set or mnemonic story.
        - Prioritize recognizability over realism.
        - Simplify unnecessary detail while preserving the character of the place.
        - Include only elements that strengthen recognition.
        - Every visible element should justify its presence.
        - Avoid visual clutter.
        - Avoid generic stock-art compositions.
        - Avoid tiny details that disappear at thumbnail size.
        - Avoid people unless they are an inseparable part of the location's identity.

        Recognition test:

        - Would someone familiar with this location recognize it immediately?
        - Is there a stronger, simpler composition?
        - Is there anything that can be removed without reducing recognition?
        - Does this feel like the portrait of a place rather than an illustration of a scene?

        The goal is not to document the location.

        The goal is to create the single image that people will forever associate with this location.

        <input>
        {
          "locationSpec": {
            "location": "Aircraft hangar",
            "recognitionHooks": [
              "giant hangar doors",
              "aircraft in open bay",
              "steel roof trusses",
              "vast concrete floor",
              "high open interior"
            ],
            "designRules": [
              "The hangar reads as one huge clear-span interior rather than a maze of rooms.",
              "An aircraft sits directly in the open bay and clearly reads within the building volume."
            ],
            "emblem": {
              "subject": "aircraft nose framed by hangar doors",
              "rationale": "The aircraft identifies aviation, while the oversized doorway distinguishes a hangar from an airport or aircraft alone."
            },
            "sets": {
              "arrival": {
                "name": "Hangar entrance",
                "designRules": [
                  "The approach is from the apron toward a towering open doorway."
                ],
                "canonicalFraming": "The viewer stands on the apron just outside the open hangar doors and looks inward.",
                "avoidFraming": [
                  "Views so close that the doorway no longer reads as enormous"
                ]
              },
              "heart": {
                "name": "Main bay",
                "designRules": [
                  "The composition is dominated by the aircraft and the vast open volume around it."
                ],
                "canonicalFraming": "The viewer stands on the hangar floor a short distance from the aircraft, slightly off center.",
                "avoidFraming": [
                  "Wide empty interiors with the aircraft reduced to a tiny detail"
                ]
              },
              "below": {
                "name": "Under the wing",
                "designRules": [
                  "The viewer is positioned low beneath part of the aircraft while still on the hangar floor."
                ],
                "canonicalFraming": "The viewer stands low on the hangar floor beneath the aircraft and looks outward past its underside.",
                "avoidFraming": [
                  "Generic undercarriage close-ups with no sense of the hangar around them"
                ]
              },
              "ascent": {
                "name": "Aircraft stairs",
                "designRules": [
                  "The climb uses a mobile stair or service platform positioned directly against the aircraft inside the hangar."
                ],
                "canonicalFraming": "The viewer stands partway up the aircraft stairs or service platform and looks upward along the climb.",
                "avoidFraming": [
                  "Views that crop out the sense of upward movement"
                ]
              },
              "summit": {
                "name": "Service platform at the aircraft",
                "designRules": [
                  "The destination is an elevated platform beside the aircraft rather than a distant upper walkway."
                ],
                "canonicalFraming": "The viewer stands on an elevated service platform beside the aircraft and looks out across the hangar interior.",
                "avoidFraming": [
                  "Pure bird's-eye views that turn the hangar into a flat plan"
                ]
              }
            }
          }
        }
        </input>
        =====================
        ",
          "model": "gemini-3.1-flash-lite-image",
          "resolution": "1K",
          "systemInstruction": "You are creating the canonical portrait of a place, not a documentary scene.

        The image should feel like a polished trading card illustration or encyclopedia plate for a memorable fictional location.

        Style:

        - Clean, stylized illustration.
        - Timeless environment art.
        - Square composition that remains recognizable at thumbnail size.
        - One dominant focal point.
        - Strong silhouette and confident shapes.
        - Natural but slightly simplified color.
        - Restrained detail.
        - Real atmospheric depth without visual clutter.
        - Lighting should establish mood and direct attention to the focal point.
        - Background elements should support recognition without competing for attention.

        Avoid:

        - Photographic realism.
        - Text, labels, logos, symbols, or decorative borders.
        - People unless they are inseparable from the location's identity.
        - Generic stock-art compositions.
        - Tiny details that disappear at thumbnail size.
        - Wide panoramic views.",
        }
      `);
    });
  },
);
