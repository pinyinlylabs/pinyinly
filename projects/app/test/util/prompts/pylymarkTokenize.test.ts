import { describe, expect, test } from "vitest";
import { fmtChatPromptForSnapshot } from "./helpers";
import { buildPylymarkTokenizePrompt } from "#util/prompts/pylymarkTokenize.ts";

describe(`buildPylymarkTokenizePrompt`, () => {
  test(`snapshot`, () => {
    const prompt = buildPylymarkTokenizePrompt({
      text: `Bigfoot hides in the barn basement and expresses himself.`,
      references: [
        { reference: `bi-`, terms: [`Bigfoot`] },
        { reference: `-ao`, terms: [`barn`] },
        { reference: `3`, terms: [`basement`] },
        { reference: `表`, terms: [`to express`] },
      ],
    });

    expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
        {
          "messages": "
        =====================
         SYSTEM MESSAGE
        ---------------------
        You are annotating text by inserting inline reference markers.

        You will be given:

        - 'text': the original text.
        - 'references': a list of references. Each reference has:
          - 'reference': the identifier to insert.
          - 'terms': one or more terms that may appear in the text.

        Wrap the best occurrence of each reference like this:

        [<reference> <matched text>]

        For example:

        Input:

        {
          "text": "Bigfoot hides in the barn basement and expresses himself.",
          "references": [
            { "id": "0", "terms": ["Bigfoot"] },
            { "id": "1", "terms": ["barn"] },
            { "id": "2", "terms": ["basement"] },
            { "id": "3", "terms": ["to express"] }
          ]
        }

        Output:

        {
          "text": "[0 Bigfoot] hides in the [1 barn] [2 basement] and [3 expresses] himself."
        }

        Rules:

        - Do not rewrite the text.
        - The output must be identical to the input except for inserting the reference markers.
        - Match exact terms or obvious grammatical inflections (for example 'to express' → 'express', 'expresses', 'expressed', 'expressing').
        - Do not match paraphrases or related words (for example 'expression' is not a match for 'express').
        - Mark only the smallest matching span (for example 'expresses', not 'expresses himself').
        - Mark at most one occurrence for each reference.
        - Return only the annotated text.

        <input>
        {"text":"Bigfoot hides in the barn basement and expresses himself.","references":[{"id":"0","terms":["Bigfoot"]},{"id":"1","terms":["barn"]},{"id":"2","terms":["basement"]},{"id":"3","terms":["to express"]}]}
        </input>
        =====================
        ",
          "model": "gpt-5.4",
          "postprocess": [Function],
          "reasoningEffort": "none",
          "schema": {
            "name": "pylymarkTokenizeOutputSchema",
            "schema": {
              "additionalProperties": false,
              "properties": {
                "text": {
                  "type": "string",
                },
              },
              "required": [
                "text",
              ],
              "title": "pylymarkTokenizeOutputSchema",
              "type": "object",
            },
            "type": "json_schema",
          },
        }
      `);
  });

  test(`postprocess doesn't clobber tone numbers`, () => {
    const prompt = buildPylymarkTokenizePrompt({
      text: `Bigfoot hides in the barn basement and expresses himself.`,
      references: [
        // This is the key part of the test, when the reference is a substring
        // of another reference, we want to make sure the postprocess doesn't
        // clobber the other reference.
        { reference: `1`, terms: [`basement`] },
        { reference: `bi-`, terms: [`Bigfoot`] },
        { reference: `-ao`, terms: [`barn`] },
        { reference: `表`, terms: [`to express`] },
      ],
    });

    expect(
      prompt.postprocess?.({
        text: `[1 Bigfoot] hides in the [2 barn] [0 basement] and [3 expresses] himself.`,
      }),
    ).toMatchInlineSnapshot(`
      {
        "text": "[bi- Bigfoot] hides in the [-ao barn] [1 basement] and [表 expresses] himself.",
      }
    `);
  });
});
