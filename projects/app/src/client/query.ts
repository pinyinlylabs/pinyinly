import type {
  CharacterComponentUsageRow,
  CharacterDecompositionRow,
  CharacterMnemonicIdsRow,
  HanziCharacter,
  HanziIds,
  HanziText,
  HanziWord,
  Hsk3Level,
  PartOfSpeech,
  PinyinText,
  Skill,
  SrsStateType,
} from "@/data/model";
import { characterJsonSchema } from "@/data/model";
import type { Rizzle, SkillRating } from "@/data/rizzleSchema";
import { currentSchema } from "@/data/rizzleSchema";
import type { RankedHanziWord } from "@/data/skills";
import { hsk3LevelToNumber } from "@/data/hsk";
import {
  getHanziWordRank,
  hanziWordToGlossTyped,
  hanziWordToPinyinTyped,
  rankRules,
} from "@/data/skills";
import { userHanziMeaningDefs } from "@/data/userSettings";
import type { Dictionary } from "@/dictionary";
import {
  buildCharacterComponentUsageEntries,
  buildHanziWord,
  getIsStructuralHanzi,
  hanziFromHanziWord,
  loadCharactersJson,
  loadBuiltinCharacterDecompositionEntries,
  loadDictionary,
  meaningKeyFromHanziWord,
} from "@/dictionary";
import { matchAllHanziCharacters } from "@/data/hanzi";
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
import isEqual from "lodash/isEqual";
import { Platform } from "react-native";
import { z } from "zod";
import type { DeviceStoreEntity } from "./deviceStore";
import { buildDeviceStoreKey, deviceStoreGet } from "./deviceStore";
import { BTreeIndex, concat } from "@tanstack/db";

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

