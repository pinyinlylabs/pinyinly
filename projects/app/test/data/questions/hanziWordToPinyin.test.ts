import type { HanziWordToPinyinQuestion } from "#data/model.ts";
import { MistakeKind, QuestionKind } from "#data/model.ts";
import {
  hanziToPinyinQuestionMistakes,
  hanziWordToPinyinQuestionOrThrow,
} from "#data/questions/hanziWordToPinyin.ts";
import { hanziWordToPinyinTyped } from "#data/skills.ts";
import { loadDictionary } from "#dictionary/dictionary.ts";
import { describe, expect, test } from "vitest";
import { 拼音 } from "../helpers.ts";

describe(
  `hanziWordToPinyinQuestionOrThrow suite` satisfies HasNameOf<
    typeof hanziWordToPinyinQuestionOrThrow
  >,
  async () => {
    test(`simple case`, async () => {
      const skill = hanziWordToPinyinTyped(`你好:hello`);
      await expect(hanziWordToPinyinQuestionOrThrow(skill)).resolves.toEqual({
        kind: QuestionKind.HanziWordToPinyin,
        answers: [[`nǐ`, `hǎo`]],
        skill,
      });
    });

    test(`throws if the hanzi word has no pinyin`, async () => {
      const skill = hanziWordToPinyinTyped(`亼:assemble`); // 亼:assemble has no pinyin
      await expect(hanziWordToPinyinQuestionOrThrow(skill)).rejects.toThrow();
    });

    test(`supports hanzi word with multiple pinyin`, async () => {
      const skill = hanziWordToPinyinTyped(`什:what`); // 什:what has shén and shen
      await expect(
        hanziWordToPinyinQuestionOrThrow(skill),
      ).resolves.not.toBeNull();
    });

    test(`works for all valid dictionary items`, async () => {
      const dictionary = await loadDictionary();
      const sample = [...dictionary].filter(
        ([, meaning]) => meaning.pinyin != null,
      );

      for (const [hanziWord] of sample) {
        const skill = hanziWordToPinyinTyped(hanziWord);
        await hanziWordToPinyinQuestionOrThrow(skill);
      }
    });
  },
);

describe(
  `hanziToPinyinQuestionMistakes suite` satisfies HasNameOf<
    typeof hanziToPinyinQuestionMistakes
  >,
  async () => {
    test(`correctness ignores whitespace`, async () => {
      const question: HanziWordToPinyinQuestion = {
        kind: QuestionKind.HanziWordToPinyin,
        answers: [[拼音`nǐ`, 拼音`hǎo`]],
        skill: hanziWordToPinyinTyped(`你好:hello`),
      };

      const fixtures = [`nǐhǎo`, `nǐ hǎo`, `nǐ hǎo `, `nǐhǎo `, ` nǐhǎo`];
      for (const answer of fixtures) {
        expect([
          answer,
          hanziToPinyinQuestionMistakes(question, answer),
        ]).toEqual([answer, []]);
      }
    });

    test(`incorrect returns a mistake`, async () => {
      const question: HanziWordToPinyinQuestion = {
        kind: QuestionKind.HanziWordToPinyin,
        answers: [[拼音`nǐ`, 拼音`hǎo`]],
        skill: hanziWordToPinyinTyped(`你好:hello`),
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
          hanziToPinyinQuestionMistakes(question, answer),
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
      const question: HanziWordToPinyinQuestion = {
        kind: QuestionKind.HanziWordToPinyin,
        answers: [
          [拼音`nǐ`, 拼音`hǎo`],
          [拼音`ni`, 拼音`hao`],
        ],
        skill: hanziWordToPinyinTyped(`你好:hello`),
      };

      const fixtures = [`nihao`, `ni hao`];
      for (const answer of fixtures) {
        expect([
          answer,
          hanziToPinyinQuestionMistakes(question, answer),
        ]).toEqual([answer, []]);
      }
    });
  },
);
