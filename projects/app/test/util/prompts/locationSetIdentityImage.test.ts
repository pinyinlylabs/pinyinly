import type { LocationSpec } from "#data/model.js";
import { buildLocationSetIdentityImagePrompt } from "#util/prompts/locationSetIdentityImage.ts";
import { describe, expect, test } from "vitest";
import { fmtImagePromptForSnapshot } from "./helpers";

type LocationSetIdentityImagePromptInputType = {
  input: {
    locationSpec: LocationSpec;
    targetSet: `arrival` | `heart` | `below` | `ascent` | `summit`;
  };
};

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
          props: [`Wrought-iron gate`],
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
          props: [`Long banquet table with candelabras`],
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
          props: [`Iron bars`, `Chains`, `Stone walls`],
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
          props: [`Stone steps`, `Wrought-iron railing`],
          designRules: [
            `A narrow stone spiral staircase winds tightly upward inside a tower.`,
          ],
          canonicalFraming: `The viewer stands on the lower steps inside the tower, looking upward along the twisting stone spiral.`,
          avoidFraming: [`Straight grand staircase in a palace foyer`],
        },
        summit: {
          name: `Tower Top`,
          props: [`Battlements`, `Flagpole`],
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
      const prompt = buildLocationSetIdentityImagePrompt(exampleInput);

      expect(fmtImagePromptForSnapshot(prompt)).toMatchInlineSnapshot(`
        {
          "aspectRatio": "5:4",
          "messages": "
        =====================
         USER MESSAGE
        ---------------------
        Create an image for one set from the supplied location specification.

        Use the full location specification for global visual consistency.

        Use only the selected targetSet for the scene content and canonical framing.

        Do not blend in the framing, viewpoint, or defining setup of any other set.

        Instructions:

        - Preserve the location-wide recognition hooks and design rules where they are naturally visible.
        - Follow the selected set's name, design rules, and canonical framing.
        - Respect its avoidFraming rules.
        - Do not invent a different set.
        - Do not add characters or story actions.
        - Do not reinterpret the selected set as another floor, room, or viewpoint.
        - Let the system-level image style instructions control the rendering style.

        <input>
        {
          "locationSpec": {
            "location": "Haunted castle",
            "recognitionHooks": [
              "spiked towers and turrets",
              "pointed arched windows",
              "full moon silhouette",
              "wrought-iron gate",
              "crooked stone staircase"
            ],
            "designRules": [
              "Use a massive dark stone castle silhouette with steep roofs, jagged battlements, and uneven towers."
            ],
            "sets": {
              "arrival": {
                "name": "Front Gate",
                "props": [
                  "Wrought-iron gate"
                ],
                "designRules": [
                  "A tall wrought-iron gate stands between dark stone posts or outer walls."
                ],
                "canonicalFraming": "The viewer stands outside the grounds on the path, looking through or up at the wrought-iron gate toward the castle facade.",
                "avoidFraming": [
                  "Close view of only the gate hardware with no castle visible"
                ]
              },
              "heart": {
                "name": "Great Hall",
                "props": [
                  "Long banquet table with candelabras"
                ],
                "designRules": [
                  "A vast gothic hall stretches upward with pointed arches, high windows, and a shadowed ceiling."
                ],
                "canonicalFraming": "The viewer stands near the entrance of the Great Hall and looks down the length of the room.",
                "avoidFraming": [
                  "Tight still life of tableware or candles with no hall scale"
                ]
              },
              "below": {
                "name": "Dungeon",
                "props": [
                  "Iron bars",
                  "Chains",
                  "Stone walls"
                ],
                "designRules": [
                  "Low stone chambers and narrow corridors sit beneath heavy arches or vaulted ceilings."
                ],
                "canonicalFraming": "The viewer stands in a low stone corridor or cell entrance, looking toward iron bars or a heavy barred door under a rough arch.",
                "avoidFraming": [
                  "Bright cellar storage room without bars or restraints"
                ]
              },
              "ascent": {
                "name": "Spiral Staircase",
                "props": [
                  "Stone steps",
                  "Wrought-iron railing"
                ],
                "designRules": [
                  "A narrow stone spiral staircase winds tightly upward inside a tower."
                ],
                "canonicalFraming": "The viewer stands on the lower steps inside the tower, looking upward along the twisting stone spiral.",
                "avoidFraming": [
                  "Straight grand staircase in a palace foyer"
                ]
              },
              "summit": {
                "name": "Tower Top",
                "props": [
                  "Battlements",
                  "Flagpole"
                ],
                "designRules": [
                  "The highest point is an open or partly ruined tower platform ringed by battlements."
                ],
                "canonicalFraming": "The viewer stands on the tower platform near the battlements and looks outward over the castle roofs toward the moonlit sky.",
                "avoidFraming": [
                  "Interior attic room with no view or battlements"
                ]
              }
            }
          },
          "targetSet": "below"
        }
        </input>
        =====================
        ",
          "model": "gemini-3.1-flash-lite-image",
          "resolution": "1K",
          "systemInstruction": "You are drawing a memory, not an illustration.

        The goal is to create the simplest possible image that fixes the identity of a place in memory.

        Style:

        - Loose animator location sketch.
        - Clean black ink pen line drawing.
        - Plain white paper background (#FFFFFF).
        - No color.
        - No solid fill.
        - No pencil.
        - No graphite.
        - No shading.
        - No water color.
        - No thick marker pen.
        - No paint.
        - No marker.
        - No digital rendering effects.
        - No gradients.
        - No gray values.
        - No shadows.
        - No crosshatching.
        - No texture rendering.

        Draw with confident, economical lines.

        Describe form using outlines and only the minimum interior detail needed for recognition.

        Leave large areas of the page completely white.

        Simplify aggressively.

        Prefer iconic shapes over realistic detail.

        Every line should help answer: what place is this?

        Avoid decorative detail that does not strengthen recognition.

        The drawing should feel deliberately unfinished so the viewer completes the scene mentally.

        It should resemble an animator's exploratory location sketch from a sketchbook, not finished concept art.

        The viewer should recognize the place at a quick glance and be able to reconstruct it later from memory.",
        }
      `);
    });
  },
);
