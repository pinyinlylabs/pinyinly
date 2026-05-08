import type {
  HanziCharacter,
  HanziText,
  HanziWord,
  HskLevel,
  PartOfSpeech,
  PinyinText,
  Skill,
  SrsStateType,
  WikiCharacterDecomposition,
} from "@/data/model";
import {
  wikiCharacterDataSchema,
  wikiCharacterDecompositionSchema,
} from "@/data/model";
import type { Rizzle, SkillRating } from "@/data/rizzleSchema";
import { currentSchema } from "@/data/rizzleSchema";
import type { RankedHanziWord } from "@/data/skills";
import { hskLevelToNumber } from "@/data/hsk";
import {
  getHanziWordRank,
  hanziWordToGlossTyped,
  hanziWordToPinyinTyped,
  rankRules,
} from "@/data/skills";
import {
  userWikiCharacterDecompositionSetting,
  userHanziMeaningDefs,
} from "@/data/userSettings";
import type {
  CharacterComponentUsageEntry,
  CharacterDecompositionEntry,
  Dictionary,
} from "@/dictionary";
import {
  buildCharacterComponentUsageEntries,
  buildHanziWord,
  decompositionComponentsToIds,
  getIsStructuralHanzi,
  hanziFromHanziWord,
  loadBuiltinCharacterDecompositionEntries,
  loadDictionary,
  meaningKeyFromHanziWord,
} from "@/dictionary";
import { matchAllHanziCharacters, walkIdsNodeLeafs } from "@/data/hanzi";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import type { Rating } from "@/util/fsrs";
import type {
  RizzleAnyEntity,
  RizzleEntityMarshaled,
  RizzleEntityOutput,
} from "@/util/rizzle";
import {
  arrayFilterUnique,
  memoize0,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import { nonNullable } from "@pinyinly/lib/invariant";
import type { Collection, CollectionConfig } from "@tanstack/react-db";
import {
  and,
  createCollection,
  createLiveQueryCollection,
  eq,
  gte,
  isNull,
  isUndefined,
  like,
  or,
} from "@tanstack/react-db";
import { queryOptions, skipToken } from "@tanstack/react-query";
import { subDays } from "date-fns/subDays";
import { Platform } from "react-native";
import { z } from "zod/v4";
import type { DeviceStoreEntity } from "./deviceStore";
import { buildDeviceStoreKey, deviceStoreGet } from "./deviceStore";
import { BTreeIndex } from "@tanstack/db";

type ExpressionLike = Parameters<typeof isUndefined>[0];
const isNullish = (value: ExpressionLike) =>
  or(isUndefined(value), isNull(value));

export function historyPageCollection(
  skillRatingsCollection: SkillRatingCollection,
  hanziGlossMistakesCollection: HanziGlossMistakeCollection,
  hanziPinyinMistakesCollection: HanziPinyinMistakeCollection,
) {
  const startDate = subDays(new Date(), 7);

  return createLiveQueryCollection((q) =>
    q
      .from({ skillRating: skillRatingsCollection })
      .orderBy(({ skillRating }) => skillRating.createdAt, `desc`)
      .leftJoin(
        { hanziGlossMistake: hanziGlossMistakesCollection },
        ({ skillRating, hanziGlossMistake }) =>
          eq(skillRating.reviewId, hanziGlossMistake.reviewId),
      )
      .leftJoin(
        { hanziPinyinMistake: hanziPinyinMistakesCollection },
        ({ skillRating, hanziPinyinMistake }) =>
          eq(skillRating.reviewId, hanziPinyinMistake.reviewId),
      )
      .where(({ skillRating }) =>
        and(
          gte(skillRating.createdAt, startDate),
          isNullish(skillRating.trashedAt), // Filter out trashed items
        ),
      ),
  );
}

export type HistoryPageCollection = ReturnType<typeof historyPageCollection>;

export function historyPageData(
  historyCollection: CollectionOutput<HistoryPageCollection>[],
) {
  // Group skill ratings into sessions (5 minute gaps create new sessions)
  const sessionTimeoutMs = 5 * 60 * 1000;
  const sessions: CollectionOutput<HistoryPageCollection>[][] = [];
  let currentSession: CollectionOutput<HistoryPageCollection>[] = [];

  for (const item of historyCollection) {
    if (currentSession.length === 0) {
      currentSession.push(item);
    } else {
      const lastItem = nonNullable(currentSession.at(-1));
      const timeDiffMs =
        lastItem.skillRating.createdAt.getTime() -
        item.skillRating.createdAt.getTime();

      if (timeDiffMs > sessionTimeoutMs) {
        sessions.push(currentSession);
        currentSession = [item];
      } else {
        currentSession.push(item);
      }
    }
  }

  if (currentSession.length > 0) {
    sessions.push(currentSession);
  }

  return sessions.map((session) => ({
    endTime: nonNullable(session[0]).skillRating.createdAt,
    startTime: nonNullable(session.at(-1)).skillRating.createdAt,
    groups: groupRatingsBySkill(session),
  }));
}

export type HistoryPageData = ReturnType<typeof historyPageData>;

function groupRatingsBySkill(items: CollectionOutput<HistoryPageCollection>[]) {
  const groups: {
    skill: Skill;
    ratings: { rating: Rating; createdAt: Date; answer?: string }[];
  }[] = [];

  for (const item of items) {
    const lastGroup = groups.at(-1);

    if (lastGroup && lastGroup.skill === item.skillRating.skill) {
      // Same skill as the previous rating, add to the current group
      lastGroup.ratings.push({
        rating: item.skillRating.rating,
        createdAt: item.skillRating.createdAt,
        answer:
          item.hanziGlossMistake?.gloss ?? item.hanziPinyinMistake?.pinyin,
      });
    } else {
      // Different skill or first rating, start a new group
      groups.push({
        skill: item.skillRating.skill,
        ratings: [
          {
            rating: item.skillRating.rating,
            createdAt: item.skillRating.createdAt,
            answer:
              item.hanziGlossMistake?.gloss ?? item.hanziPinyinMistake?.pinyin,
          },
        ],
      });
    }
  }

  return groups;
}

export const targetSkillsQuery = () =>
  queryOptions({
    queryKey: [`targetSkills`],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();

      const targetSkills = await getAllTargetSkills();
      return targetSkills;
    },
    networkMode: `offlineFirst`,
    retry: false,
    structuralSharing: false,
  });

export const isStructuralHanziQuery = queryOptions({
  queryKey: [`isStructuralHanzi`],
  queryFn: async () => {
    await devToolsSlowQuerySleepIfEnabled();

    return getIsStructuralHanzi();
  },
  networkMode: `offlineFirst`,
  retry: false,
  structuralSharing: false,
});

