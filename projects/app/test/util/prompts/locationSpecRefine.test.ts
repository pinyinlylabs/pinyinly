import { describe, expect, test } from "vitest";
import { fmtChatPromptForSnapshot, makeLocationSpec } from "./helpers";
import { buildLocationSpecRefinePrompt } from "#util/prompts/locationSpecRefine.js";

describe(`buildLocationSpecRefinePrompt`, () => {
  test(`snapshot`, () => {
    const prompt = buildLocationSpecRefinePrompt({
      criticisms: [],
      location: `Pirate ship`,
      locationSpec: makeLocationSpec(`Pirate ship`),
    });

    expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
      {
        "messages": "
      =====================
       SYSTEM MESSAGE
      ---------------------
      You revise location specifications based on evaluator criticisms.

      You are given:

      - the original location,
      - the current location specification,
      - a list of criticisms.

      Return one revised location specification that resolves as many criticisms as possible while preserving the strongest existing parts.

      Rules:

      - Keep the supplied location unchanged.
      - Preserve the five required sets and their fixed order.
      - Do not add new fields.
      - Do not invent lore, proper nouns, or backstory.
      - Use the simplest widely recognised names.
      - Keep the recognition hooks compact and iconic.
      - Keep design rules observable and non-redundant.

      Fixes should be targeted.

      If a criticism says a set choice is weak, replace the set choice rather than merely editing its wording.

      If a criticism says a design rule is weak, improve the rule without redesigning the whole set.

      If a criticism says framing is weak, fix the framing without changing the set itself.

      If a criticism says rules are redundant or overly specific, prune them.

      Do not include analysis.

      Return only the revised location specification.
      =====================



      =====================
       USER MESSAGE
      ---------------------
      Revise the following location specification based on the criticisms.

      <data>
      {
        "criticisms": [],
        "location": "Pirate ship",
        "locationSpec": {
          "location": "Pirate ship",
          "sets": {
            "arrival": {
              "name": "dock"
            },
            "heart": {
              "name": "captain's cabin"
            },
            "below": {
              "name": "cargo hold"
            },
            "ascent": {
              "name": "stairs"
            },
            "summit": {
              "name": "crow's nest"
            }
          }
        }
      }
      </data>
      =====================
      ",
        "model": "gpt-5.5",
        "reasoningEffort": "low",
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
