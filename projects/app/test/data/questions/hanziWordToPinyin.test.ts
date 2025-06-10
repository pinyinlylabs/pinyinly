import type { HanziWordToPinyinQuestion } from "#data/model.ts";
import { MistakeKind, QuestionKind } from "#data/model.ts";
import {
  hanziToPinyinQuestionMistakes,
  hanziWordToPinyinQuestionOrThrow,
} from "#data/questions/hanziWordToPinyin.ts";
import { hanziWordToPinyin } from "#data/skills.ts";
import { loadDictionary } from "#dictionary/dictionary.ts";
import test from "node:test";
import { 拼音 } from "../helpers";

await test(`${hanziWordToPinyinQuestionOrThrow.name} suite`, async () => {
  await test(`simple case`, async () => {
    const skill = hanziWordToPinyin(`你好:hello`);
    expect(await hanziWordToPinyinQuestionOrThrow(skill)).toEqual({
      kind: QuestionKind.HanziWordToPinyin,
      answers: [[`nǐ`, `hǎo`]],
      skill,
    });
  });

  await test(`throws if the hanzi word has no pinyin`, async () => {
    const skill = hanziWordToPinyin(`亼:assemble`); // 亼:assemble has no pinyin
    await expect(hanziWordToPinyinQuestionOrThrow(skill)).rejects.toThrow();
  });

  await test(`supports hanzi word with multiple pinyin`, async () => {
    const skill = hanziWordToPinyin(`什:what`); // 什:what has shén and shen
    await expect(
      hanziWordToPinyinQuestionOrThrow(skill),
    ).resolves.not.toBeNull();
  });

  await test(`works for all valid dictionary items`, async () => {
    const dictionary = await loadDictionary();
    const sample = [...dictionary].filter(
      ([, meaning]) => meaning.pinyin != null,
    );

    for (const [hanziWord] of sample) {
      const skill = hanziWordToPinyin(hanziWord);
      await hanziWordToPinyinQuestionOrThrow(skill);
    }
  });
});

await test(`${hanziToPinyinQuestionMistakes.name} suite`, async () => {
  await test(`correctness ignores whitespace`, async () => {
    const question: HanziWordToPinyinQuestion = {
      kind: QuestionKind.HanziWordToPinyin,
      answers: [[拼音`nǐ`, 拼音`hǎo`]],
      skill: hanziWordToPinyin(`你好:hello`),
    };

    const fixtures = [`nǐhǎo`, `nǐ hǎo`, `nǐ hǎo `, `nǐhǎo `, ` nǐhǎo`];
    for (const answer of fixtures) {
      expect([answer, hanziToPinyinQuestionMistakes(question, answer)]).toEqual(
        [answer, []],
      );
    }
  });

  await test(`incorrect returns a mistake`, async () => {
    const question: HanziWordToPinyinQuestion = {
      kind: QuestionKind.HanziWordToPinyin,
      answers: [[拼音`nǐ`, 拼音`hǎo`]],
      skill: hanziWordToPinyin(`你好:hello`),
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
      expect([answer, hanziToPinyinQuestionMistakes(question, answer)]).toEqual(
        [
          answer,
          [
            {
              kind: MistakeKind.HanziPinyin,
              hanziOrHanziWord: `你好:hello`,
              pinyin: mistakePinyin,
            },
          ],
        ],
      );
    }
  });

  await test(`secondary pinyin definitions are still correct`, async () => {
    const question: HanziWordToPinyinQuestion = {
      kind: QuestionKind.HanziWordToPinyin,
      answers: [
        [拼音`nǐ`, 拼音`hǎo`],
        [拼音`ni`, 拼音`hao`],
      ],
      skill: hanziWordToPinyin(`你好:hello`),
    };

    const fixtures = [`nihao`, `ni hao`];
    for (const answer of fixtures) {
      expect([answer, hanziToPinyinQuestionMistakes(question, answer)]).toEqual(
        [answer, []],
      );
    }
  });
});
