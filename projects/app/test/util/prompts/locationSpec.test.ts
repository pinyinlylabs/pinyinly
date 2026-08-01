import { describe, expect, test, vi } from "vitest";
import {
  buildLocationSpecPrompt,
  locationSpecWithDetailSchema,
} from "#util/prompts/locationSpec.js";
import {
  fmtChatPromptForSnapshot,
  makeLocationSpecWithDetail,
} from "./helpers";

vi.mock(`#server/lib/ai.js`, async () => {
  const actual =
    await vi.importActual<typeof import("#server/lib/ai.js")>(
      `#server/lib/ai.js`,
    );

  return {
    ...actual,
    requestOpenAiResponseJson: vi.fn(),
  };
});

describe(`locationSpecSchema`, () => {
  test(`accepts exactly five keyed sets`, () => {
    const spec = makeLocationSpecWithDetail(`Pirate ship`);

    expect(locationSpecWithDetailSchema.parse(spec)).toEqual(spec);
  });

  test(`rejects unexpected fields inside sets`, () => {
    const spec = {
      ...makeLocationSpecWithDetail(`Pirate ship`),
      sets: {
        ...makeLocationSpecWithDetail(`Pirate ship`).sets,
        arrival: {
          ...makeLocationSpecWithDetail(`Pirate ship`).sets.arrival,
          role: `arrival`,
        },
      },
    };

    expect(() => locationSpecWithDetailSchema.parse(spec)).toThrow(
      /unrecognized_key|unrecognized_keys/u,
    );
  });
});