export const dictionaryQuery = queryOptions({
  queryKey: [`dictionary`],
  queryFn: async () => {
    await devToolsSlowQuerySleepIfEnabled();

    return loadDictionary();
  },
  networkMode: `offlineFirst`,
  retry: false,
  structuralSharing: false,
});

export function getTargetHanziWordsFromDictionary(
  dictionary: Dictionary,
): HanziWord[] {
  return [
    ...dictionary.hsk1HanziWords,
    ...dictionary.hsk2HanziWords,
    ...dictionary.hsk3HanziWords,
    ...dictionary.hsk4HanziWords,
  ].filter(arrayFilterUnique());
}

export function hanziWordsByRankData({
  skillStates,
  hanziWords,
}: {
  skillStates: CollectionOutput<SkillStateCollection>[];
  hanziWords: HanziWord[];
}): Map<number, RankedHanziWord[]> {
  const skillSrsStates = new Map<Skill, SrsStateType>(
    skillStates.map((item) => [item.skill, item.srs]),
  );
  const rankToHanziWords = new Map<number, RankedHanziWord[]>();

  for (const hanziWord of hanziWords) {
    const rankedHanziWord = getHanziWordRank({
      hanziWord,
      skillSrsStates,
      rankRules,
    });

    const rankNumber = rankedHanziWord.rank;
    const existing = rankToHanziWords.get(rankNumber);
    if (existing == null) {
      rankToHanziWords.set(rankNumber, [rankedHanziWord]);
    } else {
      existing.push(rankedHanziWord);
    }
  }

  for (const unsorted of rankToHanziWords.values()) {
    unsorted.sort(sortComparatorNumber((x) => x.completion));
  }
  return rankToHanziWords;
}

export async function getAllTargetHanziWords(): Promise<HanziWord[]> {
  const dictionary = await loadDictionary();
  return getTargetHanziWordsFromDictionary(dictionary);
}

/**
 * Extracts HanziWord values from priority word settings.
 * Expands single hanzi to all their hanziwords, filters invalid entries,
 * and returns unique words.
 */
export function getPrioritizedHanziWords(
  prioritySettings: CollectionOutput<SettingCollection>[],
  dictionary: Dictionary,
): HanziWord[] {
  const settingPrefix = `pwi/`;
  const words: HanziWord[] = [];
  for (const setting of prioritySettings) {
    if (!setting.key.startsWith(settingPrefix)) {
      continue;
    }

    const wordFromValue = setting.value?.[`w`];
    const wordFromKey = setting.key.slice(settingPrefix.length);
    const word =
      typeof wordFromValue === `string` && wordFromValue.length > 0
        ? wordFromValue
        : wordFromKey;

    if (word.length === 0) {
      continue;
    }

    // Check if word is a hanzi (no ':' separator) or a hanziword
    if (word.includes(`:`) && typeof word === `string`) {
      // It's a hanziword, use it directly
      words.push(word as HanziWord);
    } else if (typeof word === `string`) {
      // It's just hanzi, expand to all hanziwords for that hanzi
      const hanziWordPairs = dictionary.lookupHanzi(
        word as unknown as HanziText,
      );
      for (const [hanziWord] of hanziWordPairs) {
        words.push(hanziWord);
      }
    }
  }
  return words.filter(arrayFilterUnique());
}

export async function getAllTargetSkills(): Promise<Skill[]> {
  const hanziWords = await getAllTargetHanziWords();
  return hanziWords.flatMap((w) => [
    hanziWordToGlossTyped(w),
    hanziWordToPinyinTyped(w),
  ]);
}

export const fetchArrayBufferQuery = (uri: string | null) =>
  queryOptions({
    queryKey: [`fetchArrayBuffer`, uri],
    queryFn:
      uri == null
        ? skipToken
        : async ({ signal }) => {
            await devToolsSlowQuerySleepIfEnabled();
            return fetch(uri, { signal }).then(async (res) =>
              res.arrayBuffer(),
            );
          },
    staleTime: Infinity,
  });

const strokeSvgArraySchema = z.array(z.string());

export const hanziSvgPathsQueryWeb = (hanzi: HanziCharacter | null) =>
  queryOptions({
    queryKey: [`hanziSvgPaths`, hanzi] as const,
    queryFn:
      hanzi == null
        ? skipToken
        : async ({ signal }): Promise<string[] | null> => {
            const response = await fetch(
              `/raw/svgs/${encodeURIComponent(hanzi)}.json`,
              { signal },
            );
            if (!response.ok) {
              return null;
            }

            const json = (await response.json()) as unknown;
            const result = strokeSvgArraySchema.safeParse(json);
            return result.success ? result.data : null;
          },
    staleTime: Infinity,
  });

export const hanziSvgPathsQueryNative = (hanzi: HanziCharacter | null) =>
  queryOptions({
    queryKey: [`hanziSvgPaths`, hanzi] as const,
    queryFn:
      hanzi == null
        ? skipToken
        : async (): Promise<string[] | null> => {
            return null;
          },
    staleTime: Infinity,
  });

export const hanziSvgPathsQuery = Platform.select({
  web: hanziSvgPathsQueryWeb,
  default: hanziSvgPathsQueryNative,
});

const characterDecompositionDataSchema = wikiCharacterDataSchema.pick({
  decompositions: true,
  mnemonic: true,
});

export type CharacterDecompositionData = z.infer<
  typeof characterDecompositionDataSchema
>;

export const characterDecompositionQueryWeb = (hanzi: HanziCharacter | null) =>
  queryOptions({
    queryKey: [`characterDecomposition`, hanzi] as const,
    queryFn:
      hanzi == null
        ? skipToken
        : async ({ signal }): Promise<CharacterDecompositionData | null> => {
            const response = await fetch(
              `/raw/decompositions/${encodeURIComponent(hanzi)}.json`,
              { signal },
            );
            if (!response.ok) {
              return null;
            }

            const json = (await response.json()) as unknown;
            const result = characterDecompositionDataSchema.safeParse(json);
            return result.success ? result.data : null;
          },
    staleTime: Infinity,
  });

export const characterDecompositionQueryNative = (
  hanzi: HanziCharacter | null,
) =>
  queryOptions({
    queryKey: [`characterDecomposition`, hanzi] as const,
    queryFn:
      hanzi == null
        ? skipToken
        : async (): Promise<CharacterDecompositionData | null> => {
            return null;
          },
    staleTime: Infinity,
  });

