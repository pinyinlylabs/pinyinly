import { describe, expect, test } from "vitest";
import { buildPronunciationHintRealisticPrompt } from "#util/prompts/pronunciationHintRealistic.js";
import { fmtChatPromptForSnapshot } from "./helpers";

describe(
  `buildPronunciationHintRealisticPrompt` satisfies HasNameOf<
    typeof buildPronunciationHintRealisticPrompt
  >,
  () => {
    test(`snapshot`, () => {
      const prompt = buildPronunciationHintRealisticPrompt({
        leadCharacter: { name: `Ethan` },
        location: { name: `Gong Cha bathroom` },
        cue: { word: `use` },
        count: 3,
      });

      expect(fmtChatPromptForSnapshot(prompt)).toMatchInlineSnapshot(`
        {
          "messages": "
        =====================
         SYSTEM MESSAGE
        ---------------------
        You're a helpful assistant that creates short pronunciation mnemonic story ideas for Mandarin learners.
        Invent clear, grounded mini-scenes using a character, a location, and a keyword.
        The UI shows a shared story setup separately (for example: "In [location], [character] is...").
        Return only ending-style continuations that naturally finish that setup.
        Do not repeat the setup phrase, and do not restate the character or location names in every ending unless essential for clarity.
        Do not prefix endings with ellipsis or sentence-starter punctuation.
        Write each ending as a sentence continuation fragment that can follow the setup directly.
        Write endings as participle-led continuations (for example: "watering...", "tossing...", "building...").
        Do not include a subject or auxiliary at the start (avoid "it is...", "the character is...", or starting with just "is...").
        Start with lowercase when grammatically possible (unless a proper noun must be capitalized).
        Keep each ending to 1 short sentence (2 at most when necessary).
        Start endings with a vivid action or concrete object phrase, not pronouns like "it", "he", "she", or "they".
        Vary the opening words across suggestions; avoid repeating the same starter pattern.
        Use the keyword as light inspiration for the central action, object, or conflict, but do not turn the result into a definition.
        If cue meaning context is provided, follow that exact sense instead of other possible senses.
        If extra character or location details are provided, use them to make endings more specific.
        Keep scenes realistic and plausible in everyday life.
        Avoid supernatural, magical, dreamlike, or impossible events.
        Avoid bizarre shock-value imagery; prefer practical, familiar actions.
        Never include pinyin, Hanzi, IPA, tone marks, or pronunciation syllables in the ending text.
        Do not mention sound, pronunciation, phonetics, letters, initials, finals, tones, or transliteration.
        Only anchor the story on the lead character, the location, and the cue concept.
        Good endings are concrete, replayable, mentally vivid, and believable.
        Bad endings are generic, flat, fantastical, or mostly definitions.
        When the cue word (or a close form of it) appears in the ending text, wrap it in ==word== markup (e.g. ==can== or ==canning==).
        =====================



        =====================
         USER MESSAGE
        ---------------------
        Generate 3 distinct mnemonic story ideas.

        <data>
        {
          "leadCharacter": {
            "name": "Ethan"
          },
          "location": {
            "name": "Gong Cha bathroom"
          },
          "cue": {
            "word": "use"
          }
        }
        </data>
        =====================
        ",
          "model": "gpt-5-mini",
          "reasoningEffort": "medium",
          "schema": {
            "name": "result_shape",
            "schema": {
              "$schema": "https://json-schema.org/draft/2020-12/schema",
              "additionalProperties": false,
              "properties": {
                "suggestions": {
                  "items": {
                    "additionalProperties": false,
                    "properties": {
                      "explanation": {
                        "anyOf": [
                          {
                            "type": "string",
                          },
                          {
                            "type": "null",
                          },
                        ],
                      },
                      "hint": {
                        "description": "A short story ending that continues a shared setup shown separately in the UI. When the cue word appears, wrap it in ==word== (e.g. ==can==) so it renders highlighted.",
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
              "type": "object",
            },
            "type": "json_schema",
          },
        }
      `);
    });
  },
);
