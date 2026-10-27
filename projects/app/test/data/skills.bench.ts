import {
  hanziWordToGloss,
  skillLearningGraph,
  skillReviewQueue,
} from "#data/skills.ts";
import {
  loadBuiltinCharacterDecompositionForMnemonicsEntries,
  loadCharactersJson,
  loadDictionary,
} from "#dictionary.ts";
import { describe, test } from "vitest";
import { makeLargeSkillReviewFixture } from "./skills.test";

// Load dictionary once at module level for benchmarks
const dictionary = await loadDictionary();
const charactersJson = await loadCharactersJson();

describe(`skillReviewQueue`, () => {
  const { graph, skillSrsStates, recentSkillRatingEvents, now } =
    makeLargeSkillReviewFixture({
      skillCount: 1000,
      introducedCount: 800,
      ratingCount: 600,
    });

  test(`large dataset + empty graph`, async ({ bench }) => {
    await bench(`large dataset + empty graph`, () => {
      skillReviewQueue({
        graph: new Map(),
        skillSrsStates,
        recentSkillRatingEvents,
        dictionary,
        now,
        maxQueueItems: graph.size,
      });
    }).run();
  });

  test(`large dataset + empty skillSrsStates`, async ({ bench }) => {
    await bench(`large dataset + empty skillSrsStates`, () => {
      skillReviewQueue({
        graph,
        skillSrsStates: new Map(),
        recentSkillRatingEvents,
        dictionary,
        now,
        maxQueueItems: graph.size,
      });
    }).run();
  });

  test(`large dataset + empty recentSkillRatingEvents`, async ({ bench }) => {
    await bench(`large dataset + empty recentSkillRatingEvents`, () => {
      skillReviewQueue({
        graph,
        skillSrsStates,
        recentSkillRatingEvents: [],
        dictionary,
        now,
        maxQueueItems: graph.size,
      });
    }).run();
  });

  test(`large dataset`, async ({ bench }) => {
    await bench(`large dataset`, () => {
      skillReviewQueue({
        graph,
        skillSrsStates,
        recentSkillRatingEvents,
        dictionary,
        now,
        maxQueueItems: graph.size,
      });
    }).run();
  });
});

describe(`skillLearningGraph`, async () => {
  const decompositionData =
    await loadBuiltinCharacterDecompositionForMnemonicsEntries();

  test(`no target skills`, async ({ bench }) => {
    await bench(`no target skills`, () => {
      skillLearningGraph({
        targetSkills: [],
        dictionary,
        decompositionData,
        charactersJson,
      });
    }).run();
  });

  const hsk1TargetSkills = [...dictionary.hsk1HanziWords].map((w) =>
    hanziWordToGloss(w),
  );
  test(`HSK1 target skills`, async ({ bench }) => {
    await bench(`HSK1 target skills`, () => {
      skillLearningGraph({
        targetSkills: hsk1TargetSkills,
        dictionary,
        decompositionData,
        charactersJson,
      });
    }).run();
  });

  const hsk1to3TargetSkills = [
    ...dictionary.hsk1HanziWords,
    ...dictionary.hsk2HanziWords,
    ...dictionary.hsk3HanziWords,
  ].map((w) => hanziWordToGloss(w));

  test(`HSK1-3 target skills`, async ({ bench }) => {
    await bench(`HSK1-3 target skills`, () => {
      skillLearningGraph({
        targetSkills: hsk1to3TargetSkills,
        dictionary,
        decompositionData,
        charactersJson,
      });
    }).run();
  });
});
