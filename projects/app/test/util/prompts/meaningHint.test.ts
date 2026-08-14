import { buildMeaningHintPrompt } from "#util/prompts/meaningHint.ts";
import { describe, expect, test } from "vitest";
import { fmtChatPromptForSnapshot } from "./helpers";

describe(`buildMeaningHintPrompt`, () => {
  test(`snapshot`, () => {
    const prompt = buildMeaningHintPrompt({
      hanzi: `好`,
      meaning: {
        hanziWord: `好`,
        glosses: [`good`, `well`],
      },
      components: [
        { hanzi: `女`, meaning: `woman` },
        { hanzi: `子`, label: `child`, meaning: `child` },
      ],
      count: 4,
    });

    expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
        {
          "messages": "
        =====================
         SYSTEM MESSAGE
        ---------------------
        You're a helpful assistant that creates short meaning-recognition mnemonic hints for Mandarin learners.
        Your job is to help the learner remember what a Hanzi means using its visual components.
        Use the provided component details as the core building blocks of each hint.
        Write vivid, concrete, and memorable mini-scenes or mental images.
        Focus on meaning recall, not pronunciation.
        Avoid historical or etymological claims unless directly supported by the provided component context.
        Keep each hint to 1-2 sentences.
        Prefer unusual but clear imagery over generic definitions.
        Each suggestion should help a learner recall the target meaning from the character's components.
        Do not write a plain dictionary definition.
        Do not introduce pronunciation guidance.
        If component context is provided, ground the hint in those components explicitly.
        =====================



        =====================
         USER MESSAGE
        ---------------------
        Generate 4 distinct mnemonic hints.
        <data>
        {"hanzi":"好","meaning":{"hanziWord":"好","glosses":["good","well"]},"components":[{"hanzi":"女","meaning":"woman"},{"hanzi":"子","label":"child","meaning":"child"}]}
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