export const characterDecompositionQuery = Platform.select({
  web: characterDecompositionQueryWeb,
  default: characterDecompositionQueryNative,
});

export const fetchAudioBufferQuery = (
  uri: string | null,
  audioContext: AudioContext | null,
) =>
  queryOptions({
    queryKey: [
      `fetchAudioBuffer`,
      audioContext == null ? `audioContext == null` : `audioContext != null`,
      uri,
    ] as const,
    queryFn:
      uri == null || audioContext == null
        ? (skipToken as never)
        : async (): Promise<AudioBuffer> => {
            await devToolsSlowQuerySleepIfEnabled();
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();
            return audioContext.decodeAudioData(arrayBuffer);
          },
    staleTime: Infinity,
    structuralSharing: false,
    throwOnError: true,
  });

export const deviceStoreQuery = (key: DeviceStoreEntity) =>
  queryOptions({
    queryKey: [`deviceStore`, buildDeviceStoreKey(key)],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();
      return deviceStoreGet(key);
    },
    networkMode: `offlineFirst`,
    retry: false,
    structuralSharing: false,
    throwOnError: true,
  });

export type SkillStateCollection = Collection<
  RizzleEntityOutput<typeof currentSchema.skillState>,
  Skill
>;
export type SkillRatingCollection = Collection<
  RizzleEntityOutput<typeof currentSchema.skillRating>,
  string
>;
export type HanziGlossMistakeCollection = Collection<
  RizzleEntityOutput<typeof currentSchema.hanziGlossMistake>,
  string
>;
export type HanziPinyinMistakeCollection = Collection<
  RizzleEntityOutput<typeof currentSchema.hanziPinyinMistake>,
  string
>;
export type TargetSkillsCollection = Collection<{ skill: Skill }, Skill>;

/**
 * A collection that tracks the most recent {@link SkillRating} for each
 * {@link Skill}. This can be used to determine whether a skill needs to be
 * repeated.
 */
export type LatestSkillRatingsCollection = Collection<SkillRating, Skill>;

export type SettingCollection = Collection<
  RizzleEntityOutput<typeof currentSchema.setting>,
  string
>;

export type SettingHistoryCollection = Collection<
  RizzleEntityOutput<typeof currentSchema.settingHistory>,
  string
>;

export interface UserDictionaryEntry {
  hanzi: HanziText;
  meaningKey: string;
  gloss: string;
  pinyin?: PinyinText;
  note?: string;
}

export type UserDictionaryCollection = Collection<UserDictionaryEntry, string>;

export type DictionarySearchSourceKind = `builtIn` | `user`;

export interface DictionarySearchEntry {
  id: string;
  sourceKind: DictionarySearchSourceKind;
  hanzi: HanziText;
  meaningKey: string;
  hanziWord: HanziWord;
  gloss: string[];
  glossCount: number;
  pos?: PartOfSpeech;
  pinyin?: PinyinText[];
  hsk?: HskLevel;
  hskSortKey: number;
  /**
   * The lowest HSK level at which this character first appears — either as a
   * standalone word or as part of another word. For single-character entries
   * this may be lower than `hsk`. For multi-character entries this equals
   * `hsk`.
   */
  hskFirstAppearance?: HskLevel;
  note?: string;
  hanziCharacterCount: number;
}

export type BuiltInDictionarySearchCollection = Collection<
  DictionarySearchEntry,
  string
>;

export type DictionarySearchCollection = Collection<
  DictionarySearchEntry,
  string
>;

export type CharacterDecompositionCollection = Collection<
  CharacterDecompositionEntry,
  HanziText
>;

export type CharacterComponentUsageCollection = Collection<
  CharacterComponentUsageEntry,
  HanziText
>;

export type CollectionOutput<T> =
  // oxlint-disable-next-line typescript/no-explicit-any
  T extends Collection<infer U, any> ? U : never;
// oxlint-disable-next-line typescript/no-explicit-any
export type CollectionKey<T> = T extends Collection<any, infer K> ? K : never;
export type CollectionChanges<T extends { subscribeChanges: unknown }> =
  T[`subscribeChanges`] extends (...args: infer TArgs) => unknown
    ? TArgs[0] extends (changes: infer TChanges) => void
      ? TChanges
      : never
    : never;

// Extract field codes from entity definitions to avoid hard-coding
const USER_MEANING_FIELD_CODES = new Set(
  userHanziMeaningDefs.map((def) => {
    const keyPath = def.entity._def.keyPath;
    const lastSlash = keyPath.lastIndexOf(`/`);
    return keyPath.slice(lastSlash + 1);
  }),
);

function parseUserMeaningSettingKey(key: string):
  | {
      hanzi: HanziText;
      meaningKey: string;
      field: `g` | `p` | `n`;
      rowKey: string;
    }
  | undefined {
  // Key format: uhm/[hanzi]/[meaningKey]/[field]
  const parts = key.split(`/`);
  if (parts.length !== 4) {
    return undefined;
  }

  const [prefix, hanziRaw, meaningKey, fieldRaw] = parts;
  if (
    prefix !== `uhm` ||
    hanziRaw == null ||
    hanziRaw.length === 0 ||
    meaningKey == null ||
    meaningKey.length === 0
  ) {
    return undefined;
  }

  // Validate field code against entity definitions
  if (fieldRaw == null || !USER_MEANING_FIELD_CODES.has(fieldRaw)) {
    return undefined;
  }

  const hanzi = hanziRaw as HanziText;
  return {
    hanzi,
    meaningKey,
    field: fieldRaw as `g` | `p` | `n`,
    rowKey: `${hanzi}:${meaningKey}`,
  };
}

function getSettingTextValue(value: unknown): string | undefined {
  if (typeof value !== `object` || value == null) {
    return undefined;
  }

  const text = (value as { t?: unknown }).t;
  if (typeof text !== `string` || text.length === 0) {
    return undefined;
  }

  return text;
}

