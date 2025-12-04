import type { HanziWordToPinyinTypedQuestion } from "#data/model.ts";
import { MistakeKind, QuestionKind } from "#data/model.ts";
import {
  hanziToPinyinTypedQuestionMistakes,
  hanziWordToPinyinTypedQuestionOrThrow,
} from "#data/questions/hanziWordToPinyinTyped.ts";
import { hanziWordToPinyinTyped } from "#data/skills.ts";
import { loadDictionary } from "#dictionary.ts";
import { describe, expect, test } from "vitest";
import { 拼音 } from "../helpers.ts";

describe(
  `hanziWordToPinyinTypedQuestionOrThrow suite` satisfies HasNameOf<
    typeof hanziWordToPinyinTypedQuestionOrThrow
  >,
  async () => {
    test(`simple case`, async () => {
      const skill = hanziWordToPinyinTyped(`你好:hello`);
      await expect(
        hanziWordToPinyinTypedQuestionOrThrow(skill, null),
      ).resolves.toEqual({
        kind: QuestionKind.HanziWordToPinyinTyped,
        answers: [[`nǐ`, `hǎo`]],
        skill,
        flag: null,
      });
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
  },
);

describe(
  `hanziToPinyinTypedQuestionMistakes suite` satisfies HasNameOf<
    typeof hanziToPinyinTypedQuestionMistakes
  >,
  async () => {
    test(`correctness ignores whitespace`, async () => {
      const question: HanziWordToPinyinTypedQuestion = {
        kind: QuestionKind.HanziWordToPinyinTyped,
        answers: [[拼音`nǐ`, 拼音`hǎo`]],
        skill: hanziWordToPinyinTyped(`你好:hello`),
        flag: null,
      };

      const fixtures = [`nǐhǎo`, `nǐ hǎo`, `nǐ hǎo `, `nǐhǎo `, ` nǐhǎo`];
      for (const answer of fixtures) {
        expect([
          answer,
          hanziToPinyinTypedQuestionMistakes(question, answer),
        ]).toEqual([answer, []]);
      }
    });

    test(`incorrect returns a mistake`, async () => {
      const question: HanziWordToPinyinTypedQuestion = {
        kind: QuestionKind.HanziWordToPinyinTyped,
        answers: [[拼音`nǐ`, 拼音`hǎo`]],
        skill: hanziWordToPinyinTyped(`你好:hello`),
        flag: null,
      };

      const fixtures: [string, string[]][] = [
        [`nǐ`, [`nǐ`]], // less syllables than the answer
        [`nǐhǎomá`, [`nǐ`, `hǎo`, `má`]], // more syllables than the answer
        [`nihǎo`, [`ni`, `hǎo`]],
        [`ni  hǎo`, [`ni`, `hǎo`]],
        [`nǐhao`, [`nǐ`, `hao`]],
        [``, []],
        [`x x`, [`x`, `x`]],
      ];
      for (const [answer, mistakePinyin] of fixtures) {
        expect([
          answer,
          hanziToPinyinTypedQuestionMistakes(question, answer),
        ]).toEqual([
          answer,
          [
            {
              kind: MistakeKind.HanziPinyin,
              hanziOrHanziWord: `你好:hello`,
              pinyin: mistakePinyin,
            },
          ],
        ]);
      }
    });

    test(`secondary pinyin definitions are still correct`, async () => {
      const question: HanziWordToPinyinTypedQuestion = {
        kind: QuestionKind.HanziWordToPinyinTyped,
        answers: [
          [拼音`nǐ`, 拼音`hǎo`],
          [拼音`ni`, 拼音`hao`],
        ],
        skill: hanziWordToPinyinTyped(`你好:hello`),
        flag: null,
      };

      const fixtures = [`nihao`, `ni hao`];
      for (const answer of fixtures) {
        expect([
          answer,
          hanziToPinyinTypedQuestionMistakes(question, answer),
        ]).toEqual([answer, []]);
      }
    });
  },
);
