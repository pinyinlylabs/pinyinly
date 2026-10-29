import {
  charactersJsonQuery,
  dictionaryQuery,
  skillReviewQueueHistoryCollection,
} from "@/client/query";
import { useDb } from "@/client/ui/hooks/useDb";
import type { Skill, SrsStateType } from "@/data/model";
import type {
  SkillReviewQueueRemediationConfig,
  SkillPracticeCategory,
} from "@/data/skills";
import type { StudyListId } from "@/data/studyLists";
import { hskStudyListIds, studyListHanziWords } from "@/data/studyLists";
import {
  hanziWordToTargetSkills,
  skillKindFromSkill,
  skillLearningGraph,
  skillPracticeCategories,
  skillPracticeCategoryFromSkillKind,
  skillReviewQueue,
} from "@/data/skills";
import {
  practiceMeaningUserToggleSetting,
  practicePronunciationUserToggleSetting,
  practiceWritingUserToggleSetting,
  studyBookmarksUserToggleSetting,
  studyHsk1UserToggleSetting,
  studyHsk2UserToggleSetting,
  studyHsk3UserToggleSetting,
  studyHsk4UserToggleSetting,
} from "@/data/userSettings";
import { arrayFilterUnique } from "@pinyinly/lib/collections";
import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import { Platform } from "react-native";
import type { SkillQueueContextValue } from "./contexts";
import { SkillQueueContext } from "./contexts";
import { useUserSetting } from "./hooks/useUserSetting";

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

function isPracticeCategoryEnabled(
  skill: Skill,
  excludedPracticeCategories: ReadonlySet<SkillPracticeCategory>,
): boolean {
  const category = skillPracticeCategoryFromSkillKind(
    skillKindFromSkill(skill),
  );
  return category == null || !excludedPracticeCategories.has(category);
}

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
  const meaningPracticeSetting = useUserSetting({
    setting: practiceMeaningUserToggleSetting,
  });
  const pronunciationPracticeSetting = useUserSetting({
    setting: practicePronunciationUserToggleSetting,
  });
  const writingPracticeSetting = useUserSetting({
    setting: practiceWritingUserToggleSetting,
  });
  const bookmarksStudySetting = useUserSetting({
    setting: studyBookmarksUserToggleSetting,
  });
  const hsk1StudySetting = useUserSetting({
    setting: studyHsk1UserToggleSetting,
  });
  const hsk2StudySetting = useUserSetting({
    setting: studyHsk2UserToggleSetting,
  });
  const hsk3StudySetting = useUserSetting({
    setting: studyHsk3UserToggleSetting,
  });
  const hsk4StudySetting = useUserSetting({
    setting: studyHsk4UserToggleSetting,
  });
  const practiceSettingsLoading =
    meaningPracticeSetting.isLoading ||
    pronunciationPracticeSetting.isLoading ||
    writingPracticeSetting.isLoading;
  const studySourceSettingsLoading =
    bookmarksStudySetting.isLoading ||
    hsk1StudySetting.isLoading ||
    hsk2StudySetting.isLoading ||
    hsk3StudySetting.isLoading ||
    hsk4StudySetting.isLoading;
  const bookmarksEnabled = bookmarksStudySetting.value?.enabled ?? true;
  const hsk1Enabled = hsk1StudySetting.value?.enabled ?? true;
  const hsk2Enabled = hsk2StudySetting.value?.enabled ?? true;
  const hsk3Enabled = hsk3StudySetting.value?.enabled ?? true;
  const hsk4Enabled = hsk4StudySetting.value?.enabled ?? true;
  const allStudySourcesEnabled =
    bookmarksEnabled &&
    hsk1Enabled &&
    hsk2Enabled &&
    hsk3Enabled &&
    hsk4Enabled;
  const meaningEnabled = meaningPracticeSetting.value?.enabled ?? true;
  const pronunciationEnabled =
    pronunciationPracticeSetting.value?.enabled ?? true;
  const writingEnabled = writingPracticeSetting.value?.enabled ?? true;
  const excludedPracticeCategories = useMemo(
    () =>
      new Set(
        skillPracticeCategories.filter((category) => {
          switch (category) {
            case `meaning`:
              return !meaningEnabled;
            case `pronunciation`:
              return !pronunciationEnabled;
            case `writing`:
              return !writingEnabled;
          }
        }),
      ),
    [meaningEnabled, pronunciationEnabled, writingEnabled],
  );
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
            skillStateData
              .filter(({ skill }) =>
                isPracticeCategoryEnabled(skill, excludedPracticeCategories),
              )
              .map((x) => [x.skill, x.srs]),
          ),
    [skillStateData, isSkillStatesLoading, excludedPracticeCategories],
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

  // Combine selected dictionary lists with Bookmarks
  const allTargetSkills = useMemo(() => {
    if (dictionary == null || studySkills == null) {
      return null;
    }
    const hskSkills = hskStudyListIds
      .filter((listId) => {
        switch (listId) {
          case `hsk-1`:
            return hsk1Enabled;
          case `hsk-2`:
            return hsk2Enabled;
          case `hsk-3`:
            return hsk3Enabled;
          case `hsk-4`:
            return hsk4Enabled;
        }
      })
      .flatMap((listId) =>
        studyListHanziWords(dictionary, listId).flatMap((word) =>
          hanziWordToTargetSkills(word, dictionary, Platform.OS === `web`),
        ),
      );
    return [...hskSkills, ...(bookmarksEnabled ? studySkills : [])].filter(
      arrayFilterUnique(),
    );
  }, [
    dictionary,
    studySkills,
    bookmarksEnabled,
    hsk1Enabled,
    hsk2Enabled,
    hsk3Enabled,
    hsk4Enabled,
  ]);

  const graph = useMemo(
    () =>
      dictionary == null ||
      charactersJson == null ||
      allTargetSkills == null ||
      practiceSettingsLoading ||
      studySourceSettingsLoading ||
      isCharacterDecompositionLoading
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
            excludedPracticeCategories,
            decompositionData: characterDecompositionData,
            dictionary,
            charactersJson,
          }),
    [
      dictionary,
      charactersJson,
      characterDecompositionData,
      allTargetSkills,
      practiceSettingsLoading,
      studySourceSettingsLoading,
      excludedPracticeCategories,
      isCharacterDecompositionLoading,
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
            directSkills: new Set(
              (listId != null || bookmarksEnabled
                ? (studySkills ?? [])
                : []
              ).filter((skill) =>
                isPracticeCategoryEnabled(skill, excludedPracticeCategories),
              ),
            ),
            skillSrsStates:
              listId == null && allStudySourcesEnabled
                ? skillSrsStates
                : new Map(
                    [...skillSrsStates].filter(([skill]) => graph.has(skill)),
                  ),
            recentSkillRatingEvents: skillRatingHistoryData.filter(
              ({ skill }) =>
                isPracticeCategoryEnabled(skill, excludedPracticeCategories) &&
                (listId != null || allStudySourcesEnabled || graph.has(skill)),
            ),
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
      bookmarksEnabled,
      allStudySourcesEnabled,
      excludedPracticeCategories,
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