function userDictionaryCollectionOptions({
  settingCollection,
}: {
  settingCollection: SettingCollection;
}): CollectionConfig<UserDictionaryEntry, string> {
  const userMeaningSettings = createLiveQueryCollection((q) =>
    q
      .from({ setting: settingCollection })
      .where(({ setting }) => like(setting.key, `uhm/%`)),
  );

  type UserDictionaryDraft = Omit<UserDictionaryEntry, `gloss`> & {
    gloss?: string;
  };

  const draftsByKey = new Map<string, UserDictionaryDraft>();

  const materialize = (
    draft: UserDictionaryDraft | undefined,
  ): UserDictionaryEntry | undefined => {
    if (draft?.gloss == null || draft.gloss.length === 0) {
      return undefined;
    }

    return {
      hanzi: draft.hanzi,
      meaningKey: draft.meaningKey,
      gloss: draft.gloss,
      pinyin: draft.pinyin,
      note: draft.note,
    };
  };

  return {
    autoIndex: `eager`,
    defaultIndexType: BTreeIndex,
    id: `userDictionary`,
    sync: {
      rowUpdateMode: `full`,
      sync: (params) => {
        const { begin, write, commit, collection } = params;

        const markReadyOnce = memoize0(() => {
          params.markReady();
        });
        const markReadyTimeout = setTimeout(() => {
          markReadyOnce();
        }, 5000);

        const onChanges = (
          changes: CollectionChanges<typeof userMeaningSettings>,
        ) => {
          try {
            begin();

            const changedRowKeys = new Set<string>();

            for (const change of changes) {
              const setting =
                change.type === `delete`
                  ? (change.previousValue ?? change.value)
                  : change.value;
              const parsed = parseUserMeaningSettingKey(setting.key);
              if (parsed == null) {
                continue;
              }

              const text = getSettingTextValue(setting.value);
              const draft =
                draftsByKey.get(parsed.rowKey) ??
                ({
                  hanzi: parsed.hanzi,
                  meaningKey: parsed.meaningKey,
                } satisfies UserDictionaryDraft);

              if (change.type === `delete`) {
                if (parsed.field === `g`) {
                  delete draft.gloss;
                } else if (parsed.field === `p`) {
                  delete draft.pinyin;
                } else {
                  delete draft.note;
                }
              } else if (parsed.field === `g`) {
                draft.gloss = text;
              } else if (parsed.field === `p`) {
                draft.pinyin = text as PinyinText | undefined;
              } else {
                draft.note = text;
              }

              const hasAnyField =
                draft.gloss != null ||
                draft.pinyin != null ||
                draft.note != null;
              if (hasAnyField) {
                draftsByKey.set(parsed.rowKey, draft);
              } else {
                draftsByKey.delete(parsed.rowKey);
              }

              changedRowKeys.add(parsed.rowKey);
            }

            for (const rowKey of changedRowKeys) {
              const existing = collection.get(rowKey);
              const next = materialize(draftsByKey.get(rowKey));

              if (existing == null && next != null) {
                write({ type: `insert`, value: next });
                continue;
              }

              if (existing != null && next == null) {
                write({ type: `delete`, value: existing });
                continue;
              }

              if (
                existing != null &&
                next != null &&
                (existing.gloss !== next.gloss ||
                  existing.pinyin !== next.pinyin ||
                  existing.note !== next.note)
              ) {
                write({ type: `update`, value: next });
              }
            }

            commit();
          } finally {
            markReadyOnce();
          }
        };

        let subscription:
          | ReturnType<typeof userMeaningSettings.subscribeChanges>
          | undefined;
        let isDisposed = false;

        void userMeaningSettings
          .preload()
          .then(() => {
            if (isDisposed) {
              return;
            }

            subscription = userMeaningSettings.subscribeChanges(onChanges, {
              includeInitialState: true,
            });
          })
          .catch((error: unknown) => {
            console.error(`userDictionary preload failed`, error);
          });

        return () => {
          isDisposed = true;
          clearTimeout(markReadyTimeout);
          subscription?.unsubscribe();
        };
      },
    },
    getKey: (item) => `${item.hanzi}:${item.meaningKey}`,
  };
}

function builtInDictionarySearchCollectionOptions(): CollectionConfig<
  DictionarySearchEntry,
  string
> {
  return staticCollectionOptions<DictionarySearchEntry, string>({
    id: `builtInDictionarySearch`,
    queryFn: async () => {
      const dictionary = await loadDictionary();
      const entries: DictionarySearchEntry[] = [];

      // Build a map of each character to the minimum HSK level it appears in
      // across all words (including multi-character words it's part of).
      const charMinHskMap = new Map<string, HskLevel>();
      for (const [hanziWord, meaning] of dictionary.allEntries) {
        if (meaning.hsk == null) {
          continue;
        }
        const hanzi = hanziFromHanziWord(hanziWord);
        for (const char of matchAllHanziCharacters(hanzi)) {
          const existing = charMinHskMap.get(char);
          if (
            existing == null ||
            hskLevelToNumber(meaning.hsk) < hskLevelToNumber(existing)
          ) {
            charMinHskMap.set(char, meaning.hsk);
          }
        }
      }

      for (const [hanziWord, meaning] of dictionary.allEntries) {
        const gloss = meaning.gloss.filter((item) => item.length > 0);
        if (gloss.length === 0) {
          continue;
        }

        const pinyin = meaning.pinyin?.filter((item) => item.length > 0);

        const hanzi = hanziFromHanziWord(hanziWord);
        const meaningKey = meaningKeyFromHanziWord(hanziWord);
        const hanziChars = matchAllHanziCharacters(hanzi);
        const hanziCharacterCount = hanziChars.length;
        const hskFirstAppearance =
          hanziCharacterCount === 1
            ? charMinHskMap.get(hanzi as string)
            : meaning.hsk;

        entries.push({
          id: `builtIn:${hanziWord}`,
          sourceKind: `builtIn`,
          hanzi,
          meaningKey,
          hanziWord,
          gloss,
          glossCount: gloss.length,
          pos: meaning.pos,
          pinyin,
          hsk: meaning.hsk,
          hskSortKey: dictionarySearchHskSortKey(meaning.hsk),
          hskFirstAppearance,
          hanziCharacterCount,
        });
      }

      return entries;
    },
    getKey: (item) => item.id,
  });
}

function parseUserWikiCharacterDecompositionKey(
  key: string,
): HanziText | undefined {
  const keyPrefix = userWikiCharacterDecompositionSetting.entity.keyPrefix;
  if (!key.startsWith(keyPrefix)) {
    return undefined;
  }

  const marshaledHanzi = key.slice(keyPrefix.length);
  if (marshaledHanzi.length === 0) {
    return undefined;
  }

  try {
    return decodeURIComponent(marshaledHanzi) as HanziText;
  } catch {
    return undefined;
  }
}

