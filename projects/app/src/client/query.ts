import { loadBillOfMaterials } from "@/data/bom";
import type {
  HanziText,
  HanziWord,
  PinyinSoundId,
  Question,
  SrsStateType,
} from "@/data/model";
import { hanziWordSkillKinds } from "@/data/model";
import { loadPylyPinyinChart } from "@/data/pinyin";
import {
  flagForQuestion,
  generateQuestionForSkillOrThrow,
} from "@/data/questions";
import type {
  Rizzle,
  Skill,
  SkillRating,
  SkillState,
} from "@/data/rizzleSchema";
import { currentSchema } from "@/data/rizzleSchema";
import type { RankedHanziWord, SkillReviewQueue } from "@/data/skills";
import {
  getHanziWordRank,
  hanziWordSkill,
  hanziWordToGloss,
  hanziWordToPinyinTyped,
  rankRules,
  skillKindFromSkill,
  skillLearningGraph,
  skillReviewQueue,
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
import {
  arrayFilterUniqueWithKey,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import { queryOptions, skipToken } from "@tanstack/react-query";
import type { DeviceStoreEntity } from "./deviceStore";
import { buildDeviceStoreKey, deviceStoreGet } from "./deviceStore";

export type WithRizzleWatchPrefixes<T> = T & {
  rizzleWatchPrefixes?: string[];
};

export const nextQuizQuestionQuery = (r: Rizzle, quizId: string) =>
  queryOptions({
    queryKey: [`nextQuizQuestion`, quizId],
    meta: { r },
    queryFn: async ({
      meta,
    }): Promise<{
      question: Question;
      reviewQueue: SkillReviewQueue;
    }> => {
      const r = (meta as { r: Rizzle }).r;
      const reviewQueue = await targetSkillsReviewQueue(r);

      // Take the next skill in queue and generate a question for it. Even
      // though this is a for…loop, it usually only loops once then exits.
      for (const [i, skill] of reviewQueue.items.entries()) {
        try {
          const skillState = await r.replicache.query((tx) =>
            r.query.skillState.get(tx, { skill }),
          );

          const question = await generateQuestionForSkillOrThrow(skill);
          question.flag ??= flagForQuestion({
            skillKind: skillKindFromSkill(skill),
            isInRetryQueue:
              reviewQueue.retryCount > 0 && i < reviewQueue.retryCount,
            srsState: skillState?.srs,
          });
          return { question, reviewQueue };
        } catch (error) {
          console.error(
            `Error while generating a question for a skill ${JSON.stringify(skill)}`,
            error,
          );
          continue;
        }
      }

      throw new Error(`No question found for review`);
    },
    networkMode: `offlineFirst`,
    structuralSharing: false,
  });

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

export async function targetSkillsReviewQueue(
  r: Rizzle,
): Promise<SkillReviewQueue> {
  const targetSkills = await getAllTargetSkills();
  return await computeSkillReviewQueue(r, targetSkills);
}

export async function computeSkillReviewQueue(
  r: Rizzle,
  targetSkills: Skill[],
  /**
   * exposed for testing/simulating different times
   */
  now = new Date(),
): Promise<SkillReviewQueue> {
  const graph = await skillLearningGraph({ targetSkills });

  const skillSrsStates = new Map<Skill, SrsStateType>();
  for await (const [, v] of r.queryPaged.skillState.scan()) {
    skillSrsStates.set(v.skill, v.srs);
  }

  const latestSkillRatings = new Map<Skill, SkillRating>();
  for await (const [, v] of r.queryPaged.skillRating.byCreatedAt()) {
    latestSkillRatings.set(v.skill, v);
  }

  const isStructuralHanziWord = await getIsStructuralHanziWord();

  return skillReviewQueue({
    graph,
    skillSrsStates,
    latestSkillRatings,
    now,
    isStructuralHanziWord,
  });
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

export const deviceStoryQuery = (key: DeviceStoreEntity) =>
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
