import { startOfDay } from "date-fns/startOfDay";
import type { Dictionary, HanziWord } from "./model";

export const hskStudyListIds = [`hsk-1`, `hsk-2`, `hsk-3`, `hsk-4`] as const;
export const studyListIds = [`study`, ...hskStudyListIds] as const;
export type StudyListId = (typeof studyListIds)[number];

export function parseStudyListId(
  value: string | undefined,
): StudyListId | null {
  return studyListIds.find((listId) => listId === value) ?? null;
}

export function studyListTitle(listId: StudyListId): string {
  return listId === `study` ? `Study` : `HSK ${listId.slice(4)}`;
}

export function groupStudyWordsByAddedDate(
  words: readonly { hanziWord: HanziWord; createdAt: Date }[],
  limit?: number,
): { date: Date; hanziWords: HanziWord[] }[] {
  const seen = new Set<HanziWord>();
  const visibleWords = [...words]
    .sort(
      (first, second) =>
        second.createdAt.getTime() - first.createdAt.getTime() ||
        first.hanziWord.localeCompare(second.hanziWord),
    )
    .filter(({ hanziWord }) => {
      if (seen.has(hanziWord)) {
        return false;
      }
      seen.add(hanziWord);
      return true;
    })
    .slice(0, limit);
  const groups = new Map<number, { date: Date; hanziWords: HanziWord[] }>();
  for (const { hanziWord, createdAt } of visibleWords) {
    const date = startOfDay(createdAt);
    const key = date.getTime();
    const group = groups.get(key);
    if (group == null) {
      groups.set(key, { date, hanziWords: [hanziWord] });
    } else {
      group.hanziWords.push(hanziWord);
    }
  }
  return [...groups.values()];
}

export function studyListHanziWords(
  dictionary: Dictionary,
  listId: StudyListId,
  studyWords: readonly HanziWord[] = [],
): HanziWord[] {
  switch (listId) {
    case `study`: {
      return [...new Set(studyWords)];
    }
    case `hsk-1`: {
      return [...dictionary.hsk1HanziWords];
    }
    case `hsk-2`: {
      return [...dictionary.hsk2HanziWords];
    }
    case `hsk-3`: {
      return [...dictionary.hsk3HanziWords];
    }
    case `hsk-4`: {
      return [...dictionary.hsk4HanziWords];
    }
  }
}
