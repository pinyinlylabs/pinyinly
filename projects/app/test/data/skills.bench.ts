import {
  hanziWordToGloss,
  skillLearningGraph,
  skillReviewQueue,
} from "#data/skills.ts";
import {
  loadBuiltinCharacterDecompositionForMnemonicsEntries,
  loadDictionary,
} from "#dictionary.ts";
import { bench, describe, expect } from "vitest";
import { makeLargeSkillReviewFixture } from "./skills.test";

// Add a regression test to make sure Vitest bench mode sets the `MODE`
// environment variable to 'benchmark'. This is assumed in other places in the
// code.
expect(process.env[`MODE`]).toBe(`benchmark`);

// Load dictionary once at module level for benchmarks
const dictionary = await loadDictionary();

describe(`skillReviewQueue`, () => {
  const { graph, skillSrsStates, latestSkillRatings, now } =
    makeLargeSkillReviewFixture({
      skillCount: 1000,
      introducedCount: 800,
      ratingCount: 600,
    });

  bench(`large dataset + empty graph`, () => {
    skillReviewQueue({
      graph: new Map(),
      skillSrsStates,
      latestSkillRatings,
      dictionary,
      now,
      maxQueueItems: graph.size,
    });
  });

  bench(`large dataset + empty skillSrsStates`, () => {
    skillReviewQueue({
      graph,
      skillSrsStates: new Map(),
      latestSkillRatings,
      dictionary,
      now,
      maxQueueItems: graph.size,
    });
  });

  bench(`large dataset + empty latestSkillRatings`, () => {
    skillReviewQueue({
      graph,
      skillSrsStates,
      latestSkillRatings: new Map(),
      dictionary,
      now,
      maxQueueItems: graph.size,
    });
  });

  bench(`large dataset`, () => {
    skillReviewQueue({
      graph,
      skillSrsStates,
      latestSkillRatings,
      dictionary,
      now,
      maxQueueItems: graph.size,
    });
  });
});

describe(`skillLearningGraph`, async () => {
  const decompositionData =
    await loadBuiltinCharacterDecompositionForMnemonicsEntries();

  bench(`no target skills`, async () => {
    await skillLearningGraph({
      targetSkills: [],
      decompositionData,
    });
  });

  const hsk1TargetSkills = [...dictionary.hsk1HanziWords].map((w) =>
    hanziWordToGloss(w),
  );
  bench(`HSK1 target skills`, async () => {
    await skillLearningGraph({
      targetSkills: hsk1TargetSkills,
      decompositionData,
    });
  });

  const hsk1to3TargetSkills = [
    ...dictionary.hsk1HanziWords,
    ...dictionary.hsk2HanziWords,
    ...dictionary.hsk3HanziWords,
  ].map((w) => hanziWordToGloss(w));

  bench(`HSK1-3 target skills`, async () => {
    await skillLearningGraph({
      targetSkills: hsk1to3TargetSkills,
      decompositionData,
    });
  });
});
