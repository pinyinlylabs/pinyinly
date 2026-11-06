import type {
  CharacterCollectionRow,
  CharacterComponentUsageRow,
  CharacterDecompositionRow,
  CharacterMnemonicIdsRow,
  Dictionary,
  HanziCharacter,
  HanziIds,
  HanziText,
  HanziWord,
  Hsk30Level,
  PartOfSpeech,
  PinyinText,
  Skill,
} from "@/data/model";
import { matchAllHanziCharacters } from "@/data/hanzi";
import { currentSchema } from "@/data/rizzleSchema";
import type { Rizzle } from "@/data/rizzleSchema";
import type { Rating } from "@/util/fsrs";
import type {
  RizzleAnyEntity,
  RizzleEntityMarshaled,
  RizzleEntityOutput,
} from "@/util/rizzle";
import { arrayFilterUnique, memoize0 } from "@pinyinly/lib/collections";
import { nonNullable } from "@pinyinly/lib/invariant";
import type { Collection, CollectionConfig } from "@tanstack/react-db";
import {
  and,
  BTreeIndex,
  createCollection,
  createLiveQueryCollection,
  eq,
  gte,
  isNull,
  isUndefined,
  like,
  or,
} from "@tanstack/react-db";
import type { NonSingleResult } from "@tanstack/db";
import { concat } from "@tanstack/db";
import { subDays } from "date-fns/subDays";
import { hsk30LevelToNumber } from "@/data/hsk";
import { hanziWordToTargetSkills } from "@/data/skills";
import {
  studyWordItemSetting,
  userHanziMeaningDefs,
} from "@/data/userSettings";
import {
  buildHanziWord,
  buildCharacterComponentUsageEntries,
  hanziFromHanziWord,
  loadCharactersJson,
  loadBuiltinCharacterDecompositionEntries,
  loadDictionary,
  meaningKeyFromHanziWord,
} from "@/dictionary";
import isEqual from "lodash/isEqual";
import { Platform } from "react-native";

type CharacterMnemonicIdsCollection = Collection<
  CharacterMnemonicIdsRow,
  string
>;

type ExpressionLike = Parameters<typeof isUndefined>[0];
const isNullish = (value: ExpressionLike) =>
  or(isUndefined(value), isNull(value));

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
export type TargetSkillsCollection = Collection<
  { skill: Skill; order: number },
  Skill
>;

export type SettingCollection = Collection<
  RizzleEntityOutput<typeof currentSchema.setting>,
  string
>;

export type BookmarkedWordItem = RizzleEntityOutput<
  typeof studyWordItemSetting.entity
>;

export type BookmarkedWordsCollection = ReturnType<
  typeof createBookmarkedWordsCollection
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

export type DictionaryCollectionSourceKind = `builtIn` | `user`;

export interface DictionaryCollectionEntry {
  id: string;
  sourceKind: DictionaryCollectionSourceKind;
  hanzi: HanziText;
  meaningKey: string;
  hanziWord: HanziWord;
  freq?: number;
  gloss: string[];
  glossCount: number;
  order?: number;
  pos?: PartOfSpeech;
  pinyin?: PinyinText[];
  hsk?: Hsk30Level;
  hskSortKey: number;
  hskFirstAppearance?: Hsk30Level;
  note?: string;
  hanziCharacterCount: number;
}

export type BuiltInDictionaryCollection = Collection<
  DictionaryCollectionEntry,
  string
>;

export type DictionaryCollection = Collection<
  DictionaryCollectionEntry,
  string
>;

export type CharacterDecompositionsCollection = Collection<
  CharacterDecompositionRow,
  string
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

export function historyPageCollection(
  skillRatingsCollection: SkillRatingCollection,
  hanziGlossMistakesCollection: HanziGlossMistakeCollection,
  hanziPinyinMistakesCollection: HanziPinyinMistakeCollection,
) {
  const startDate = subDays(new Date(), 7);
  const collection = createLiveQueryCollection((q) =>
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
          isNullish(skillRating.trashedAt),
        ),
      ),
  );
  collection.id = `historyPage`;
  return collection;
}

export type HistoryPageCollection = ReturnType<typeof historyPageCollection>;

