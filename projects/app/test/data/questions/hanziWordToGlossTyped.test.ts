import { QuestionFlagKind } from "#data/model.js";
import {
  gradeHanziToGlossTypedQuestion,
  hanziWordToGlossTypedQuestionOrThrow,
  normalizeGlossForMatch,
} from "#data/questions/hanziWordToGlossTyped.ts";
import { hanziWordToGlossTyped } from "#data/skills.js";
import { loadDictionary } from "#dictionary.ts";
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
        await hanziWordToGlossTypedQuestionOrThrow(skill, null);
      }
    });

    test(`correctly handles OtherAnswer flag (two meanings)`, async () => {
      {
        // Base case -- no flag
        const question = await hanziWordToGlossTypedQuestionOrThrow(
          `het:好:good`,
          null,
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
              {
                "glosses": [
                  "like",
                  "enjoy",
                ],
                "skill": "het:好:like",
              },
            ],
            "bannedMeaningPrimaryGlossHint": [],
            "flag": null,
            "kind": "debug--HanziWordToGlossTyped",
            "skill": "het:好:good",
          }
        `);
      }

      {
        const question = await hanziWordToGlossTypedQuestionOrThrow(
          `het:好:good`,
          {
            kind: QuestionFlagKind.OtherAnswer,
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
              "kind": "debug--OtherAnswer",
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

    test(`correctly handles OtherAnswer flag (three meanings)`, async () => {
      const question = await hanziWordToGlossTypedQuestionOrThrow(
        `het:任:any`,
        {
          kind: QuestionFlagKind.OtherAnswer,
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
            "kind": "debug--OtherAnswer",
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

describe(
  `normalizeGlossForMatch suite` satisfies HasNameOf<
    typeof normalizeGlossForMatch
  >,
  () => {
    test.for([
      [`non`, `non-`],
      [`un`, `un-`],
      [`cant stand`, `can’t stand`],
      [`cant stand`, `can't stand`],
      [`step over obstacle`, `step (over obstacle)`],
      [`why`, `why?`],
      [`prepare`, `to prepare`],
    ] as const)(
      `accepts $1 as an answer for $0`,
      async ([hanziWord, userGloss]) => {
        expect(normalizeGlossForMatch(userGloss)).toEqual(
          normalizeGlossForMatch(hanziWord),
        );
      },
    );
  },
);

describe(
  `gradeHanziToGlossTypedQuestion suite` satisfies HasNameOf<
    typeof gradeHanziToGlossTypedQuestion
  >,
  () => {
    test.for([
      [`非:not`, `non-`],
      [`非:not`, `non`],
    ] as const)(
      `accepts $1 as an answer for $0`,
      async ([hanziWord, userGloss]) => {
        const question = await hanziWordToGlossTypedQuestionOrThrow(
          `het:${hanziWord}`,
          null,
        );
        const grade = gradeHanziToGlossTypedQuestion(question, userGloss, 1000);

        expect(grade.correct).toBe(true);
      },
    );
  },
);
