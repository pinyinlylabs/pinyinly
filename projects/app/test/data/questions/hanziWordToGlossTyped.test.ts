import { QuestionFlagKind } from "#data/model.js";
import { hanziWordToGlossTypedQuestionOrThrow } from "#data/questions/hanziWordToGlossTyped.ts";
import { hanziWordToGlossTyped } from "#data/skills.js";
import { loadDictionary } from "#dictionary/dictionary.ts";
import { describe, expect, test } from "vitest";

describe(
  `hanziWordToGlossTypedQuestionOrThrow suite` satisfies HasNameOf<
    typeof hanziWordToGlossTypedQuestionOrThrow
  >,
  async () => {
    test(`works for the entire dictionary`, async () => {
      const dictionary = await loadDictionary();

      for (const hanziWord of dictionary.allHanziWords) {
        const skill = hanziWordToGlossTyped(hanziWord);
        await hanziWordToGlossTypedQuestionOrThrow(skill);
      }
    });

    test(`correctly handles OtherMeaning flag (two meanings)`, async () => {
      {
        const question =
          await hanziWordToGlossTypedQuestionOrThrow(`het:好:good`);

        expect(question).toMatchInlineSnapshot(`
          {
            "answers": [
              {
                "glosses": [
                  "good",
                  "nice",
                  "friendly",
                ],
                "skill": "het:好:good",
              },
              {
                "glosses": [
                  "like",
                  "enjoy",
                ],
                "skill": "het:好:like",
              },
            ],
            "bannedMeaningPrimaryGlossHint": [],
            "flag": undefined,
            "kind": "debug--HanziWordToGlossTyped",
            "skill": "het:好:good",
          }
        `);
      }

      {
        const question = await hanziWordToGlossTypedQuestionOrThrow(
          `het:好:good`,
          {
            kind: QuestionFlagKind.OtherMeaning,
            previousHanziWords: [`好:like`],
          },
        );

        expect(question).toMatchInlineSnapshot(`
          {
            "answers": [
              {
                "glosses": [
                  "good",
                  "nice",
                  "friendly",
                ],
                "skill": "het:好:good",
              },
            ],
            "bannedMeaningPrimaryGlossHint": [
              "like",
            ],
            "flag": {
              "kind": "debug--OtherMeaning",
              "previousHanziWords": [
                "好:like",
              ],
            },
            "kind": "debug--HanziWordToGlossTyped",
            "skill": "het:好:good",
          }
        `);
      }
    });

    test(`correctly handles OtherMeaning flag (three meanings)`, async () => {
      const question = await hanziWordToGlossTypedQuestionOrThrow(
        `het:任:any`,
        {
          kind: QuestionFlagKind.OtherMeaning,
          previousHanziWords: [`任:appoint`],
        },
      );

      expect(question).toMatchInlineSnapshot(`
        {
          "answers": [
            {
              "glosses": [
                "any",
                "whatever",
              ],
              "skill": "het:任:any",
            },
            {
              "glosses": [
                "duty",
                "office",
              ],
              "skill": "het:任:duty",
            },
          ],
          "bannedMeaningPrimaryGlossHint": [
            "appoint",
          ],
          "flag": {
            "kind": "debug--OtherMeaning",
            "previousHanziWords": [
              "任:appoint",
            ],
          },
          "kind": "debug--HanziWordToGlossTyped",
          "skill": "het:任:any",
        }
      `);
    });
  },
);