function parseUserWikiCharacterDecompositionValue(
  hanzi: HanziText,
  value: unknown,
): WikiCharacterDecomposition | null {
  const hanziAlias =
    userWikiCharacterDecompositionSetting.entity._def.valueType._def.shape.hanzi
      ._def.alias;

  const hydratedValue =
    typeof value === `object` && value != null
      ? {
          [hanziAlias]: encodeURIComponent(hanzi),
          ...(value as Record<string, unknown>),
        }
      : value;

  let decodedValue: ReturnType<
    typeof userWikiCharacterDecompositionSetting.entity.unmarshalValue
  >;
  try {
    decodedValue = userWikiCharacterDecompositionSetting.entity.unmarshalValue(
      hydratedValue as RizzleEntityMarshaled<
        typeof userWikiCharacterDecompositionSetting.entity
      >,
    );
  } catch {
    return null;
  }

  const parsed = wikiCharacterDecompositionSchema.safeParse(
    decodedValue.components,
  );
  if (parsed.success) {
    return parsed.data;
  }

  return null;
}

function areCharacterDecompositionComponentsEqual(
  a: WikiCharacterDecomposition | undefined,
  b: WikiCharacterDecomposition | undefined,
): boolean {
  if (a === b) {
    return true;
  }

  if (a == null || b == null) {
    return false;
  }

  if (decompositionComponentsToIds(a) !== decompositionComponentsToIds(b)) {
    return false;
  }

  const aLeafs = [...walkIdsNodeLeafs(a)];
  const bLeafs = [...walkIdsNodeLeafs(b)];
  if (aLeafs.length !== bLeafs.length) {
    return false;
  }

  for (let i = 0; i < aLeafs.length; i += 1) {
    const left = aLeafs[i];
    const right = bLeafs[i];
    if (
      left?.hanzi !== right?.hanzi ||
      left?.label !== right?.label ||
      left?.strokes !== right?.strokes ||
      left?.strokeDiff !== right?.strokeDiff ||
      left?.color !== right?.color
    ) {
      return false;
    }
  }

  return true;
}

function userCharacterDecompositionCollectionOptions({
  settingCollection,
}: {
  settingCollection: SettingCollection;
}): CollectionConfig<CharacterDecompositionEntry, HanziText> {
  const overrideSettings = createLiveQueryCollection((q) =>
    q
      .from({ setting: settingCollection })
      .where(({ setting }) =>
        like(
          setting.key,
          `${userWikiCharacterDecompositionSetting.entity.keyPrefix}%`,
        ),
      ),
  );

  return {
    autoIndex: `eager`,
    defaultIndexType: BTreeIndex,
    id: `userCharacterDecomposition`,
    sync: {
      rowUpdateMode: `full`,
      sync: (params) => {
        const { begin, write, commit, collection } = params;

        const markReadyOnce = memoize0(() => {
          params.markReady();
        });
        const markReadyTimeout = setTimeout(() => {
          markReadyOnce();
        }, 5000);

        type OverrideSettingChanges = CollectionChanges<
          typeof overrideSettings
        >;

        const onChanges = (changes: OverrideSettingChanges) => {
          try {
            begin();

            for (const change of changes) {
              const setting =
                change.type === `delete`
                  ? (change.previousValue ?? change.value)
                  : change.value;
              const hanzi = parseUserWikiCharacterDecompositionKey(setting.key);
              if (hanzi == null) {
                continue;
              }

              if (change.type === `delete`) {
                const existing = collection.get(hanzi);
                if (existing != null) {
                  write({ type: `delete`, value: existing });
                }
                continue;
              }

              const decompositionComponents =
                parseUserWikiCharacterDecompositionValue(
                  hanzi,
                  change.value.value,
                );
              const existing = collection.get(hanzi);

              if (decompositionComponents == null) {
                if (existing != null) {
                  write({ type: `delete`, value: existing });
                }
                continue;
              }

              const next: CharacterDecompositionEntry = {
                hanzi,
                decompositionComponents,
              };

              if (existing == null) {
                write({ type: `insert`, value: next });
                continue;
              }

              if (
                !areCharacterDecompositionComponentsEqual(
                  existing.decompositionComponents,
                  next.decompositionComponents,
                )
              ) {
                write({ type: `update`, value: next });
              }
            }

            commit();
          } finally {
            markReadyOnce();
          }
        };

        let subscription:
          | ReturnType<typeof overrideSettings.subscribeChanges>
          | undefined;
        let isDisposed = false;

        void overrideSettings
          .preload()
          .then(() => {
            if (isDisposed) {
              return;
            }

            subscription = overrideSettings.subscribeChanges(onChanges, {
              includeInitialState: true,
            });
          })
          .catch((error: unknown) => {
            console.error(`userCharacterDecomposition preload failed`, error);
            markReadyOnce();
          });

        return () => {
          isDisposed = true;
          clearTimeout(markReadyTimeout);
          subscription?.unsubscribe();
        };
      },
    },
    getKey: (item) => item.hanzi,
  };
}

