import { isHanziChar } from "#data/hanzi.ts";
import { QuestionKind } from "#data/model.ts";
import { hanziWordToPinyinQuestionOrThrow } from "#data/questions/hanziWordToPinyin.ts";
import { hanziWordToPinyin, hanziWordToPinyinInitial } from "#data/skills.ts";
import { hanziFromHanziWord, loadDictionary } from "#dictionary/dictionary.ts";
import shuffle from "lodash/shuffle";
import test from "node:test";

await test(`${hanziWordToPinyinQuestionOrThrow.name} suite`, async () => {
  await test(`fixtures`, async () => {
    const dictionary = await loadDictionary();
    const sample = shuffle([...dictionary])
      .filter(
        ([hanziWord, meaning]) =>
          isHanziChar(hanziFromHanziWord(hanziWord)) && meaning.pinyin != null,
      )
      .slice(0, 100);

    for (const [hanziWord] of sample) {
      const skill = hanziWordToPinyinInitial(hanziWord);
      await hanziWordToPinyinQuestionOrThrow(skill);
    }

    const skill = hanziWordToPinyin(`你好:hello`);
    expect(await hanziWordToPinyinQuestionOrThrow(skill)).toEqual({
      kind: QuestionKind.HanziToPinyin,
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

  await test(`randomly generate 100 questions`, async () => {
    const dictionary = await loadDictionary();
    const sample = shuffle([...dictionary])
      .filter(([, meaning]) => meaning.pinyin != null)
      .slice(0, 100);

    for (const [hanziWord] of sample) {
      const skill = hanziWordToPinyinInitial(hanziWord);
      await hanziWordToPinyinQuestionOrThrow(skill);
    }
  });
});
