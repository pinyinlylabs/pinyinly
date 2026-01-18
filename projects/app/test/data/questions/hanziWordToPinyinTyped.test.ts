import type {
  HanziWordToPinyinTypedQuestion,
  PinyinText,
} from "#data/model.ts";
import { MistakeKind, QuestionFlagKind, QuestionKind } from "#data/model.ts";
import {
  gradeHanziToPinyinTypedQuestion,
  hanziWordToPinyinTypedQuestionOrThrow,
  shouldAutoSubmitPinyinTypedAnswer,
} from "#data/questions/hanziWordToPinyinTyped.ts";
import { hanziWordToPinyinTyped } from "#data/skills.ts";
import { loadDictionary } from "#dictionary.ts";
import { describe, expect, test } from "vitest";
import { 拼音 } from "../helpers.ts";

describe(
  `shouldAutoSubmitPinyinTypedAnswer suite` satisfies HasNameOf<
    typeof shouldAutoSubmitPinyinTypedAnswer
  >,
  () => {
    test(`should auto-submit with trailing space and matching pinyin unit count`, () => {
      const skill = hanziWordToPinyinTyped(`你好:hello`);
      const answers = [
        {
          skill,
          pinyin: [拼音`nǐ hǎo`],
        },
      ];

      for (const [text, expectedAutoSubmit] of [
        [`nǐ hǎo `, true],
        [`nǐ hǎo`, false],
        [`nǐhǎo `, true],
        [`nǐhǎo`, false],
      ] as const) {
        expect
          .soft(shouldAutoSubmitPinyinTypedAnswer(text, skill, answers), text)
          .toBe(expectedAutoSubmit);
      }
    });
  },
);

describe(
  `hanziWordToPinyinTypedQuestionOrThrow suite` satisfies HasNameOf<
    typeof hanziWordToPinyinTypedQuestionOrThrow
  >,
  () => {
    test(`simple case`, async () => {
      const skill = hanziWordToPinyinTyped(`你好:hello`);
      const result = await hanziWordToPinyinTypedQuestionOrThrow(skill, null);
      expect(result.kind).toEqual(QuestionKind.HanziWordToPinyinTyped);
      expect(result.skill).toEqual(skill);
      expect(result.flag).toEqual(null);
      expect(result.answers.length).toBeGreaterThan(0);
      // Should include the requested skill's answer
      const matchingAnswer = result.answers.find((a) => a.skill === skill);
      expect(matchingAnswer).toBeDefined();
      expect(matchingAnswer?.pinyin).toEqual([拼音`nǐ hǎo`]);
    });

    test(`throws if the hanzi word has no pinyin`, async () => {
      const skill = hanziWordToPinyinTyped(`亼:assemble`); // 亼:assemble has no pinyin
      await expect(
        hanziWordToPinyinTypedQuestionOrThrow(skill, null),
      ).rejects.toThrow();
    });

    test(`supports hanzi word with multiple pinyin`, async () => {
      const skill = hanziWordToPinyinTyped(`什:what`); // 什:what has shén and shen
      await expect(
        hanziWordToPinyinTypedQuestionOrThrow(skill, null),
      ).resolves.not.toBeNull();
    });

    test(`works for all valid dictionary items`, async () => {
      const dictionary = await loadDictionary();
      const sample = dictionary.allEntries.filter(
        ([, meaning]) => meaning.pinyin != null,
      );

      for (const [hanziWord] of sample) {
        const skill = hanziWordToPinyinTyped(hanziWord);
        await hanziWordToPinyinTypedQuestionOrThrow(skill, null);
      }
    });

    test(`correctly handles OtherAnswer flag (two meanings)`, async () => {
      {
        // Base case -- no flag
        const question = await hanziWordToPinyinTypedQuestionOrThrow(
          `hp:几:howMany`,
          null,
        );

        expect(question).toMatchInlineSnapshot(`
          {
            "answers": [
              {
                "pinyin": [
                  "jǐ",
                ],
                "skill": "hp:几:howMany",
              },
              {
                "pinyin": [
                  "jī",
                ],
                "skill": "hp:几:table",
              },
            ],
            "bannedMeaningPinyinHint": [],
            "flag": null,
            "kind": "debug--HanziWordToPinyinTyped",
            "skill": "hp:几:howMany",
          }
        `);
      }

      {
        const question = await hanziWordToPinyinTypedQuestionOrThrow(
          `hp:几:howMany`,
          {
            kind: QuestionFlagKind.OtherAnswer,
            previousHanziWords: [`几:table`],
          },
        );

        expect(question).toMatchInlineSnapshot(`
          {
            "answers": [
              {
                "pinyin": [
                  "jǐ",
                ],
                "skill": "hp:几:howMany",
              },
            ],
            "bannedMeaningPinyinHint": [
              "jī",
            ],
            "flag": {
              "kind": "debug--OtherAnswer",
              "previousHanziWords": [
                "几:table",
              ],
            },
            "kind": "debug--HanziWordToPinyinTyped",
            "skill": "hp:几:howMany",
          }
        `);
      }
    });
  },
);

