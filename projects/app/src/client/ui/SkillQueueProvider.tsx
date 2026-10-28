import {
  charactersJsonQuery,
  dictionaryQuery,
  skillReviewQueueHistoryCollection,
} from "@/client/query";
import { useDb } from "@/client/ui/hooks/useDb";
import type { Skill, SrsStateType } from "@/data/model";
import type { SkillReviewQueueRemediationConfig } from "@/data/skills";
import type { StudyListId } from "@/data/studyLists";
import { studyListHanziWords } from "@/data/studyLists";
import {
  hanziWordToTargetSkills,
  skillLearningGraph,
  skillReviewQueue,
} from "@/data/skills";
import { arrayFilterUnique } from "@pinyinly/lib/collections";
import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import { Platform } from "react-native";
import type { SkillQueueContextValue } from "./contexts";
import { SkillQueueContext } from "./contexts";

const mockable = {
  getMaxQueueItems: () => 2,
};

const skillReviewQueueRemediationConfig = {
  writingSuccessfulAttempts: 5,
  typedPinyinWrongInitial: {
    initialSuccessfulAttempts: 3,
    typedSuccessfulAttempts: 1,
  },
  typedPinyinWrongFinal: {
    finalSuccessfulAttempts: 3,
    typedSuccessfulAttempts: 1,
  },
  typedPinyinWrongTone: {
    toneSuccessfulAttempts: 3,
    typedSuccessfulAttempts: 1,
  },
} satisfies SkillReviewQueueRemediationConfig;

/**
 * Provides a global skill queue that's scoped to the session.
 *
 * The queue is lazily computed only when needed, making it cheap to render
 * multiple SessionStoreProviders (like on the login page) without computing
 * expensive skill queues for each account.
 *
 * The queue is automatically invalidated when the underlying Replicache data
 * changes, ensuring it stays up-to-date with user progress.
 */
function SkillQueueProvider({
  children,
  listId,
}: PropsWithChildren<{ listId?: StudyListId }>) {
  "use memo";
  const db = useDb();

  const { data: baseTargetSkills, isLoading: isTargetSkillsLoading } =
    useLiveQuery({
      query: (q) =>
        q
          .from({ targetSkill: db.targetSkillsCollection })
          .orderBy(({ targetSkill }) => targetSkill.order, `asc`),
    });
  const { data: dictionary } = useQuery(dictionaryQuery);
  const { data: charactersJson } = useQuery(charactersJsonQuery);
  const { data: skillRatingHistoryData } = useLiveQuery(
    skillReviewQueueHistoryCollection(
      db.skillRatingCollection,
      db.hanziPinyinMistakeCollection,
    ),
  );
  const { data: skillStateData, isLoading: isSkillStatesLoading } =
    useLiveQuery({
      query: (q) => q.from({ skillState: db.skillStateCollection }),
    });
  const { data: studyWordsData, isLoading: isStudyWordsLoading } = useLiveQuery(
    { query: (q) => q.from({ word: db.bookmarkedHanziWordsCollection }) },
  );
  const {
    data: characterDecompositionData,
    isLoading: isCharacterDecompositionLoading,
  } = useLiveQuery({
    query: (q) =>
      q.from({ decomposition: db.characterDecompositionsCollection }),
  });

  const skillSrsStates = useMemo(
    () =>
      isSkillStatesLoading
        ? null
        : new Map<Skill, SrsStateType>(
            skillStateData.map((x) => [x.skill, x.srs]),
          ),
    [skillStateData, isSkillStatesLoading],
  );

  // Compute Study skills from the resolved word collection
  const studySkills = useMemo(() => {
    if (dictionary == null || isStudyWordsLoading) {
      return null;
    }
    return studyWordsData.flatMap(({ hanziWord }) =>
      hanziWordToTargetSkills(hanziWord, dictionary, Platform.OS === `web`),
    );
  }, [studyWordsData, dictionary, isStudyWordsLoading]);

  // Combine base target skills with Study skills
  const allTargetSkills = useMemo(() => {
    if (studySkills == null) {
      return null;
    }

    if (isTargetSkillsLoading) {
      return null;
    }
    return [
      ...baseTargetSkills.map(({ skill }) => skill),
      ...studySkills,
    ].filter(arrayFilterUnique());
  }, [baseTargetSkills, studySkills, isTargetSkillsLoading]);

  const graph = useMemo(
    () =>
      dictionary == null ||
      charactersJson == null ||
      allTargetSkills == null ||
      isCharacterDecompositionLoading ||
      isTargetSkillsLoading
        ? null
        : skillLearningGraph({
            targetSkills:
              listId == null
                ? allTargetSkills
                : studyListHanziWords(
                    dictionary,
                    listId,
                    studyWordsData.map(({ hanziWord }) => hanziWord),
                  ).flatMap((word) =>
                    hanziWordToTargetSkills(
                      word,
                      dictionary,
                      Platform.OS === `web`,
                    ),
                  ),
            includeDependencies: listId == null,
            decompositionData: characterDecompositionData,
            dictionary,
            charactersJson,
          }),
    [
      dictionary,
      charactersJson,
      characterDecompositionData,
      allTargetSkills,
      isCharacterDecompositionLoading,
      isTargetSkillsLoading,
      listId,
      studyWordsData,
    ],
  );

  // Recompute the review queue when inputs are ready
  const reviewQueue = useMemo(
    () =>
      graph == null || dictionary == null || skillSrsStates == null
        ? null
        : skillReviewQueue({
            graph,
            directSkills: new Set(studySkills ?? []),
            skillSrsStates:
              listId == null
                ? skillSrsStates
                : new Map(
                    [...skillSrsStates].filter(([skill]) => graph.has(skill)),
                  ),
            recentSkillRatingEvents: skillRatingHistoryData,
            remediationConfig: skillReviewQueueRemediationConfig,
            now: new Date(),
            dictionary,
            maxQueueItems: mockable.getMaxQueueItems(),
          }),
    [
      graph,
      dictionary,
      skillRatingHistoryData,
      skillSrsStates,
      listId,
      studySkills,
    ],
  );

  const skillQueue: SkillQueueContextValue = useMemo(
    () =>
      reviewQueue == null
        ? { loading: true }
        : {
            loading: false,
            reviewQueue,
            ...(listId == null ? {} : { targetSkills: new Set(graph?.keys()) }),
          },
    [reviewQueue, graph, listId],
  );

  return (
    <SkillQueueContext.Provider value={skillQueue}>
      {children}
    </SkillQueueContext.Provider>
  );
}

SkillQueueProvider.Context = SkillQueueContext;
SkillQueueProvider.mockable = mockable;

export { SkillQueueProvider };
