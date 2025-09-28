import { loadBillOfMaterials } from "@/data/bom";
import type {
  HanziText,
  HanziWord,
  PinyinSoundId,
  SrsStateType,
} from "@/data/model";
import { hanziWordSkillKinds } from "@/data/model";
import { loadPylyPinyinChart } from "@/data/pinyin";
import type {
  Rizzle,
  Skill,
  SkillRating,
  SkillState,
} from "@/data/rizzleSchema";
import { currentSchema } from "@/data/rizzleSchema";
import type { RankedHanziWord } from "@/data/skills";
import {
  getHanziWordRank,
  hanziWordSkill,
  hanziWordToGloss,
  hanziWordToPinyinTyped,
  rankRules,
  skillLearningGraph,
} from "@/data/skills";
import {
  allHsk1HanziWords,
  allHsk2HanziWords,
  getIsStructuralHanziWord,
  hanziFromHanziWord,
  loadPinyinSoundNameSuggestions,
  lookupHanzi,
  lookupHanziWikiEntry,
  lookupHanziWord,
} from "@/dictionary/dictionary";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import type { RizzleAnyEntity, RizzleEntityOutput } from "@/util/rizzle";
import {
  arrayFilterUniqueWithKey,
  memoize0,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import type { Collection, CollectionConfig } from "@tanstack/react-db";
import { queryOptions, skipToken } from "@tanstack/react-query";
import type { DeviceStoreEntity } from "./deviceStore";
import { buildDeviceStoreKey, deviceStoreGet } from "./deviceStore";

export type WithRizzleWatchPrefixes<T> = T & {
  rizzleWatchPrefixes?: string[];
};

export const pinyinSoundsQuery = (r: Rizzle) =>
  withWatchPrefixes(
    queryOptions({
      queryKey: [`pinyinSounds`],
      queryFn: async () => {
        await devToolsSlowQuerySleepIfEnabled();

        const chart = loadPylyPinyinChart();

        const sounds = new Map<
          PinyinSoundId,
          { name: string | null; label: string }
        >();

        await r.replicache.query(async (tx) => {
          for (const group of chart.soundGroups) {
            for (const soundId of group.sounds) {
              const userOverride = await r.query.pinyinSound.get(tx, {
                soundId,
              });
              sounds.set(soundId, {
                name: userOverride?.name ?? null,
                label: chart.soundToCustomLabel[soundId] ?? soundId,
              });
            }
          }
        });

        return sounds;
      },
      networkMode: `offlineFirst`,
      structuralSharing: false,
    }),
    [currentSchema.pinyinSound.keyPrefix],
  );

export const targetSkillsQuery = () =>
  queryOptions({
    queryKey: [`targetSkills`],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();

      const targetSkills = await getAllTargetSkills();
      return targetSkills;
    },
    networkMode: `offlineFirst`,
    structuralSharing: false,
  });

export const isStructuralHanziWordQuery = queryOptions({
  queryKey: [`isStructuralHanziWord`],
  queryFn: async () => {
    await devToolsSlowQuerySleepIfEnabled();

    return await getIsStructuralHanziWord();
  },
  networkMode: `offlineFirst`,
  structuralSharing: false,
});

export const skillLearningGraphQuery = queryOptions({
  queryKey: [`skillLearningGraph`],
  queryFn: async ({ client }) => {
    await devToolsSlowQuerySleepIfEnabled();

    const targetSkills = await client.ensureQueryData(targetSkillsQuery());
    const graph = await skillLearningGraph({ targetSkills });
    return graph;
  },
  networkMode: `offlineFirst`,
  structuralSharing: false,
});