function characterDecompositionCollectionOptions({
  builtinCharacterDecomposition,
  userCharacterDecomposition,
}: {
  builtinCharacterDecomposition: CharacterDecompositionCollection;
  userCharacterDecomposition: CharacterDecompositionCollection;
}): CollectionConfig<CharacterDecompositionEntry, HanziText> {
  const builtInByHanzi = new Map<HanziText, CharacterDecompositionEntry>();
  const userByHanzi = new Map<HanziText, CharacterDecompositionEntry>();

  return {
    autoIndex: `eager`,
    defaultIndexType: BTreeIndex,
    id: `characterDecomposition`,
    sync: {
      rowUpdateMode: `full`,
      sync: (params) => {
        const { begin, write, commit, collection } = params;

        const markReadyOnce = memoize0(() => {
          params.markReady();
        });
        const markReadyTimeout = setTimeout(() => {
          markReadyOnce();
        }, 5000);

        const applyRow = (hanzi: HanziText) => {
          const user = userByHanzi.get(hanzi);
          const builtIn = builtInByHanzi.get(hanzi);
          const nextComponents =
            user?.decompositionComponents ?? builtIn?.decompositionComponents;
          const existing = collection.get(hanzi);

          if (nextComponents == null) {
            if (existing != null) {
              write({ type: `delete`, value: existing });
            }
            return;
          }

          const next: CharacterDecompositionEntry = {
            hanzi,
            decompositionComponents: nextComponents,
          };

          if (existing == null) {
            write({ type: `insert`, value: next });
            return;
          }

          if (
            !areCharacterDecompositionComponentsEqual(
              existing.decompositionComponents,
              next.decompositionComponents,
            )
          ) {
            write({ type: `update`, value: next });
          }
        };

        type UserChanges = CollectionChanges<typeof userCharacterDecomposition>;

        type BuiltInChanges = CollectionChanges<
          typeof builtinCharacterDecomposition
        >;

        const onBuiltInChanges = (changes: BuiltInChanges) => {
          try {
            begin();

            const changedHanzi = new Set<HanziText>();

            for (const change of changes) {
              if (change.type === `delete`) {
                const previous = change.previousValue ?? change.value;
                builtInByHanzi.delete(previous.hanzi);
                changedHanzi.add(previous.hanzi);
                continue;
              }

              builtInByHanzi.set(change.value.hanzi, {
                hanzi: change.value.hanzi,
                decompositionComponents: change.value.decompositionComponents,
              });
              changedHanzi.add(change.value.hanzi);
            }

            for (const hanzi of changedHanzi) {
              applyRow(hanzi);
            }

            commit();
          } finally {
            markReadyOnce();
          }
        };

        const onOverrideChanges = (changes: UserChanges) => {
          try {
            begin();

            const changedHanzi = new Set<HanziText>();

            for (const change of changes) {
              if (change.type === `delete`) {
                const previous = change.previousValue ?? change.value;
                userByHanzi.delete(previous.hanzi);
                changedHanzi.add(previous.hanzi);
                continue;
              }

              userByHanzi.set(change.value.hanzi, {
                hanzi: change.value.hanzi,
                decompositionComponents: change.value.decompositionComponents,
              });
              changedHanzi.add(change.value.hanzi);
            }

            for (const hanzi of changedHanzi) {
              applyRow(hanzi);
            }

            commit();
          } finally {
            markReadyOnce();
          }
        };

        let subscription:
          | {
              unsubscribe: () => void;
            }
          | undefined;
        let isDisposed = false;

        void Promise.all([
          builtinCharacterDecomposition.preload(),
          userCharacterDecomposition.preload(),
        ])
          .then(() => {
            if (isDisposed) {
              return;
            }

            const builtInSubscription =
              builtinCharacterDecomposition.subscribeChanges(onBuiltInChanges, {
                includeInitialState: true,
              });

            const userSubscription =
              userCharacterDecomposition.subscribeChanges(onOverrideChanges, {
                includeInitialState: true,
              });

            subscription = {
              unsubscribe: () => {
                builtInSubscription.unsubscribe();
                userSubscription.unsubscribe();
              },
            };
          })
          .catch((error: unknown) => {
            console.error(`characterDecomposition preload failed`, error);
            markReadyOnce();
          });

        return () => {
          isDisposed = true;
          clearTimeout(markReadyTimeout);
          subscription?.unsubscribe();
        };
      },
    },
    getKey: (item) => item.hanzi,
  };
}

function mapUserMeaningToDictionarySearchEntry(
  userEntry: UserDictionaryEntry,
): DictionarySearchEntry {
  const hanziWord = buildHanziWord(userEntry.hanzi, userEntry.meaningKey);
  const pinyin =
    userEntry.pinyin == null || userEntry.pinyin.length === 0
      ? undefined
      : [userEntry.pinyin];

  return {
    id: `user:${hanziWord}`,
    sourceKind: `user`,
    hanzi: userEntry.hanzi,
    meaningKey: userEntry.meaningKey,
    hanziWord,
    gloss: [userEntry.gloss],
    glossCount: 1,
    pos: undefined,
    pinyin,
    hsk: undefined,
    hskSortKey: dictionarySearchHskSortKey(),
    note: userEntry.note,
    hanziCharacterCount: matchAllHanziCharacters(userEntry.hanzi).length,
  };
}

function builtInCharacterDecompositionCollectionOptions(): CollectionConfig<
  CharacterDecompositionEntry,
  HanziText
> {
  return staticCollectionOptions<CharacterDecompositionEntry, HanziText>({
    id: `builtInCharacterDecomposition`,
    queryFn: async () => {
      const entries = await loadBuiltinCharacterDecompositionEntries();
      return entries as CharacterDecompositionEntry[];
    },
    getKey: (item) => item.hanzi,
  });
}

function dictionarySearchHskSortKey(hsk?: HskLevel): number {
  return hsk == null ? 9999 : hskLevelToNumber(hsk);
}

