import {
  groupStudyWordsByAddedDate,
  hskStudyListIds,
  parseStudyListId,
  studyListHanziWords,
  studyListTitle,
} from "#data/studyLists.ts";
import { loadDictionary } from "#dictionary.ts";
import { describe, expect, test } from "vitest";

describe(`parseStudyListId()`, () => {
  test(`validates supported route IDs`, () => {
    expect(parseStudyListId(`study`)).toBe(`study`);
    for (const listId of hskStudyListIds) {
      expect(parseStudyListId(listId)).toBe(listId);
    }
    for (const invalid of [undefined, ``, `hsk-5`, `bookmarks`]) {
      expect(parseStudyListId(invalid)).toBeNull();
    }
  });
});

describe(`studyListTitle()`, () => {
  test(`returns the title for each supported list`, () => {
    for (const listId of hskStudyListIds) {
      expect(studyListTitle(listId)).toBe(`HSK ${listId.slice(4)}`);
    }
    expect(studyListTitle(`study`)).toBe(`Study`);
  });
});

describe(`studyListHanziWords()`, () => {
  test(`resolves HSK lists independently of personal selections`, async () => {
    const dictionary = await loadDictionary();
    for (const [index, listId] of hskStudyListIds.entries()) {
      expect(studyListHanziWords(dictionary, listId, [`你好:hello`])).toEqual(
        [
          dictionary.hsk1HanziWords,
          dictionary.hsk2HanziWords,
          dictionary.hsk3HanziWords,
          dictionary.hsk4HanziWords,
        ][index],
      );
    }
  });

  test(`deduplicates typed words without dictionary validation`, async () => {
    const dictionary = {
      ...(await loadDictionary()),
      lookupHanziWord: () => {
        throw new Error(`Study words should not require dictionary lookup`);
      },
    };
    expect(
      studyListHanziWords(dictionary, `study`, [
        `你好:hello`,
        `你好:hello`,
        `不存在:missing`,
      ]),
    ).toEqual([`你好:hello`, `不存在:missing`]);
    expect(studyListHanziWords(dictionary, `study`)).toEqual([]);
  });
});

describe(`groupStudyWordsByAddedDate()`, () => {
  test(`groups local calendar days newest first across year boundaries`, () => {
    expect(
      groupStudyWordsByAddedDate([
        { hanziWord: `你好:hello`, createdAt: new Date(2025, 11, 31, 23, 59) },
        { hanziWord: `好:good`, createdAt: new Date(2026, 0, 1, 0, 1) },
        { hanziWord: `好:like`, createdAt: new Date(2026, 0, 1, 12) },
      ]),
    ).toEqual([
      { date: new Date(2026, 0, 1), hanziWords: [`好:like`, `好:good`] },
      { date: new Date(2025, 11, 31), hanziWords: [`你好:hello`] },
    ]);
  });

  test(`uses the newest date once per meaning and limits before grouping`, () => {
    expect(
      groupStudyWordsByAddedDate(
        [
          { hanziWord: `你好:hello`, createdAt: new Date(2026, 8, 30) },
          { hanziWord: `好:good`, createdAt: new Date(2026, 9, 1, 10) },
          { hanziWord: `你好:hello`, createdAt: new Date(2026, 9, 2, 10) },
          { hanziWord: `好:like`, createdAt: new Date(2026, 9, 1, 12) },
        ],
        2,
      ),
    ).toEqual([
      { date: new Date(2026, 9, 2), hanziWords: [`你好:hello`] },
      { date: new Date(2026, 9, 1), hanziWords: [`好:like`] },
    ]);
  });

  test(`handles empty lists and zero preview limits`, () => {
    expect(groupStudyWordsByAddedDate([])).toEqual([]);
    expect(
      groupStudyWordsByAddedDate(
        [{ hanziWord: `你好:hello`, createdAt: new Date(2026, 9, 3) }],
        0,
      ),
    ).toEqual([]);
  });
});