describe(
  `gradeHanziToPinyinTypedQuestion suite` satisfies HasNameOf<
    typeof gradeHanziToPinyinTypedQuestion
  >,
  async () => {
    test(`correctness ignores whitespace`, async () => {
      const skill = hanziWordToPinyinTyped(`你好:hello`);
      const question: HanziWordToPinyinTypedQuestion = {
        kind: QuestionKind.HanziWordToPinyinTyped,
        answers: [
          {
            skill,
            pinyin: [拼音`nǐ hǎo`],
          },
        ],
        bannedMeaningPinyinHint: [],
        skill,
        flag: null,
      };

      const fixtures = [`nǐhǎo`, `nǐ hǎo`, `nǐ hǎo `, `nǐhǎo `, ` nǐhǎo`];
      for (const answer of fixtures) {
        const grade = gradeHanziToPinyinTypedQuestion(question, answer, 1000);
        expect([answer, grade.correct]).toEqual([answer, true]);
      }
    });

    test(`incorrect returns a mistake`, async () => {
      const skill = hanziWordToPinyinTyped(`你好:hello`);
      const question: HanziWordToPinyinTypedQuestion = {
        kind: QuestionKind.HanziWordToPinyinTyped,
        answers: [
          {
            skill,
            pinyin: [拼音`nǐ hǎo`],
          },
        ],
        bannedMeaningPinyinHint: [],
        skill,
        flag: null,
      };

      const fixtures: PinyinText[] = [
        拼音`nǐ`, // less syllables than the answer
        拼音`nǐhǎomá`, // more syllables than the answer
        拼音`nihǎo`,
        拼音`ni  hǎo`,
        拼音`nǐhao`,
        拼音``,
        拼音`x x`,
      ];
      for (const answer of fixtures) {
        const grade = gradeHanziToPinyinTypedQuestion(question, answer, 1000);
        expect.soft(grade.correct, `${answer} should be incorrect`).toBe(false);
        if (!grade.correct) {
          expect.soft(grade.mistakes, `${answer} mistake`).toEqual([
            {
              kind: MistakeKind.HanziPinyin,
              hanziOrHanziWord: `你好:hello`,
              pinyin: answer,
            },
          ]);
        }
      }
    });

    test(`secondary pinyin definitions are still correct`, async () => {
      const skill = hanziWordToPinyinTyped(`你好:hello`);
      const question: HanziWordToPinyinTypedQuestion = {
        kind: QuestionKind.HanziWordToPinyinTyped,
        answers: [
          {
            skill,
            pinyin: [拼音`nǐ hǎo`, 拼音`ni hao`],
          },
        ],
        bannedMeaningPinyinHint: [],
        skill,
        flag: null,
      };

      const fixtures = [`nihao`, `ni hao`];
      for (const answer of fixtures) {
        const grade = gradeHanziToPinyinTypedQuestion(question, answer, 1000);
        expect([answer, grade.correct]).toEqual([answer, true]);
      }
    });
  },
);