function areStringArraysEqual(
  a: readonly string[] | undefined,
  b: readonly string[] | undefined,
) {
  if (a === b) {
    return true;
  }

  if (a == null || b == null || a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

function dictionarySearchCollectionOptions({
  builtInDictionarySearch,
  userDictionary,
}: {
  builtInDictionarySearch: BuiltInDictionarySearchCollection;
  userDictionary: UserDictionaryCollection;
}): CollectionConfig<DictionarySearchEntry, string> {
  const builtInRows = createLiveQueryCollection((q) =>
    q.from({ entry: builtInDictionarySearch }),
  );

  const userRows = createLiveQueryCollection((q) =>
    q.from({ entry: userDictionary }),
  );

  return {
    autoIndex: `eager`,
    defaultIndexType: BTreeIndex,
    id: `dictionarySearch`,
    sync: {
      rowUpdateMode: `full`,
      sync: (params) => {
        const { begin, write, commit, collection } = params;

        const markReadyOnce = memoize0(() => {
          params.markReady();
        });
        const markReadyTimeout = setTimeout(() => {
          markReadyOnce();
        }, 5000);

        const applyRow = (next: DictionarySearchEntry | undefined) => {
          if (next == null) {
            return;
          }

          const existing = collection.get(next.id);

          if (existing == null) {
            write({ type: `insert`, value: next });
            return;
          }

          if (
            existing.sourceKind !== next.sourceKind ||
            existing.hanzi !== next.hanzi ||
            existing.meaningKey !== next.meaningKey ||
            existing.hanziWord !== next.hanziWord ||
            !areStringArraysEqual(existing.gloss, next.gloss) ||
            existing.glossCount !== next.glossCount ||
            existing.pos !== next.pos ||
            !areStringArraysEqual(existing.pinyin, next.pinyin) ||
            existing.hsk !== next.hsk ||
            existing.hskSortKey !== next.hskSortKey ||
            existing.note !== next.note
          ) {
            write({ type: `update`, value: next });
          }
        };

        const deleteRow = (id: string) => {
          const existing = collection.get(id);
          if (existing != null) {
            write({ type: `delete`, value: existing });
          }
        };

        type BuiltInChanges = CollectionChanges<typeof builtInRows>;

        type UserChanges = CollectionChanges<typeof userRows>;

        const onBuiltInChanges = (changes: BuiltInChanges) => {
          try {
            begin();

            for (const change of changes) {
              if (change.type === `delete`) {
                const id = change.previousValue?.id ?? change.value.id;
                deleteRow(id);
                continue;
              }

              applyRow(change.value);
            }

            commit();
          } finally {
            markReadyOnce();
          }
        };

        const onUserChanges = (changes: UserChanges) => {
          try {
            begin();

            for (const change of changes) {
              if (change.type === `delete`) {
                const previous = change.previousValue ?? change.value;
                const id = `user:${buildHanziWord(previous.hanzi, previous.meaningKey)}`;
                deleteRow(id);
                continue;
              }

              applyRow(mapUserMeaningToDictionarySearchEntry(change.value));
            }

            commit();
          } finally {
            markReadyOnce();
          }
        };

        let builtInSubscription:
          | ReturnType<typeof builtInRows.subscribeChanges>
          | undefined;
        let userSubscription:
          | ReturnType<typeof userRows.subscribeChanges>
          | undefined;
        let isDisposed = false;

        void Promise.all([builtInRows.preload(), userRows.preload()])
          .then(() => {
            if (isDisposed) {
              return;
            }

            builtInSubscription = builtInRows.subscribeChanges(
              onBuiltInChanges,
              { includeInitialState: true },
            );

            userSubscription = userRows.subscribeChanges(onUserChanges, {
              includeInitialState: true,
            });
          })
          .catch((error: unknown) => {
            console.error(`dictionarySearch preload failed`, error);
          });

        return () => {
          isDisposed = true;
          clearTimeout(markReadyTimeout);
          builtInSubscription?.unsubscribe();
          userSubscription?.unsubscribe();
        };
      },
    },
    getKey: (item) => item.id,
  };
}

export const rizzleCollectionOptions = <
  RizzleEntity extends RizzleAnyEntity,
  TKey extends string | number = string | number,
>({
  id,
  rizzle,
  entity,
  getKey,
}: {
  id?: string;
  rizzle: Rizzle;
  entity: RizzleEntity;
  getKey: (item: RizzleEntityOutput<RizzleEntity>) => TKey;
}): CollectionConfig<RizzleEntityOutput<RizzleEntity>, TKey> => ({
  autoIndex: `eager`,
  defaultIndexType: BTreeIndex,
  id,
  sync: {
    rowUpdateMode: `full`,
    sync: (params) => {
      const { begin, write, commit } = params;

      const markReadyOnce = memoize0(() => {
        params.markReady();
      });
      const markReadyTimeout = setTimeout(() => {
        markReadyOnce();
      }, 5000);

      const unsubscribe = rizzle.replicache.experimentalWatch(
        (ops) => {
          try {
            begin();

            for (const op of ops) {
              switch (op.op) {
                case `add`: {
                  const value = entity.unmarshalValue(
                    op.newValue as RizzleEntityMarshaled<typeof entity>,
                  );
                  write({ type: `insert`, value });
                  break;
                }
                case `change`: {
                  const value = entity.unmarshalValue(
                    op.newValue as RizzleEntityMarshaled<typeof entity>,
                  );
                  write({ type: `update`, value });
                  break;
                }
                case `del`: {
                  const value = entity.unmarshalValue(
                    op.oldValue as RizzleEntityMarshaled<typeof entity>,
                  );
                  write({ type: `delete`, value });
                  break;
                }
              }
            }

            commit();
          } finally {
            markReadyOnce();
          }
        },
        {
          prefix: entity.keyPrefix,
          initialValuesInFirstDiff: true,
        },
      );

      return () => {
        clearTimeout(markReadyTimeout);
        unsubscribe();
      };
    },
  },
  getKey,
});

export const staticCollectionOptions = <
  T extends object,
  TKey extends string | number = string | number,
>({
  id,
  queryFn,
  getKey,
}: {
  id?: string;
  queryFn: (signal?: AbortSignal) => Promise<T[]>;
  getKey: (item: T) => TKey;
}): CollectionConfig<T, TKey> => ({
  autoIndex: `eager`,
  defaultIndexType: BTreeIndex,
  id,
  sync: {
    sync: (params) => {
      const { begin, write, commit, markReady, collection } = params;

      const abortController = new AbortController();
      const signal = abortController.signal;

      queryFn(signal)
        .then((items) => {
          if (signal.aborted) {
            return;
          }

          begin();

          for (const item of items) {
            write({ type: `insert`, value: item });
          }

          commit();
        })
        .catch((error: unknown) => {
          console.error(`staticCollection(id=${collection.id}) error:`, error);
        })
        .finally(() => {
          markReady();
        });

      return () => {
        abortController.abort();
      };
    },
  },
  getKey,
});

export const latestSkillRatingCollectionOptions = ({
  rizzle,
}: {
  rizzle: Rizzle;
}): CollectionConfig<SkillRating, Skill> => ({
  autoIndex: `eager`,
  defaultIndexType: BTreeIndex,
  id: `latestSkillRatings`,
  sync: {
    rowUpdateMode: `full`,
    sync: (params) => {
      const { begin, write, commit, markReady, collection } = params;
      const entity = currentSchema.skillRating;

      const unsubscribe = rizzle.replicache.experimentalWatch(
        (ops) => {
          begin();

          const pendingTxLatest = new Map<Skill, SkillRating>();

          for (const op of ops) {
            switch (op.op) {
              case `change`:
              case `add`: {
                const value = entity.unmarshalValue(
                  op.newValue as RizzleEntityMarshaled<typeof entity>,
                );

                const existing =
                  collection.get(value.skill) ??
                  pendingTxLatest.get(value.skill);

                // Don't add trashed ratings.
                if (value.trashedAt != null) {
                  if (op.op === `change` && existing?.id === value.id) {
                    // If the trashed rating was the existing latest, delete it.
                    // This is a hack and can probably cause some quirks but it
                    // shouldn't really matter. The more correct way would be to
                    // re-scan all ratings for the skill to find the latest
                    // untrashed one, but that would be async and a bit
                    // performance intensive and probably not worth it.
                    write({ type: `delete`, value: existing });
                  }
                  continue;
                }

                if (existing == null) {
                  write({ type: `insert`, value });
                  pendingTxLatest.set(value.skill, value);
                } else if (existing.createdAt < value.createdAt) {
                  write({ type: `update`, value });
                  pendingTxLatest.set(value.skill, value);
                }
                break;
              }
              case `del`: {
                console.error(`unsupported op=${op.op} for latestSkillRatings`);
                break;
              }
            }
          }

          commit();
        },
        {
          prefix: entity.keyPrefix,
          initialValuesInFirstDiff: true,
        },
      );

      markReady();

      return () => {
        unsubscribe();
      };
    },
  },
  getKey: (item) => item.skill,
});

export interface Db {
  builtinCharacterDecomposition: CharacterDecompositionCollection;
  builtInDictionarySearch: BuiltInDictionarySearchCollection;
  characterComponentUsage: CharacterComponentUsageCollection;
  characterDecompositionCollection: CharacterDecompositionCollection;
  dictionarySearch: DictionarySearchCollection;
  hanziGlossMistakeCollection: HanziGlossMistakeCollection;
  hanziPinyinMistakeCollection: HanziPinyinMistakeCollection;
  latestSkillRatingsCollection: LatestSkillRatingsCollection;
  settingCollection: SettingCollection;
  settingHistoryCollection: SettingHistoryCollection;
  skillRatingCollection: SkillRatingCollection;
  skillStateCollection: SkillStateCollection;
  targetSkillsCollection: TargetSkillsCollection;
  userCharacterDecomposition: CharacterDecompositionCollection;
  userDictionary: UserDictionaryCollection;
}

export function makeDb(rizzle: Rizzle): Db {
  const skillStateCollection: SkillStateCollection = createCollection(
    rizzleCollectionOptions({
      id: `skillState`,
      rizzle,
      entity: currentSchema.skillState,
      getKey: (item) => item.skill,
    }),
  );

  const skillRatingCollection: SkillRatingCollection = createCollection(
    rizzleCollectionOptions({
      id: `skillRating`,
      rizzle,
      entity: currentSchema.skillRating,
      getKey: (item) => item.id,
    }),
  );

  const hanziGlossMistakeCollection: HanziGlossMistakeCollection =
    createCollection(
      rizzleCollectionOptions({
        id: `hanziGlossMistake`,
        rizzle,
        entity: currentSchema.hanziGlossMistake,
        getKey: (item) => item.id,
      }),
    );

  const hanziPinyinMistakeCollection: HanziPinyinMistakeCollection =
    createCollection(
      rizzleCollectionOptions({
        id: `hanziPinyinMistake`,
        rizzle,
        entity: currentSchema.hanziPinyinMistake,
        getKey: (item) => item.id,
      }),
    );

  const targetSkillsCollection: TargetSkillsCollection = createCollection(
    staticCollectionOptions({
      id: `targetSkills`,
      queryFn: async () => {
        const targetSkills = await getAllTargetSkills();
        return targetSkills.map((skill) => ({ skill }));
      },
      getKey: (item) => item.skill,
    }),
  );

  const latestSkillRatingsCollection: LatestSkillRatingsCollection =
    createCollection(latestSkillRatingCollectionOptions({ rizzle }));

  const settingCollection: SettingCollection = createCollection(
    rizzleCollectionOptions({
      id: `setting`,
      rizzle,
      entity: currentSchema.setting,
      getKey: (item) => item.key,
    }),
  );

  const settingHistoryCollection: SettingHistoryCollection = createCollection(
    rizzleCollectionOptions({
      id: `settingHistory`,
      rizzle,
      entity: currentSchema.settingHistory,
      getKey: (item) => item.id,
    }),
  );

  const userCharacterDecomposition: CharacterDecompositionCollection =
    createCollection(
      userCharacterDecompositionCollectionOptions({
        settingCollection,
      }),
    );

  const userDictionary: UserDictionaryCollection = createCollection(
    userDictionaryCollectionOptions({ settingCollection }),
  );

  const builtInDictionarySearch: BuiltInDictionarySearchCollection =
    createCollection(builtInDictionarySearchCollectionOptions());

  const builtinCharacterDecomposition: CharacterDecompositionCollection =
    createCollection(builtInCharacterDecompositionCollectionOptions());

  const dictionarySearch: DictionarySearchCollection = createCollection(
    dictionarySearchCollectionOptions({
      builtInDictionarySearch,
      userDictionary,
    }),
  );

  const characterDecompositionCollection: CharacterDecompositionCollection =
    createCollection(
      characterDecompositionCollectionOptions({
        builtinCharacterDecomposition,
        userCharacterDecomposition,
      }),
    );

  const characterComponentUsage: CharacterComponentUsageCollection =
    createCollection({
      autoIndex: `eager`,
      defaultIndexType: BTreeIndex,
      id: `characterComponentUsage`,
      sync: {
        rowUpdateMode: `full`,
        sync: (params) => {
          const { begin, write, commit, collection } = params;

          const markReadyOnce = memoize0(() => {
            params.markReady();
          });
          const markReadyTimeout = setTimeout(() => {
            markReadyOnce();
          }, 5000);

          const applyRows = async () => {
            const nextRows = await buildCharacterComponentUsageEntries(
              characterDecompositionCollection.toArray.map((entry) => ({
                hanzi: entry.hanzi,
                decompositionComponents: entry.decompositionComponents,
              })),
            );

            const nextByKey = new Map(
              nextRows.map((row) => [row.component, row]),
            );

            begin();

            for (const existing of collection.toArray) {
              if (!nextByKey.has(existing.component)) {
                write({ type: `delete`, value: existing });
              }
            }

            for (const next of nextRows) {
              const existing = collection.get(next.component);

              if (existing == null) {
                write({ type: `insert`, value: next });
                continue;
              }

              if (
                !areStringArraysEqual(existing.usedInHanzi, next.usedInHanzi)
              ) {
                write({ type: `update`, value: next });
              }
            }

            commit();
            markReadyOnce();
          };

          let subscription:
            | ReturnType<
                typeof characterDecompositionCollection.subscribeChanges
              >
            | undefined;
          let isDisposed = false;

          void characterDecompositionCollection
            .preload()
            .then(async () => {
              if (isDisposed) {
                return;
              }

              await applyRows();

              subscription = characterDecompositionCollection.subscribeChanges(
                () => {
                  void applyRows().catch((error: unknown) => {
                    console.error(
                      `characterComponentUsage recompute failed`,
                      error,
                    );
                  });
                },
              );
            })
            .catch((error: unknown) => {
              console.error(`characterComponentUsage preload failed`, error);
              markReadyOnce();
            });

          return () => {
            isDisposed = true;
            clearTimeout(markReadyTimeout);
            subscription?.unsubscribe();
          };
        },
      },
      getKey: (item) => item.component,
    });

  return {
    builtinCharacterDecomposition,
    builtInDictionarySearch,
    characterComponentUsage,
    characterDecompositionCollection,
    userCharacterDecomposition,
    dictionarySearch,
    settingCollection,
    settingHistoryCollection,
    userDictionary,
    hanziGlossMistakeCollection,
    hanziPinyinMistakeCollection,
    latestSkillRatingsCollection,
    skillRatingCollection,
    skillStateCollection,
    targetSkillsCollection,
  };
}
