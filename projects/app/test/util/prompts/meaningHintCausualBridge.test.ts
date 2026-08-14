import { describe, expect, test } from "vitest";
import { fmtChatPromptForSnapshot } from "./helpers";
import { buildMeaningHintCausualBridgePrompt } from "#util/prompts/meaningHintCausualBridge.js";

describe(`buildMeaningHintCausualBridgePrompt`, () => {
  test(`snapshot`, () => {
    const prompt = buildMeaningHintCausualBridgePrompt({
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

    expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
        {
          "messages": "
        =====================
         SYSTEM MESSAGE
        ---------------------
        You are a helpful assistant that creates short mnemonic explanations.

        You will be given:
        - A target: the concept the learner wants to remember.
        - A list of cues: ideas the learner already knows.

        Your task is to write a short explanation that uses every cue to make the target easy to remember.

        Guidelines:
        - Keep the explanation concise. One short sentence is preferred; use two only if necessary.
        - Use plain, natural, everyday English.
        - Prefer the simplest explanation that works.
        - Make the target the natural consequence of the events in the explanation.
        - Prefer a single, direct cause-and-effect relationship.
        - Unless the cues explicitly specify another actor, use the learner ("I") as the subject of any action.
        - Avoid introducing intermediate concepts. Connect the cues to the target as directly as possible.
        - Every cue should play an essential role in producing the target.
        - Avoid unnecessary characters, objects, settings, or descriptive details.
        - Avoid dramatic, magical, poetic, exaggerated, or theatrical language.
        - Avoid introducing concepts that are not provided unless they are required for natural English.
        - Avoid merely listing the concepts together. They should interact meaningfully.
        - The explanation should feel obvious in hindsight, as though the cue naturally follows from the concepts.

        The learner should be able to reconstruct the target simply by remembering how the cues interacted.

        Generate multiple distinct ideas that use different relationships or perspectives rather than minor wording variations.
        =====================



        =====================
         USER MESSAGE
        ---------------------
        Generate 3 mnemonic stories:

        <data>
        {"target":"good","cues":["woman","child"]}
        </data>
        =====================
        ",
          "model": "gpt-5.4",
          "reasoningEffort": "none",
          "schema": {
            "name": "meaningHintOutputSchema",
            "schema": {
              "additionalProperties": false,
              "properties": {
                "suggestions": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "explanation": {
                        "nullable": true,
                        "type": "string",
                      },
                      "hint": {
                        "type": "string",
                      },
                    },
                    "required": [
                      "hint",
                      "explanation",
                    ],
                    "type": "object",
                  },
                  "type": "array",
                },
              },
              "required": [
                "suggestions",
              ],
              "title": "meaningHintOutputSchema",
              "type": "object",
            },
            "type": "json_schema",
          },
        }
      `);
  });
});
