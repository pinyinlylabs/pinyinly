import { describe, expect, test } from "vitest";
import { fmtChatPromptForSnapshot } from "./helpers";
import { buildMeaningHintLogicalPrompt } from "#util/prompts/meaningHintLogical.js";

describe(`buildMeaningHintLogicalPrompt`, () => {
  test(`snapshot`, () => {
    const prompt = buildMeaningHintLogicalPrompt({
      hanzi: `好`,
      meaning: {
        hanziWord: `好`,
        glosses: [`good`, `well`, `fine`],
      },
      components: [
        { hanzi: `女`, meaning: `woman` },
        { hanzi: `子`, label: `child` },
      ],
      count: 4,
    });

    expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
        {
          "messages": "
        =====================
         SYSTEM MESSAGE
        ---------------------
        You're a helpful assistant that generates memorable mnemonic phrases for Chinese characters. Your job is to help the learner remember what a Hanzi means using just its visual components.

        Rules:
        - Keep mnemonics realistic, intuitive, concrete and memorable.
        - Keep mnemonics short, 1-2 sentences is optimal.
        - Leverage the logical connection between the components to explain the target character.
        - The disambiguation values are form/meaning guidance only, do not include them directly in the hint.
        - Anchor on the exact gloss values, don't use them as a base stem for derivative words.
        - Only focus on meaning recall, not pronunciation.
        - Avoid introducing unnecessary elements that could distract from the core elements.
        - Put the hanzi after each gloss in parenthesis: <gloss> (<hanzi>)
        =====================



        =====================
         USER MESSAGE
        ---------------------
        Generate 4 distinct mnemonic hints:

        <data>
        {"targetCharacter":{"hanzi":"好","gloss":"good","disambiguation":"well; fine"},"components":[{"hanzi":"女","gloss":"woman"},{"hanzi":"子","gloss":"child"}]}
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