export function skillReviewQueueHistoryCollection(
  skillRatingsCollection: SkillRatingCollection,
  hanziPinyinMistakesCollection: HanziPinyinMistakeCollection,
) {
  const startDate = subDays(new Date(), 7);
  const collection = createLiveQueryCollection((q) =>
    q
      .from({ skillRating: skillRatingsCollection })
      .leftJoin(
        { hanziPinyinMistake: hanziPinyinMistakesCollection },
        ({ skillRating, hanziPinyinMistake }) =>
          eq(skillRating.reviewId, hanziPinyinMistake.reviewId),
      )
      .where(({ skillRating }) =>
        and(
          gte(skillRating.createdAt, startDate),
          isNullish(skillRating.trashedAt),
        ),
      )
      .select(({ skillRating, hanziPinyinMistake }) => ({
        id: skillRating.id,
        skill: skillRating.skill,
        rating: skillRating.rating,
        createdAt: skillRating.createdAt,
        pinyinMistake: hanziPinyinMistake.pinyin,
      })),
  );
  collection.id = `skillReviewQueueHistory`;
  return collection;
}

export type SkillReviewQueueHistoryCollection = ReturnType<
  typeof skillReviewQueueHistoryCollection
>;
export type SkillReviewQueueHistoryEvent =
  CollectionOutput<SkillReviewQueueHistoryCollection>;