export const hanziWordSkillStatesQuery = (r: Rizzle, hanziWord: HanziWord) =>
  withWatchPrefixes(
    queryOptions({
      queryKey: [`hanziWordSkillStates`, hanziWord],
      queryFn: async () => {
        await devToolsSlowQuerySleepIfEnabled();

        const skills = hanziWordSkillKinds.map((skillType) =>
          hanziWordSkill(skillType, hanziWord),
        );

        const skillStates = await r.replicache.query(async (tx) => {
          const skillStates: [Skill, SkillState | null | undefined][] = [];
          for (const skill of skills) {
            const skillState = await r.query.skillState.get(tx, { skill });
            skillStates.push([skill, skillState]);
          }
          return skillStates;
        });

        return skillStates;
      },
      networkMode: `offlineFirst`,
      structuralSharing: false,
    }),
    [
      // TODO: narrow to the specific hanzi e.g. `he:好:`, but it would have to
      // be one for each skill type, so maybe it's not worth it.
      currentSchema.skillState.keyPrefix,
    ],
  );

export const hanziWordSkillRatingsQuery = (r: Rizzle, hanziWord: HanziWord) =>
  withWatchPrefixes(
    queryOptions({
      queryKey: [`hanziWordSkillRatings`, hanziWord],
      queryFn: async () => {
        await devToolsSlowQuerySleepIfEnabled();

        const skills = hanziWordSkillKinds.map((skillType) =>
          hanziWordSkill(skillType, hanziWord),
        );

        const skillToRatings = new Map<
          Skill,
          [/* skillRating key */ string, SkillRating][]
        >();
        for (const skill of skills) {
          const ratings = await r.queryPaged.skillRating
            .bySkill(skill)
            .toArray();
          skillToRatings.set(skill, ratings);
        }

        return skillToRatings;
      },
      networkMode: `offlineFirst`,
      structuralSharing: false,
    }),
    [currentSchema.skillRating.keyPrefix],
  );

export const recentSkillRatingsQuery = (r: Rizzle) =>
  queryOptions({
    queryKey: [`recentSkillRatings`],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();
      const res = await r.queryPaged.skillRating.byCreatedAt().toArray();
      const recent = res.slice(-100);
      recent.reverse();
      return recent;
    },
    networkMode: `offlineFirst`,
    structuralSharing: false,
  });

export const hanziWordsByRankQuery = (r: Rizzle) =>
  withWatchPrefixes(
    queryOptions({
      queryKey: [`hanziWordsByRank`],
      queryFn: async () => {
        await devToolsSlowQuerySleepIfEnabled();

        const skillSrsStates = new Map<Skill, SrsStateType>();
        for await (const [, v] of r.queryPaged.skillState.scan()) {
          skillSrsStates.set(v.skill, v.srs);
        }

        const hanziWords = await getAllTargetHanziWords();
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
      },
      networkMode: `offlineFirst`,
      structuralSharing: false,
    }),
    [currentSchema.skillState.keyPrefix],
  );

export async function getAllTargetHanziWords(): Promise<HanziWord[]> {
  const [hsk1HanziWords, hsk2HanziWords] = await Promise.all([
    allHsk1HanziWords(),
    allHsk2HanziWords(),
  ]);

  return [...hsk1HanziWords, ...hsk2HanziWords].filter(
    arrayFilterUniqueWithKey((x) => x),
  );
}

export async function getAllTargetSkills(): Promise<Skill[]> {
  const hanziWords = await getAllTargetHanziWords();
  return hanziWords.flatMap((w) => [
    hanziWordToGloss(w),
    hanziWordToPinyinTyped(w),
  ]);
}

export const hanziMeaningsQuery = (hanzi: HanziText) =>
  queryOptions({
    queryKey: [`hanziMeanings`, hanzi],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();
      return await lookupHanzi(hanzi);
    },
    networkMode: `offlineFirst`,
    structuralSharing: false,
    staleTime: Infinity,
  });

export const soundNameSuggestionsQuery = () =>
  queryOptions({
    queryKey: [`soundNameSuggestions`],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();
      return await loadPinyinSoundNameSuggestions();
    },
    networkMode: `offlineFirst`,
    structuralSharing: false,
  });

export const hanziWikiEntryQuery = (hanzi: HanziText) =>
  queryOptions({
    queryKey: [`hanziWikiEntry`, hanzi],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();
      return await lookupHanziWikiEntry(hanzi);
    },
    networkMode: `offlineFirst`,
    structuralSharing: false,
    staleTime: Infinity,
  });

