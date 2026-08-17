import { describe, expect, test, vi } from "vitest";
import { buildLocationSpecPrompt } from "#util/prompts/locationSpec.js";
import { fmtChatPromptForSnapshot } from "./helpers";

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

      Before finalising, silently check:

      - every rule is observable
      - every rule adds a distinct idea
      - redundant rules have been merged
      - no lore or invented proper names were introduced
      - props provide useful material for scenes without becoming mandatory clutter
      - another artist could recreate essentially the same location from the specification

      Generate the canonical location specification for the following input.

      <input>
      {"location":"Pirate ship"}
      </input>
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
                "description": "The name of the location using normal English capitalization as it would appear inside a sentence, not title capitalization. Proper nouns retain their normal capitalization; common nouns are lowercase.",
                "type": "string",
              },
              "recognitionHooks": {
                "items": {
                  "type": "string",
                },
                "type": "array",
              },
            },
            "required": [
              "location",
              "recognitionHooks",
              "designRules",
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