export function historyPageData(
  historyCollection: CollectionOutput<HistoryPageCollection>[],
) {
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
      lastGroup.ratings.push({
        rating: item.skillRating.rating,
        createdAt: item.skillRating.createdAt,
        answer:
          item.hanziGlossMistake?.gloss ?? item.hanziPinyinMistake?.pinyin,
      });
    } else {
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

function decodeBookmarkedWord(
  setting: CollectionOutput<SettingCollection>,
): BookmarkedWordItem | null {
  try {
    const keyParams = studyWordItemSetting.entity.unmarshalKey(setting.key);
    if (!keyParams.hanziWord.includes(`:`)) {
      return null;
    }
    const item = studyWordItemSetting.decode(keyParams, setting.value);
    return item?.hanziWord.length === 0 ? null : item;
  } catch {
    return null;
  }
}

export function createBookmarkedWordsCollection(
  settingCollection: SettingCollection,
) {
  return createLiveQueryCollection((q) => {
    const decodedWords = q
      .from({ setting: settingCollection })
      .where(({ setting }) =>
        like(setting.key, `${studyWordItemSetting.entity.keyPrefix}%`),
      )
      .fn.select(({ setting }) => ({ item: decodeBookmarkedWord(setting) }));

    return q
      .from({ decoded: decodedWords })
      .fn.where(({ decoded }) => decoded.item != null)
      .fn.select(({ decoded }) => nonNullable(decoded.item));
  });
}

export function createBookmarkedHanziWordsCollection<
  Entry extends { hanzi: HanziText; hanziWord: HanziWord },
  Key extends string | number,
>(
  bookmarkedWords: BookmarkedWordsCollection,
  dictionaryCollection: Collection<Entry, Key>,
) {
  return createLiveQueryCollection((q) =>
    q
      .from({ bookmarkedWord: bookmarkedWords })
      .innerJoin({ entry: dictionaryCollection }, ({ bookmarkedWord, entry }) =>
        eq(bookmarkedWord.hanziWord, entry.hanziWord),
      )
      .select(({ entry, bookmarkedWord }) => ({
        hanziWord: entry.hanziWord,
        createdAt: bookmarkedWord.createdAt,
      }))
      .distinct(),
  );
}

export interface PasskeyCollectionRow {
  id: string;
  name: string | null;
  createdAt: Date | null;
  lastUsedAt: Date | null;
}

export interface PasskeyCollectionUtils {
  retry: () => Promise<void>;
}

type PasskeyCollection = Collection<
  PasskeyCollectionRow,
  string,
  PasskeyCollectionUtils
> &
  NonSingleResult;

interface MakeDbOptions {
  listPasskeys: () => Promise<
    Array<{
      id: string;
      name: string | null;
      createdAt: string | null;
      lastUsedAt: string | null;
    }>
  >;
}

export function makeDb(rizzle: Rizzle, { listPasskeys }: MakeDbOptions) {
  let retryPasskeyLoad: (() => Promise<void>) | undefined;
  const passkeyCollection: PasskeyCollection = createCollection({
    id: `passkeys`,
    getKey: (passkey) => passkey.id,
    utils: {
      retry: async () => {
        await retryPasskeyLoad?.();
      },
    },
    sync: {
      sync: (params) => {
        let isActive = true;
        let inFlight: Promise<void> | undefined;

        const load = async () => {
          if (inFlight != null) {
            return inFlight;
          }
          inFlight = (async () => {
            try {
              const rows = await listPasskeys();
              if (!isActive) {
                return;
              }
              params.begin();
              params.truncate();
              for (const row of rows) {
                params.write({
                  type: `insert`,
                  value: {
                    ...row,
                    createdAt:
                      row.createdAt == null ? null : new Date(row.createdAt),
                    lastUsedAt:
                      row.lastUsedAt == null ? null : new Date(row.lastUsedAt),
                  },
                });
              }
              await params.commit();
              params.markReady();
            } catch (error) {
              if (isActive) {
                params.markError(error);
              }
            }
          })().finally(() => {
            inFlight = undefined;
          });
          return inFlight;
        };

        retryPasskeyLoad = load;
        void load();
        return () => {
          isActive = false;
          if (retryPasskeyLoad === load) {
            retryPasskeyLoad = undefined;
          }
        };
      },
    },
  });

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
        return targetSkills.map((skill, order) => ({ skill, order }));
      },
      getKey: (item) => item.skill,
    }),
  );

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
    // Leaving code structured to give affordance for user-defined
    // decompositions in the future, but for now we only have built-in
    // decompositions.
    return q.unionAll(builtinRows);
  });
  characterDecompositionsCollection.createIndex((row) => row.ids, {
    indexType: BTreeIndex,
  });
  characterDecompositionsCollection.createIndex((row) => row.hanzi, {
    indexType: BTreeIndex,
  });

  const characterCollection = createCollection(characterCollectionOptions());
  characterCollection.createIndex((row) => row.hanzi);

  const characterMnemonicIdsCollection: CharacterMnemonicIdsCollection =
    createCollection(characterMnemonicIdsCollectionOptions());
  characterMnemonicIdsCollection.createIndex((row) => row.hanzi);

  const builtInDictionaryCollection: BuiltInDictionaryCollection =
    createCollection(builtInDictionaryCollectionOptions());

  const dictionaryCollection = createLiveQueryCollection((q) => {
    const builtinRows = q
      .from({ builtin: builtInDictionaryCollection })
      .select(({ builtin: row }) => ({
        id: concat(`builtin:`, row.hanziWord),
        sourceKind: `builtIn` as const,
        hanzi: row.hanzi,
        meaningKey: row.meaningKey,
        hanziWord: row.hanziWord,
        freq: row.freq,
        gloss: row.gloss,
        glossCount: row.glossCount,
        order: row.order,
        pos: row.pos,
        pinyin: row.pinyin,
        hsk: row.hsk,
        hskSortKey: row.hskSortKey,
        hskFirstAppearance: row.hskFirstAppearance,
        hanziCharacterCount: row.hanziCharacterCount,
        note: undefined as string | undefined,
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
          order: undefined,
          pos: undefined,
          pinyin,
          hsk: undefined,
          hskSortKey: dictionaryCollectionHskSortKey(),
          hskFirstAppearance: undefined,
          note: row.note,
          hanziCharacterCount: matchAllHanziCharacters(row.hanzi).length,
          isStructural: undefined,
        };
      });
    return q.unionAll(builtinRows, userRows);
  });
  dictionaryCollection.createIndex((row) => row.glossCount, {
    indexType: BTreeIndex,
  });
  dictionaryCollection.createIndex((row) => row.hanziCharacterCount, {
    indexType: BTreeIndex,
  });
  dictionaryCollection.createIndex((row) => row.hanziWord, {
    indexType: BTreeIndex,
  });
  dictionaryCollection.createIndex((row) => row.hanzi, {
    indexType: BTreeIndex,
  });
  dictionaryCollection.createIndex((row) => row.hskSortKey, {
    indexType: BTreeIndex,
  });

  const bookmarkedWordsCollection =
    createBookmarkedWordsCollection(settingCollection);
  bookmarkedWordsCollection.createIndex((row) => row.hanziWord, {
    indexType: BTreeIndex,
  });
  const bookmarkedHanziWordsCollection = createBookmarkedHanziWordsCollection(
    bookmarkedWordsCollection,
    dictionaryCollection,
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

            await commit();
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

  const db = {
    builtinCharacterDecompositions,
    builtInDictionaryCollection,
    characterComponentUsage,
    characterDecompositionsCollection,
    characterMnemonicIdsCollection,
    characterCollection,
    dictionaryCollection,
    bookmarkedWordsCollection,
    bookmarkedHanziWordsCollection,
    settingCollection,
    settingHistoryCollection,
    userDictionary,
    hanziGlossMistakeCollection,
    hanziPinyinMistakeCollection,
    passkeyCollection,
    skillRatingCollection,
    skillStateCollection,
    targetSkillsCollection,
  };

  addDbIds(db);

  return db;
}