describe(`buildLocationSpecPrompt`, () => {
  test(`snapshot`, () => {
    const prompt = buildLocationSpecPrompt({
      location: `Pirate ship`,
    });

    expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
      {
        "messages": "
      =====================
       SYSTEM MESSAGE
      ---------------------
      You are an expert production designer creating the canonical design specification for a recurring fictional location.

      This specification will be used by artists and image-generation models to create hundreds of illustrations over many years.

      Your goal is not to design a unique location or describe a single illustration.

      Your goal is to define the version of the location that already exists in people's shared imagination.

      Future illustrations should feel like different visits to the same location.

      Whenever originality and recognisability disagree, choose recognisability.

      Whenever realism and recognisability disagree, choose recognisability.

      Do not invent lore, history, proper nouns, named landmarks, or backstory.

      Prefer timeless, widely recognised interpretations over clever or unusual ones.

      ## Recognition hooks

      List the 3–5 strongest recurring visual ideas that instantly identify the location.

      Hooks should be simple iconic objects, landmarks, silhouettes, or architectural features.

      Keep each hook to only a few words.

      Hooks should remain meaningful across different artistic styles.

      ## Global design rules

      Write concise recurring visual rules that preserve the identity of the location.

      Every rule must describe something directly observable in an illustration.

      Prefer visual outcomes over implementation details or abstract intentions.

      Prefer large recurring ideas over small decorative details.

      Every rule should introduce one new visual idea.

      Merge redundant rules.

      Avoid unnecessary specificity.

      ## Canonical sets

      Every location has exactly five recurring sets.

      The five sets should form a coherent traversal through the location.

      Each set should be a persistent and recognisable part of the location itself, not merely somewhere nearby or a route used to reach it.

      Prefer spaces that are inside the location or inseparably connected to it over surrounding landscape, roads, parking areas, or unrelated approach routes.

      ### Arrival

      Where visitors first enter or reach the location itself.

      Choose a recognisable threshold, entrance area, gate, doorway, platform, dock, or immediately adjoining space.

      Do not choose a distant approach route when a stronger entrance space exists.

      ### Heart

      The highlight of visiting the location.

      Imagine giving a first-time visitor a tour.

      If you could show them only one destination before they had to leave, where would you take them?

      Choose the destination visitors are most excited to reach and most enjoy remembering.

      Do not choose a circulation hub merely because it connects the rest of the environment or provides the best overview.

      Choose the destination, not the hub.

      ### Below

      The canonical lower part of the location.

      Choose a distinct lower destination rather than merely another corridor, stairway, or transitional route.

      Prefer a memorable room, chamber, level, enclosed area, hidden space, or environmental feature that clearly differs from the Ascent.

      ### Ascent

      The canonical route upward within the location.

      Prefer staircases, ramps, catwalks, ladders, elevators, escalators, or other persistent architectural features that connect the lower parts of the location to its highest destination.

      Do not choose an exterior approach unless the ascent itself is one of the location's defining and most recognisable features.

      The Ascent should read primarily as movement upward, while the Below should read as a destination.

      ### Summit

      The highest significant destination and the natural reward for completing the ascent.

      ## Set specification

      For each set:

      - use the simplest widely recognised name
      - write concise observable design rules
      - list 4–8 iconic props
      - define a canonical framing
      - list viewpoints that weaken recognition

      ## Props

      Props are the recurring visual vocabulary available within a set.

      A prop may be:

      - a movable object
      - a fixed architectural feature
      - a mechanism
      - a fixture
      - a terrain feature
      - an environmental element
      - a decorative object with strong mnemonic value

      Choose props that make the set easier to recognise, imagine, and use in memorable scenes.

      Prefer objects or features that an actor could notice, touch, carry, climb, activate, break, avoid, hide behind, or otherwise interact with.

      Props should be concrete and visually distinct.

      Prefer iconic, widely associated elements over generic clutter.

      Good props reinforce the identity of the particular set, not merely the overall location.

      Do not list vague qualities such as darkness, danger, grandeur, age, mystery, or atmosphere as props.

      Do not list interchangeable background clutter unless it meaningfully supports recognition.

      Props are optional recurring ingredients, not a checklist. An illustration may use only the subset most useful for that scene.

      Avoid making every prop mandatory in every illustration.

      ## Canonical framing

      The canonical framing should state:

      - where the viewer stands
      - what they look toward
      - what dominates the composition
      - which recognition hooks should remain visible when naturally possible
      - which set-specific props should remain visible when they strengthen recognition

      Before finalising, silently check:

      - every rule is observable
      - every rule adds a distinct idea
      - redundant rules have been merged
      - no lore or invented proper names were introduced
      - each set is a natural fit for the supplied location
      - the five sets form a coherent traversal
      - the Below and Ascent are visually and functionally distinct
      - the Heart is genuinely the highlight of visiting the location
      - each prop is concrete, visually useful, and associated with its set
      - props provide useful material for scenes without becoming mandatory clutter
      - another artist could recreate essentially the same location from the specification
      =====================



      =====================
       USER MESSAGE
      ---------------------
      Generate the canonical location specification for the following input.

      <data>
      {
        "location": "Pirate ship"
      }
      </data>
      =====================
      ",
        "model": "gpt-5.4",
        "reasoningEffort": "medium",
        "schema": {
          "name": "locationSpecWithDetailSchema",
          "schema": {
            "additionalProperties": false,
            "properties": {
              "designRules": {
                "items": {
                  "type": "string",
                },
                "type": "array",
              },
              "location": {
                "type": "string",
              },
              "recognitionHooks": {
                "items": {
                  "type": "string",
                },
                "type": "array",
              },
              "sets": {
                "additionalProperties": false,
                "properties": {
                  "arrival": {
                    "additionalProperties": false,
                    "properties": {
                      "avoidFraming": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                      "canonicalFraming": {
                        "type": "string",
                      },
                      "designRules": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                      "name": {
                        "type": "string",
                      },
                      "props": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                    },
                    "required": [
                      "name",
                      "props",
                      "designRules",
                      "canonicalFraming",
                      "avoidFraming",
                    ],
                    "type": "object",
                  },
                  "ascent": {
                    "additionalProperties": false,
                    "properties": {
                      "avoidFraming": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                      "canonicalFraming": {
                        "type": "string",
                      },
                      "designRules": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                      "name": {
                        "type": "string",
                      },
                      "props": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                    },
                    "required": [
                      "name",
                      "props",
                      "designRules",
                      "canonicalFraming",
                      "avoidFraming",
                    ],
                    "type": "object",
                  },
                  "below": {
                    "additionalProperties": false,
                    "properties": {
                      "avoidFraming": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                      "canonicalFraming": {
                        "type": "string",
                      },
                      "designRules": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                      "name": {
                        "type": "string",
                      },
                      "props": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                    },
                    "required": [
                      "name",
                      "props",
                      "designRules",
                      "canonicalFraming",
                      "avoidFraming",
                    ],
                    "type": "object",
                  },
                  "heart": {
                    "additionalProperties": false,
                    "properties": {
                      "avoidFraming": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                      "canonicalFraming": {
                        "type": "string",
                      },
                      "designRules": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                      "name": {
                        "type": "string",
                      },
                      "props": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                    },
                    "required": [
                      "name",
                      "props",
                      "designRules",
                      "canonicalFraming",
                      "avoidFraming",
                    ],
                    "type": "object",
                  },
                  "summit": {
                    "additionalProperties": false,
                    "properties": {
                      "avoidFraming": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                      "canonicalFraming": {
                        "type": "string",
                      },
                      "designRules": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                      "name": {
                        "type": "string",
                      },
                      "props": {
                        "items": {
                          "type": "string",
                        },
                        "type": "array",
                      },
                    },
                    "required": [
                      "name",
                      "props",
                      "designRules",
                      "canonicalFraming",
                      "avoidFraming",
                    ],
                    "type": "object",
                  },
                },
                "required": [
                  "arrival",
                  "heart",
                  "below",
                  "ascent",
                  "summit",
                ],
                "type": "object",
              },
            },
            "required": [
              "location",
              "recognitionHooks",
              "designRules",
              "sets",
            ],
            "title": "locationSpecWithDetailSchema",
            "type": "object",
          },
          "type": "json_schema",
        },
      }
    `);
  });
});