export const charactersJsonQuery = queryOptions({
  queryKey: [`charactersJson`],
  queryFn: async () => {
    await devToolsSlowQuerySleepIfEnabled();

    return loadCharactersJson();
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

const hanziSvgDataSchema = z
  .strictObject({
    strokes: z.array(z.string()),
    medians: z.array(z.string()).optional(),
    segments: z.record(z.string(), z.string()).optional(),
  })
  .describe(
    `SVG stroke and median data with optional precomputed segment paths.`,
  );

const wikiMdastRootSchema = z.looseObject({
  type: z.literal(`root`),
  children: z.array(z.unknown()),
});

export type WikiMdastRoot = z.infer<typeof wikiMdastRootSchema>;
export type HanziSvgData = z.infer<typeof hanziSvgDataSchema>;

export const hanziSvgPathsQueryWeb = (hanzi: HanziCharacter | null) =>
  queryOptions({
    queryKey: [`hanziSvgPaths`, hanzi] as const,
    queryFn:
      hanzi == null
        ? skipToken
        : async ({ signal }): Promise<HanziSvgData | null> => {
            const response = await fetch(
              `/raw/svgs/${encodeURIComponent(hanzi)}.json`,
              { signal },
            );
            if (!response.ok) {
              return null;
            }

            const json = (await response.json()) as unknown;
            const result = hanziSvgDataSchema.safeParse(json);
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
        : async (): Promise<HanziSvgData | null> => {
            return null;
          },
    staleTime: Infinity,
  });

export const hanziSvgPathsQuery = Platform.select({
  web: hanziSvgPathsQueryWeb,
  default: hanziSvgPathsQueryNative,
});

export const wikiMdxQueryWeb = (hanzi: HanziText | null) =>
  queryOptions({
    queryKey: [`wikiMdx`, hanzi] as const,
    queryFn:
      hanzi == null
        ? skipToken
        : async ({ signal }): Promise<WikiMdastRoot | null> => {
            const response = await fetch(
              `/raw/mdx/${encodeURIComponent(hanzi)}.json`,
              { signal },
            );
            if (!response.ok) {
              return null;
            }

            const json = (await response.json()) as unknown;
            const result = wikiMdastRootSchema.safeParse(json);
            return result.success ? result.data : null;
          },
    staleTime: Infinity,
  });

export const wikiMdxQueryNative = (hanzi: HanziText | null) =>
  queryOptions({
    queryKey: [`wikiMdx`, hanzi] as const,
    queryFn:
      hanzi == null
        ? skipToken
        : async (): Promise<WikiMdastRoot | null> => {
            return null;
          },
    staleTime: Infinity,
  });

export const wikiMdxQuery = Platform.select({
  web: wikiMdxQueryWeb,
  default: wikiMdxQueryNative,
});

const characterDecompositionDataSchema = characterJsonSchema.pick({
  decompositions: true,
  mnemonic: true,
});

export type CharacterDecompositionData = z.infer<
  typeof characterDecompositionDataSchema
>;

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
  freq?: number;
  gloss: string[];
  glossCount: number;
  pos?: PartOfSpeech;
  pinyin?: PinyinText[];
  hsk?: Hsk3Level;
  hskSortKey: number;
  /**
   * The lowest HSK level at which this character first appears — either as a
   * standalone word or as part of another word. For single-character entries
   * this may be lower than `hsk`. For multi-character entries this equals
   * `hsk`.
   */
  hskFirstAppearance?: Hsk3Level;
  note?: string;
  hanziCharacterCount: number;
  isStructural?: boolean;
}

export type BuiltInDictionarySearchCollection = Collection<
  DictionarySearchEntry,
  string
>;

export type DictionarySearchCollection = Collection<
  DictionarySearchEntry,
  string
>;

export type CharacterDecompositionsCollection = Collection<
  CharacterDecompositionRow,
  string /* <HanziCharacter>:<HanziIdsString> */
>;

export type CharacterMnemonicDecompositionCollection = Collection<
  CharacterDecompositionRow,
  HanziCharacter
>;

export type CharacterComponentUsageCollection = Collection<
  CharacterComponentUsageRow,
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
                !isEqual(existing, next)
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
      const [dictionary, charactersJson] = await Promise.all([
        loadDictionary(),
        loadCharactersJson(),
      ]);
      const entries: DictionarySearchEntry[] = [];
      const structuralHanzi = new Set<HanziText>();

      for (const [hanzi, data] of charactersJson) {
        if (data.isStructural != null) {
          structuralHanzi.add(hanzi);
        }
      }

      // Build a map of each character to the minimum HSK level it appears in
      // across all words (including multi-character words it's part of).
      const charMinHskMap = new Map<string, Hsk3Level>();
      for (const [hanziWord, meaning] of dictionary.allEntries) {
        if (meaning.hsk == null) {
          continue;
        }
        const hanzi = hanziFromHanziWord(hanziWord);
        for (const char of matchAllHanziCharacters(hanzi)) {
          const existing = charMinHskMap.get(char);
          if (
            existing == null ||
            hsk3LevelToNumber(meaning.hsk) < hsk3LevelToNumber(existing)
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
          hanziCharacterCount === 1 ? charMinHskMap.get(hanzi) : meaning.hsk;

        entries.push({
          id: `builtIn:${hanziWord}`,
          sourceKind: `builtIn`,
          hanzi,
          meaningKey,
          hanziWord,
          freq: meaning.freq,
          gloss,
          glossCount: gloss.length,
          pos: meaning.pos,
          pinyin,
          hsk: meaning.hsk,
          hskSortKey: dictionarySearchHskSortKey(meaning.hsk),
          hskFirstAppearance,
          hanziCharacterCount,
          isStructural: hanziCharacterCount === 1 && structuralHanzi.has(hanzi),
        });
      }

      return entries;
    },
    getKey: (item) => item.id,
  });
}

function builtInCharacterDecompositionCollectionOptions(): CollectionConfig<
  CharacterDecompositionRow,
  string
> {
  return staticCollectionOptions<CharacterDecompositionRow, string>({
    id: `builtInCharacterDecomposition`,
    queryFn: async () => {
      const entries = await loadBuiltinCharacterDecompositionEntries();
      return [...entries];
    },
    getKey: (item) => `${item.hanzi}:${item.ids}`,
  });
}

function characterMnemonicIdsCollectionOptions(): CollectionConfig<
  CharacterMnemonicIdsRow,
  string
> {
  return staticCollectionOptions<CharacterMnemonicIdsRow, string>({
    id: `characterMnemonicIds`,
    queryFn: async () => {
      const charactersJson = await loadCharactersJson();

      const entries: CharacterMnemonicIdsRow[] = [];

      for (const [hanzi, data] of charactersJson.entries()) {
        if (data.mnemonic != null) {
          entries.push({ hanzi, ids: data.mnemonic });
          continue;
        }

        if (data.decompositions != null) {
          const decompositionIdsValues = Object.keys(data.decompositions);
          if (decompositionIdsValues.length === 1) {
            entries.push({
              hanzi,
              ids: nonNullable(decompositionIdsValues[0]) as HanziIds,
            });
            continue;
          }
        }
      }

      return entries;
    },
    getKey: (item) => `${item.hanzi}:${item.ids}`,
  });
}

function dictionarySearchHskSortKey(hsk?: Hsk3Level): number {
  return hsk == null ? 9999 : hsk3LevelToNumber(hsk);
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

export function makeDb(rizzle: Rizzle) {
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

  const userDictionary: UserDictionaryCollection = createCollection(
    userDictionaryCollectionOptions({ settingCollection }),
  );

  const builtinCharacterDecompositions: CharacterDecompositionsCollection =
    createCollection(builtInCharacterDecompositionCollectionOptions());

  const characterDecompositionsCollection = createLiveQueryCollection((q) => {
    const builtinRows = q.from({ entry: builtinCharacterDecompositions });
    return q.unionAll(builtinRows);
  });

  const characterMnemonicIdsCollection = createCollection(
    characterMnemonicIdsCollectionOptions(),
  );
  characterMnemonicIdsCollection.createIndex((row) => row.hanzi);

  const builtInDictionarySearch: BuiltInDictionarySearchCollection =
    createCollection(builtInDictionarySearchCollectionOptions());

  const dictionarySearch = createLiveQueryCollection((q) => {
    const builtinRows = q
      .from({ builtin: builtInDictionarySearch })
      .select(({ builtin: row }) => ({
        id: concat(`builtin:`, row.hanziWord),
        sourceKind: `builtIn` as const,
        hanzi: row.hanzi,
        meaningKey: row.meaningKey,
        hanziWord: row.hanziWord,
        freq: row.freq,
        gloss: row.gloss,
        glossCount: row.glossCount,
        pos: row.pos,
        pinyin: row.pinyin,
        hsk: row.hsk,
        hskSortKey: row.hskSortKey,
        hskFirstAppearance: row.hskFirstAppearance,
        hanziCharacterCount: row.hanziCharacterCount,
        note: undefined as string | undefined,
        isStructural: row.isStructural,
      }));

    const userRows = q
      .from({ user: userDictionary })
      .fn.select(({ user: row }) => {
        const hanziWord = buildHanziWord(row.hanzi, row.meaningKey);
        const pinyin =
          row.pinyin == null || row.pinyin.length === 0
            ? undefined
            : [row.pinyin];
        return {
          id: `user:${hanziWord}`,
          sourceKind: `user` as const,
          hanzi: row.hanzi,
          meaningKey: row.meaningKey,
          hanziWord,
          freq: undefined,
          gloss: [row.gloss],
          glossCount: 1,
          pos: undefined,
          pinyin,
          hsk: undefined,
          hskSortKey: dictionarySearchHskSortKey(),
          hskFirstAppearance: undefined,
          note: row.note,
          hanziCharacterCount: matchAllHanziCharacters(row.hanzi).length,
          isStructural: undefined,
        };
      });
    return q.unionAll(builtinRows, userRows);
  });

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
              characterDecompositionsCollection.toArray,
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

              if (!isEqual(existing.usedInHanzi, next.usedInHanzi)) {
                write({ type: `update`, value: next });
              }
            }

            commit();
            markReadyOnce();
          };

          let subscription:
            | ReturnType<
                typeof characterDecompositionsCollection.subscribeChanges
              >
            | undefined;
          let isDisposed = false;

          void characterDecompositionsCollection
            .preload()
            .then(async () => {
              if (isDisposed) {
                return;
              }

              await applyRows();

              subscription = characterDecompositionsCollection.subscribeChanges(
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
    builtinCharacterDecompositions,
    builtInDictionarySearch,
    characterComponentUsage,
    characterDecompositionsCollection,
    characterMnemonicIdsCollection,
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

export type Db = ReturnType<typeof makeDb>;