function addDbIds(db: Record<string, { id?: string }>) {
  for (const key in db) {
    const collection = db[key];
    if (
      collection &&
      (collection.id == null || collection.id.startsWith(`live-query-`))
    ) {
      collection.id = key;
    }
  }
}

export type Db = ReturnType<typeof makeDb>;

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

export function userDictionaryCollectionOptions({
  settingCollection,
}: {
  settingCollection: SettingCollection;
}): CollectionConfig<UserDictionaryEntry, string> {
  const userMeaningSettings = createLiveQueryCollection((q) =>
    q
      .from({ setting: settingCollection })
      .where(({ setting }) => like(setting.key, `uhm/%`)),
  );
  userMeaningSettings.id = `userMeaningSettings`;

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

            void commit();
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

export async function getAllTargetSkills(): Promise<Skill[]> {
  const dictionary = await loadDictionary();
  const hanziWords = getTargetHanziWordsFromDictionary(dictionary);
  return hanziWords
    .flatMap((hanziWord) =>
      hanziWordToTargetSkills(hanziWord, dictionary, Platform.OS === `web`),
    )
    .filter(arrayFilterUnique());
}

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

export function builtInDictionaryCollectionOptions(): CollectionConfig<
  DictionaryCollectionEntry,
  string
> {
  return staticCollectionOptions<DictionaryCollectionEntry, string>({
    id: `builtInDictionary`,
    queryFn: async () => {
      const dictionary = await loadDictionary();
      const entries: DictionaryCollectionEntry[] = [];
      const charMinHskMap = new Map<string, Hsk30Level>();
      for (const [hanziWord, meaning] of dictionary.allEntries) {
        if (meaning.hsk == null) {
          continue;
        }
        const hanzi = hanziFromHanziWord(hanziWord);
        for (const char of matchAllHanziCharacters(hanzi)) {
          const existing = charMinHskMap.get(char);
          if (
            existing == null ||
            hsk30LevelToNumber(meaning.hsk) < hsk30LevelToNumber(existing)
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
          order: meaning.order,
          pos: meaning.pos,
          pinyin,
          hsk: meaning.hsk,
          hskSortKey: dictionaryCollectionHskSortKey(meaning.hsk),
          hskFirstAppearance,
          hanziCharacterCount,
        });
      }
      return entries;
    },
    getKey: (item) => item.id,
  });
}

export function builtInCharacterDecompositionCollectionOptions(): CollectionConfig<
  CharacterDecompositionRow,
  string
> {
  return staticCollectionOptions<CharacterDecompositionRow, string>({
    id: `builtInCharacterDecomposition`,
    queryFn: async () => [
      ...(await loadBuiltinCharacterDecompositionEntries()),
    ],
    getKey: (item) => `${item.hanzi}:${item.ids}`,
  });
}

export function characterMnemonicIdsCollectionOptions(): CollectionConfig<
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
          }
        }
      }
      return entries;
    },
    getKey: (item) => `${item.hanzi}:${item.ids}`,
  });
}

export function characterCollectionOptions(): CollectionConfig<
  CharacterCollectionRow,
  string
> {
  return staticCollectionOptions<CharacterCollectionRow, string>({
    id: `characterCollection`,
    queryFn: async () => {
      const charactersJson = await loadCharactersJson();
      const entries: CharacterCollectionRow[] = [];
      for (const [hanzi, data] of charactersJson.entries()) {
        entries.push({
          hanzi,
          isStructural: data.isStructural ?? false,
          isComponent:
            data.isStructural === true || data.componentFormOf != null,
          strokes: data.strokes,
          componentFormOf: data.componentFormOf ?? null,
        });
      }
      return entries;
    },
    getKey: (item) => `${item.hanzi}`,
  });
}

export function dictionaryCollectionHskSortKey(hsk?: Hsk30Level): number {
  return hsk == null ? 9999 : hsk30LevelToNumber(hsk);
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
            void commit();
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
        .then(async (items) => {
          if (signal.aborted) {
            return;
          }
          begin();
          for (const item of items) {
            write({ type: `insert`, value: item });
          }
          await commit();
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
