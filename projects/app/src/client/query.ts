import { loadBillOfMaterials } from "@/data/bom";
import type {
  HanziText,
  HanziWord,
  Question,
  QuestionFlagType,
  SrsStateType,
} from "@/data/model";
import { QuestionFlagKind, SkillKind, SrsKind } from "@/data/model";
import { generateQuestionForSkillOrThrow } from "@/data/questions";
import type { Rizzle, Skill, SkillRating } from "@/data/rizzleSchema";
import type { SkillReviewQueue } from "@/data/skills";
import {
  hanziWordToGloss,
  hanziWordToPinyin,
  skillDueWindow,
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
import { fsrsIsForgotten } from "@/util/fsrs";
import { arrayFilterUniqueWithKey } from "@pinyinly/lib/collections";
import { queryOptions, skipToken } from "@tanstack/react-query";
import { add } from "date-fns/add";
import { interval } from "date-fns/interval";
import type { DeviceStoreEntity } from "./deviceStore";
import { buildDeviceStoreKey, deviceStoreGet } from "./deviceStore";

export async function questionsForReview2(
  r: Rizzle,
  options?: {
    limit?: number;
  },
): Promise<[Question[], SkillReviewQueue]> {
  const questions: Question[] = [];
  const reviewQueue = await targetSkillsReviewQueue(r);

  for (const [i, skill] of reviewQueue.items.entries()) {
    const skillState = await r.replicache.query((tx) =>
      r.query.skillState.get(tx, { skill }),
    );

    try {
      const question = await generateQuestionForSkillOrThrow(skill);
      const isRetry = reviewQueue.retryCount > 0 && i < reviewQueue.retryCount;
      if (isRetry) {
        question.flag ??= {
          kind: QuestionFlagKind.Retry,
        };
      }
      question.flag ??= flagsForSrsState(skillState?.srs);

      // Instead of saying "New Skill" when it's just a harder version of an
      // existing skill, we say "New Difficulty" instead.
      if (
        question.flag?.kind == QuestionFlagKind.NewSkill &&
        isNewDifficultySkillType(skillKindFromSkill(skill))
      ) {
        question.flag = { kind: QuestionFlagKind.NewDifficulty };
      }

      questions.push(question);
    } catch (error) {
      console.error(
        `Error while generating a question for a skill ${JSON.stringify(skill)}`,
        error,
      );
      continue;
    }

    if (options?.limit != null && questions.length === options.limit) {
      break;
    }
  }

  return [questions, reviewQueue];
}

function isNewDifficultySkillType(skillKind: SkillKind): boolean {
  return (
    skillKind === SkillKind.HanziWordToPinyinFinal ||
    skillKind === SkillKind.HanziWordToPinyinTone
  );
}

export function flagsForSrsState(
  srsState: SrsStateType | undefined,
): QuestionFlagType | undefined {
  if (
    srsState?.kind !== SrsKind.FsrsFourPointFive ||
    fsrsIsForgotten(srsState)
  ) {
    return {
      kind: QuestionFlagKind.NewSkill,
    };
  }
  const now = new Date();
  const overDueDate = add(srsState.nextReviewAt, skillDueWindow);

  if (now >= overDueDate) {
    return {
      kind: QuestionFlagKind.Overdue,
      interval: interval(overDueDate.getTime(), now),
    };
  }
}

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
  return hanziWords.flatMap((w) => [hanziWordToGloss(w), hanziWordToPinyin(w)]);
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
  // const res = await r.queryPaged.skillRating.byCreatedAt().toArray();
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
    queryKey: [`DeviceStore`, buildDeviceStoreKey(key)],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();
      return await deviceStoreGet(key);
    },
    networkMode: `offlineFirst`,
    structuralSharing: false,
  });