export const hanziWordMeaningQuery = (hanziWord: HanziWord) =>
  queryOptions({
    queryKey: [`hanziWordMeaning`, hanziWord],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();
      return await lookupHanziWord(hanziWord);
    },
    networkMode: `offlineFirst`,
    structuralSharing: false,
    staleTime: Infinity,
  });

export const hanziWordOtherMeaningsQuery = (hanziWord: HanziWord) =>
  queryOptions({
    queryKey: [`hanziWordOtherMeanings`, hanziWord],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();
      const res = await lookupHanzi(hanziFromHanziWord(hanziWord));
      return res.filter(([otherHanziWord]) => otherHanziWord !== hanziWord);
    },
  });

export const fetchArrayBufferQuery = (uri: string | null) =>
  queryOptions({
    queryKey: [`fetchArrayBuffer`, uri],
    queryFn:
      uri == null
        ? skipToken
        : async ({ signal }) => {
            await devToolsSlowQuerySleepIfEnabled();
            return await fetch(uri, { signal }).then((res) =>
              res.arrayBuffer(),
            );
          },
    staleTime: Infinity,
  });

export const billOfMaterialsQuery = () =>
  queryOptions({
    queryKey: [`billOfMaterials`],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();
      return await loadBillOfMaterials().then((x) => [...x.entries()]);
    },
    networkMode: `offlineFirst`,
    structuralSharing: false,
  });

export const fetchAudioBufferQuery = (
  uri: string | null,
  audioContext: AudioContext | null,
) =>
  queryOptions({
    queryKey: [`fetchAudioBuffer`, uri] as const,
    queryFn:
      uri == null || audioContext == null
        ? (skipToken as never)
        : async (): Promise<AudioBuffer> => {
            await devToolsSlowQuerySleepIfEnabled();
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();
            return await audioContext.decodeAudioData(arrayBuffer);
          },
    staleTime: Infinity,
    structuralSharing: false,
  });

export const deviceStoreQuery = (key: DeviceStoreEntity) =>
  queryOptions({
    queryKey: [`deviceStore`, buildDeviceStoreKey(key)],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();
      return await deviceStoreGet(key);
    },
    networkMode: `offlineFirst`,
    structuralSharing: false,
  });

function withWatchPrefixes<T extends object>(
  query: T,
  rizzleWatchPrefixes: string[],
): WithRizzleWatchPrefixes<T> {
  return Object.assign(query, {
    rizzleWatchPrefixes,
  });
}

export type SkillStateCollection = Collection<
  RizzleEntityOutput<typeof currentSchema.skillState>,
  Skill
>;
export type SkillRatingCollection = Collection<
  RizzleEntityOutput<typeof currentSchema.skillRating>,
  string
>;
export type TargetSkillsCollection = Collection<{ skill: Skill }, Skill>;
export type LatestSkillRatingsCollection = Collection<SkillRating, Skill>;

export type CollectionOutput<T> =
  T extends Collection<
    infer U,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >
    ? U
    : never;
export type CollectionKey<T> =
  T extends Collection<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    infer K
  >
    ? K
    : never;

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
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
                    op.newValue as any,
                  );
                  write({ type: `insert`, value });
                  break;
                }
                case `change`: {
                  const value = entity.unmarshalValue(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
                    op.newValue as any,
                  );
                  write({ type: `update`, value });
                  break;
                }
                case `del`: {
                  const value = entity.unmarshalValue(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
                    op.oldValue as any,
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
        .finally(() => {
          markReady();
        })
        .catch((error: unknown) => {
          console.error(`staticCollection(id=${collection.id}) error:`, error);
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
              case `add`: {
                const value = entity.unmarshalValue(
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
                  op.newValue as any,
                );

                const existing =
                  collection.get(value.skill) ??
                  pendingTxLatest.get(value.skill);

                if (existing == null) {
                  write({ type: `insert`, value });
                  pendingTxLatest.set(value.skill, value);
                } else if (existing.createdAt < value.createdAt) {
                  write({ type: `update`, value });
                  pendingTxLatest.set(value.skill, value);
                }
                break;
              }
              case `change`:
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
