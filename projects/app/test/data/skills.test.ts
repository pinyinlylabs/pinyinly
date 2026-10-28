import type {
  Dictionary,
  Skill,
  SrsStateType,
  HanziCharacter,
} from "#data/model.ts";
import {
  pinyinTextSchema,
  QuestionFlagKind,
  SkillKind,
  SrsKind,
} from "#data/model.ts";
import { mutators } from "#data/rizzleMutators.ts";
import { currentSchema, rSkillKind } from "#data/rizzleSchema.ts";
import type {
  SkillReviewQueueRatingEvent,
  SkillReviewQueueRemediatorContext,
  RankNumber,
  RankRules,
  SkillLearningGraph,
  SkillReviewQueue,
} from "#data/skills.ts";
import {
  computeSkillRating,
  hanziCharacterToWriting,
  getHanziWordRank,
  hanziWordToGloss,
  hanziWordToGlossTyped,
  hanziWordToPinyinTyped,
  hanziWordToTargetSkills,
  isHanziWordSkill,
  isHarderDifficultyStyleSkillKind,
  randomPickSkillsForReview,
  rankPresentation,
  rankRules,
  rankToAbsoluteProgress,
  rankToWithinLevelProgress,
  rankName,
  retryFailedSkillReviewQueueRemediator,
  skillKindFromSkill,
  skillLearningGraph,
  skillReviewQueueRemediators,
  skillReviewQueue,
  typedPinyinComponentSkillReviewQueueRemediator,
  wrongPinyinFinalSkillReviewQueueRemediator,
  wrongPinyinInitialSkillReviewQueueRemediator,
  wrongPinyinToneSkillReviewQueueRemediator,
  writingSkillReviewQueueRemediator,
  walkSkillAndDependencies,
} from "#data/skills.ts";
import type { CharactersJson } from "#dictionary.ts";
import {
  loadBuiltinCharacterDecompositionForMnemonicsEntries,
  loadCharactersJson,
  loadDictionary,
} from "#dictionary.ts";
import type { HistoryCommand } from "#test/data/helpers.ts";
import {
  fsrsSrsState,
  mockSrsState,
  prettyQueue,
  printTextGraph,
  seedSkillReviews as seedSkillHistory,
  时,
} from "#test/data/helpers.ts";
import { testReplicacheOptions } from "#test/util/rizzleHelpers.ts";
import { Rating } from "#util/fsrs.ts";
import { r } from "#util/rizzle.ts";
import { invariant } from "@pinyinly/lib/invariant";
import ms from "ms";
import { beforeEach, describe, expect, test, vi } from "vitest";

describe(`rankToAbsoluteProgress`, () => {
  test(`converts rank completion into clamped absolute progress`, () => {
    expect(rankToAbsoluteProgress({ rank: 0, completion: 1 })).toBe(0);
    expect(rankToAbsoluteProgress({ rank: 2, completion: 0.5 })).toBe(0.375);
    expect(rankToAbsoluteProgress({ rank: 4, completion: 0 })).toBe(1);
    expect(rankToAbsoluteProgress({ rank: 3, completion: 2 })).toBe(1);
  });
});

describe(`proficiency presentation`, () => {
  test(`uses the learner-facing proficiency labels`, () => {
    const ranks: RankNumber[] = [0, 1, 2, 3, 4];
    expect(ranks.map(rankName)).toEqual([
      `Not Started`,
      `Novice`,
      `Apprentice`,
      `Expert`,
      `Master`,
    ]);
    expect(ranks.map((rank) => rankPresentation[rank].color)).toEqual([
      `muted-fg`,
      `blue`,
      `emerald`,
      `violet`,
      `amber`,
    ]);
    expect(
      Object.values(rankPresentation).map((level) => level.description),
    ).toEqual([
      `You haven't started practising this word yet.`,
      `You're beginning to learn this word.`,
      `You're building familiarity and improving your recall.`,
      `You can remember this word reliably.`,
      `You've developed strong, long-term knowledge of this word.`,
    ]);
  });

  test(`shows within-level progress and treats the endpoints as empty or complete`, () => {
    expect(rankToWithinLevelProgress({ rank: 0, completion: 1 })).toBe(0);
    expect(rankToWithinLevelProgress({ rank: 1, completion: 0.25 })).toBe(0.25);
    expect(rankToWithinLevelProgress({ rank: 2, completion: 0.6 })).toBe(0.6);
    expect(rankToWithinLevelProgress({ rank: 3, completion: 0.8 })).toBe(0.8);
    expect(rankToWithinLevelProgress({ rank: 4, completion: 0 })).toBe(1);
    expect(rankToWithinLevelProgress({ rank: 3, completion: 2 })).toBe(1);
  });
});

type CharacterDecompositionData = Awaited<
  ReturnType<typeof loadBuiltinCharacterDecompositionForMnemonicsEntries>
>;

const skillTest = test.extend<{
  decompositionData: CharacterDecompositionData;
  dictionary: Dictionary;
  charactersJson: CharactersJson;
}>({
  decompositionData: [
    async ({}, use) => {
      const decompositionData =
        await loadBuiltinCharacterDecompositionForMnemonicsEntries();
      await use(decompositionData);
    },
    { scope: `worker` },
  ],
  dictionary: [
    async ({}, use) => {
      const dictionary = await loadDictionary();
      await use(dictionary);
    },
    { scope: `worker` },
  ],
  charactersJson: [
    async ({}, use) => {
      const charactersJson = await loadCharactersJson();
      await use(charactersJson);
    },
    { scope: `worker` },
  ],
});

describe(`hanziWordToTargetSkills`, () => {
  test(`returns meaning followed by pronunciation when pinyin is available`, () => {
    const lookupHanziWord = vi.fn(() => ({
      gloss: [`hello`],
      pinyin: [pinyinTextSchema.parse(`nǐ hǎo`)],
    }));
    expect(hanziWordToTargetSkills(`你好:hello`, { lookupHanziWord })).toEqual([
      hanziWordToGlossTyped(`你好:hello`),
      hanziWordToPinyinTyped(`你好:hello`),
    ]);
    expect(lookupHanziWord).toHaveBeenCalledExactlyOnceWith(`你好:hello`);
  });

  test(`returns only meaning for entries without pinyin`, () => {
    for (const pinyin of [undefined, []]) {
      expect(
        hanziWordToTargetSkills(`冖:cover`, {
          lookupHanziWord: () => ({ gloss: [`cover`], pinyin }),
        }),
      ).toEqual([hanziWordToGlossTyped(`冖:cover`)]);
    }
  });

  test(`adds one shared writing target for single characters with pinyin`, () => {
    const lookupHanziWord = vi.fn(() => ({
      gloss: [`good`],
      pinyin: [pinyinTextSchema.parse(`hǎo`)],
    }));

    expect(hanziWordToTargetSkills(`好:good`, { lookupHanziWord })).toEqual([
      hanziWordToGlossTyped(`好:good`),
      hanziWordToPinyinTyped(`好:good`),
      hanziCharacterToWriting(`好` as HanziCharacter),
    ]);
    expect(
      hanziWordToTargetSkills(`好:good`, { lookupHanziWord }, false),
    ).toEqual([
      hanziWordToGlossTyped(`好:good`),
      hanziWordToPinyinTyped(`好:good`),
    ]);
  });

  test(`returns no targets for a missing dictionary entry`, () => {
    expect(
      hanziWordToTargetSkills(`missing:meaning`, {
        lookupHanziWord: () => null,
      }),
    ).toEqual([]);
  });
});

describe(`skillLearningGraph suite`, () => {
  skillTest(
    `can omit all dependencies without looking up prerequisites`,
    ({ decompositionData, dictionary, charactersJson }) => {
      const targetSkills: Skill[] = [
        `he:好:good`,
        `het:你好:hello`,
        `hp:你好:hello`,
        `he:好:good`,
      ];
      const lookup = vi.spyOn(dictionary, `lookupHanziWord`);
      try {
        const graph = skillLearningGraph({
          targetSkills,
          includeDependencies: false,
          decompositionData,
          dictionary,
          charactersJson,
        });
        expect([...graph.keys()]).toEqual([...new Set(targetSkills)]);
        for (const node of graph.values()) {
          expect(node.dependencies).toEqual(new Set());
        }
        expect(lookup).not.toHaveBeenCalled();
      } finally {
        lookup.mockRestore();
      }
    },
  );

  skillTest(
    `keeps the meaning prerequisite for writing skills when omitting other dependencies`,
    ({ decompositionData, dictionary, charactersJson }) => {
      const writingSkill = hanziCharacterToWriting(`好` as HanziCharacter);
      const graph = skillLearningGraph({
        targetSkills: [writingSkill],
        includeDependencies: false,
        decompositionData,
        dictionary,
        charactersJson,
      });

      expect(graph.get(writingSkill)?.dependencies).toEqual(
        new Set([`he:好:good`]),
      );
    },
  );

  skillTest(
    `explicit dependency expansion matches the default`,
    ({ decompositionData, dictionary, charactersJson }) => {
      const options = {
        targetSkills: [`he:好:good`] as Skill[],
        decompositionData,
        dictionary,
        charactersJson,
      };
      expect(
        skillLearningGraph({ ...options, includeDependencies: true }),
      ).toEqual(skillLearningGraph(options));
      expect(
        skillLearningGraph({
          ...options,
          targetSkills: [],
          includeDependencies: false,
        }),
      ).toEqual(new Map());
    },
  );

  skillTest(
    `no targets gives an empty graph`,
    async ({ decompositionData, dictionary, charactersJson }) => {
      expect(
        skillLearningGraph({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [],
        }),
      ).toEqual(new Map());
    },
  );

  skillTest(
    `includes the target skill in the graph`,
    async ({ decompositionData, dictionary, charactersJson }) => {
      const skill = `he:我:i`;

      const graph = skillLearningGraph({
        decompositionData,
        charactersJson,
        dictionary,
        targetSkills: [skill],
      });

      expect(graph.keys()).toContain(`he:我:i`);
    },
  );

  skillTest(
    `includes decomposition dependencies when learning 好`,
    async ({ decompositionData, dictionary, charactersJson }) => {
      expect(
        skillLearningGraph({
          decompositionData,
          dictionary,
          charactersJson,
          targetSkills: [`he:好:good`],
        }),
      ).toMatchInlineSnapshot(`
        Map {
          "he:好:good" => {
            "dependencies": Set {
              "he:女:woman",
              "he:子:child",
            },
            "skill": "he:好:good",
          },
          "he:女:woman" => {
            "dependencies": Set {},
            "skill": "he:女:woman",
          },
          "he:子:child" => {
            "dependencies": Set {
              "he:了:done",
              "he:一:one",
            },
            "skill": "he:子:child",
          },
          "he:了:done" => {
            "dependencies": Set {
              "he:亅:hook",
            },
            "skill": "he:了:done",
          },
          "he:亅:hook" => {
            "dependencies": Set {},
            "skill": "he:亅:hook",
          },
          "he:一:one" => {
            "dependencies": Set {},
            "skill": "he:一:one",
          },
        }
      `);
    },
  );

  skillTest(
    `includes multiple levels of decomposition for a character`,
    async ({ decompositionData, dictionary, charactersJson }) => {
      expect(
        skillLearningGraph({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [`he:外:outside`],
        }),
      ).toEqual(
        new Map([
          [
            `he:外:outside`,
            {
              skill: `he:外:outside`,
              dependencies: new Set([`he:夕:evening`, `he:卜:divine`]),
            },
          ],
          [
            `he:夕:evening`,
            {
              skill: `he:夕:evening`,
              dependencies: new Set([`he:丶:dot`, `he:𠂊:hands`]),
            },
          ],
          [
            `he:丶:dot`,
            {
              skill: `he:丶:dot`,
              dependencies: new Set([]),
            },
          ],
          [
            `he:丨:line`,
            {
              skill: `he:丨:line`,
              dependencies: new Set(),
            },
          ],
          [
            `he:卜:divine`,
            {
              skill: `he:卜:divine`,
              dependencies: new Set([`he:丨:line`, `he:丶:dot`]),
            },
          ],
          [
            `he:𠂊:hands`,
            {
              skill: `he:𠂊:hands`,
              dependencies: new Set([]),
            },
          ],
        ]),
      );
    },
  );

  skillTest(
    `supports multi-character words`,
    async ({ decompositionData, dictionary, charactersJson }) => {
      expect(
        printTextGraph(
          skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`he:一下儿:aBit`],
          }),
        ),
      ).toMatchInlineSnapshot(`
        "he:一下儿:aBit
          he:一:one
          he:下:below
            he:一:one
            he:卜:divine
              he:丨:line
              he:丶:dot
          he:儿:9mRvV
            he:丿:slash
            he:乚:hidden"
      `);
    },
  );

  skillTest(
    `supports HanziWordToPinyin dependency chain`,
    async ({ decompositionData, dictionary, charactersJson }) => {
      expect(
        printTextGraph(
          skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`hp:儿:son`],
          }),
        ),
      ).toMatchInlineSnapshot(`
        "hp:儿:son
          he:儿:son
            he:丿:slash
            he:乚:hidden
          hpf:儿:son
            hpi:儿:son
              he:儿:son"
      `);
    },
  );

  skillTest.todo(
    `works for hsk words`,
    ({ decompositionData, dictionary, charactersJson }) => {
      skillLearningGraph({
        decompositionData,
        charactersJson,
        dictionary,
        targetSkills: [
          ...dictionary.hsk1HanziWords,
          ...dictionary.hsk2HanziWords,
          ...dictionary.hsk3HanziWords,
        ].map((w) => hanziWordToGloss(w)),
      });
    },
  );

  skillTest(
    `learns the word form of component-form first`,
    ({ decompositionData, dictionary, charactersJson }) => {
      expect(
        printTextGraph(
          skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`he:汉:chinese`],
          }),
        ),
      ).toMatchInlineSnapshot(`
        "he:汉:chinese
          he:又:again
          he:氵:water"
      `);
    },
  );

  skillTest(
    `uses pinyin to decompose words into characters`,
    ({ decompositionData, dictionary, charactersJson }) => {
      const graph = skillLearningGraph({
        decompositionData,
        charactersJson,
        dictionary,
        targetSkills: [`he:行业:industry`],
      });

      expect(graph.get(`he:行业:industry`)?.dependencies).not.toEqual(
        new Set([`he:行:okay`, `he:业:profession`]),
      );
    },
  );

  test.todo(`splits words into characters`);
});

describe(`skillReviewQueue suite`, () => {
  skillTest(
    `no target skills or skill states gives an empty queue`,
    ({ decompositionData, dictionary, charactersJson }) => {
      const graph = skillLearningGraph({
        decompositionData,
        charactersJson,
        dictionary,
        targetSkills: [],
      });
      expect(
        skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
          dictionary,
        }),
      ).toMatchObject({
        dueCount: 0,
        items: [],
        newContentCount: 0,
        newDifficultyCount: 0,
        newDueAt: null,
        newOverDueAt: null,
        overDueCount: 0,
        retryCount: 0,
      });
    },
  );

  skillTest(
    `no target skills but some skill states (i.e. introduced skills) includes introduced skills (but not any dependencies of it)`,
    ({ decompositionData, dictionary, charactersJson }) => {
      const graph = skillLearningGraph({
        decompositionData,
        charactersJson,
        dictionary,
        targetSkills: [],
      });
      const queue = skillReviewQueue({
        graph,
        skillSrsStates: new Map([
          [`he:刀:knife`, mockSrsState(时`-1d`, 时`-5m`)],
        ]),
        recentSkillRatingEvents: recentSkillRatingEvents(),
        dictionary,
      });
      expect(prettyQueue(queue)).toMatchInlineSnapshot(`
          [
            "he:刀:knife",
          ]
        `);
      expect(queue).toMatchObject({
        dueCount: 1,
        blockedCount: 0,
        newContentCount: 0,
        newDifficultyCount: 0,
        overDueCount: 0,
        retryCount: 0,
      });
    },
  );

  skillTest(
    `introduced skills that would otherwise be blocked are not blocked (because they've been introduced already)`,
    ({ decompositionData, dictionary, charactersJson }) => {
      const graph = skillLearningGraph({
        decompositionData,
        charactersJson,
        dictionary,
        targetSkills: [`he:刀:knife`],
      });

      const queue = skillReviewQueue({
        graph,
        skillSrsStates: new Map([
          [`he:刀:knife`, mockSrsState(时`-1d`, 时`-5m`)],
        ]),
        recentSkillRatingEvents: recentSkillRatingEvents(),
        dictionary,
      });
      // `he:刀:knife` would normally be blocked but because it's already
      // introduced (because there's an srs state for it) it's available.
      //
      // `he:丿:slash` and `he:𠃌:radical` would normally come first in the
      // queue because they're dependencies of he:刀:knife, but he:刀:knife is
      // first because it's "due" while these are not yet.
      expect(prettyQueue(queue)).toMatchInlineSnapshot(`
          [
            "he:刀:knife",
            "he:丿:slash (🌱 NEW SKILL)",
            "he:𠃌:radical (🌱 NEW SKILL)",
          ]
        `);
      expect(queue).toMatchObject({
        dueCount: 1,
        newContentCount: 2,
        newDifficultyCount: 0,
        overDueCount: 0,
        retryCount: 0,
      });
    },
  );

  skillTest(
    `new words are introduced before new radicals, because they are more immediately useful`,
    ({ decompositionData, dictionary, charactersJson }) => {
      const graph = skillLearningGraph({
        decompositionData,
        charactersJson,
        dictionary,
        targetSkills: [`he:丿:slash`, `he:人:person`, `he:𠃌:radical`],
      });

      const queue = skillReviewQueue({
        graph,
        skillSrsStates: new Map(),
        recentSkillRatingEvents: recentSkillRatingEvents(),
        dictionary,
      });

      expect(prettyQueue(queue)).toMatchInlineSnapshot(`
          [
            "he:人:person (🌱 NEW SKILL)",
            "he:𠃌:radical (🌱 NEW SKILL)",
            "he:丿:slash (🌱 NEW SKILL)",
          ]
        `);
    },
  );

  skillTest(
    `direct skills can be introduced before their dependencies are stable`,
    ({ decompositionData, dictionary, charactersJson }) => {
      const targetSkill = `he:刀:knife` as Skill;
      const graph = skillLearningGraph({
        decompositionData,
        charactersJson,
        dictionary,
        targetSkills: [targetSkill],
      });
      expect(graph.get(targetSkill)?.dependencies.size).toBeGreaterThan(0);

      const queue = skillReviewQueue({
        graph,
        skillSrsStates: new Map(),
        recentSkillRatingEvents: recentSkillRatingEvents(),
        dictionary,
        directSkills: new Set([targetSkill]),
      });

      expect(prettyQueue(queue)).toContain(`${targetSkill} (🌱 NEW SKILL)`);
    },
  );

  skillTest(
    `writing skills wait for their meaning prerequisite, even when directly studied`,
    ({ decompositionData, dictionary, charactersJson }) => {
      const writingSkill = hanziCharacterToWriting(`好` as HanziCharacter);
      const meaningSkill = `he:好:good` as Skill;
      const graph = skillLearningGraph({
        targetSkills: [writingSkill],
        includeDependencies: false,
        decompositionData,
        dictionary,
        charactersJson,
      });
      const commonOptions = {
        graph,
        directSkills: new Set([writingSkill]),
        recentSkillRatingEvents: recentSkillRatingEvents(),
        dictionary,
      };

      const blockedQueue = skillReviewQueue({
        ...commonOptions,
        skillSrsStates: new Map(),
      });
      expect(prettyQueue(blockedQueue)).toContain(
        `${writingSkill} (🟥 BLOCKED)`,
      );

      const readyQueue = skillReviewQueue({
        ...commonOptions,
        skillSrsStates: new Map([
          [meaningSkill, mockSrsState(时`-10d`, 时`+2d`)],
        ]),
      });
      expect(prettyQueue(readyQueue)).toContain(
        `${writingSkill} (🌱 NEW SKILL)`,
      );
    },
  );

  skillTest(
    `direct skills bypass the new-skill throttle without changing it for other skills`,
    ({ decompositionData, dictionary, charactersJson }) => {
      const targetSkills = Array.from(
        { length: 16 },
        (_, index) => `he:word${index}:meaning` as Skill,
      );
      const graph = skillLearningGraph({
        decompositionData,
        charactersJson,
        dictionary,
        targetSkills,
        includeDependencies: false,
      });
      const commonOptions = {
        graph,
        skillSrsStates: new Map<Skill, SrsStateType>(),
        recentSkillRatingEvents: recentSkillRatingEvents(),
        dictionary,
      };

      const ordinaryQueue = skillReviewQueue(commonOptions);
      const directQueue = skillReviewQueue({
        ...commonOptions,
        directSkills: new Set(targetSkills),
      });

      expect(ordinaryQueue.newContentCount).toBe(15);
      expect(ordinaryQueue.blockedCount).toBe(1);
      expect(directQueue.newContentCount).toBe(16);
      expect(directQueue.blockedCount).toBe(0);
    },
  );

  describe(`maxQueueItems argument`, () => {
    function makeMockData() {
      const skillA = `he:A:a` as Skill;
      const skillB = `he:B:b` as Skill;
      const skillC = `he:C:c` as Skill;
      const graph: SkillLearningGraph = new Map([
        [skillA, { skill: skillA, dependencies: new Set([skillB, skillC]) }],
        [skillB, { skill: skillB, dependencies: new Set() }],
        [skillC, { skill: skillC, dependencies: new Set() }],
      ]);
      const skillSrsStates = new Map<Skill, SrsStateType>();
      const recentSkillRatingEvents: SkillReviewQueueRatingEvent[] = [];

      return {
        skillA,
        skillB,
        skillC,
        graph,
        skillSrsStates,
        recentSkillRatingEvents,
      };
    }

    skillTest(
      `limits the number of items in the queue`,
      async ({ dictionary }) => {
        const { graph, skillSrsStates, recentSkillRatingEvents } =
          makeMockData();

        const queue = skillReviewQueue({
          graph,
          skillSrsStates,
          recentSkillRatingEvents,
          dictionary,
          maxQueueItems: 1,
        });

        expect(queue.items.length).toBeLessThanOrEqual(1);
        expect(prettyQueue(queue)).toMatchInlineSnapshot(`
            [
              "he:C:c (🌱 NEW SKILL)",
            ]
          `);
      },
    );

    skillTest(
      `does not limit the queue when maxQueueItems is Infinity`,
      async ({ dictionary }) => {
        const { graph, skillSrsStates, recentSkillRatingEvents } =
          makeMockData();

        const queue = skillReviewQueue({
          graph,
          skillSrsStates,
          recentSkillRatingEvents,
          dictionary,
          maxQueueItems: Infinity,
        });

        expect(queue.items.length).toBe(3);
        expect(prettyQueue(queue)).toMatchInlineSnapshot(`
            [
              "he:C:c (🌱 NEW SKILL)",
              "he:B:b (🌱 NEW SKILL)",
              "he:A:a (🟥 BLOCKED)",
            ]
          `);
      },
    );
  });

  describe(`SkillKind.HanziWordToGloss skills`, () => {
    skillTest(
      `works for 好`,
      async ({ decompositionData, dictionary, charactersJson }) => {
        const graph = skillLearningGraph({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [`he:好:good`],
        });
        const queue = skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
          recentSkillRatingEvents: recentSkillRatingEvents(),
          dictionary,
        });

        expect(prettyQueue(queue)).toMatchInlineSnapshot(`
            [
              "he:一:one (🌱 NEW SKILL)",
              "he:女:woman (🌱 NEW SKILL)",
              "he:亅:hook (🌱 NEW SKILL)",
              "he:了:done (🟥 BLOCKED)",
              "he:子:child (🟥 BLOCKED)",
              "he:好:good (🟥 BLOCKED)",
            ]
          `);
      },
    );

    skillTest(
      `learns the word form of component-form first`,
      async ({ decompositionData, dictionary, charactersJson }) => {
        const graph = skillLearningGraph({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [`he:汉:chinese`],
        });

        const queue = skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
          recentSkillRatingEvents: recentSkillRatingEvents(),
          dictionary,
        });

        // `he:水:water` learned because of 氵
        expect(prettyQueue(queue)).toMatchInlineSnapshot(`
              [
                "he:又:again (🌱 NEW SKILL)",
                "he:氵:water (🌱 NEW SKILL)",
                "he:汉:chinese (🟥 BLOCKED)",
              ]
            `);
      },
    );

    skillTest(
      `incorrect answers in a quiz don't get scheduled prematurely`,
      async ({ decompositionData, dictionary, charactersJson }) => {
        vi.useFakeTimers({ toFake: [`Date`] });

        // There was a bug where "wrong answers" were being scheduled for review
        // even though they'd never been introduced yet. This is a regression test
        // against that scenario.

        const queue = await simulateSkillReviews({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [`he:分:divide`],
          history: [
            // first question is he:八:eight but they get it wrong. 𠃌 is one of the
            // wrong choices they submit so it's also marked wrong.
            `❌hanziGloss 八 radical`,
            `💤 1h`, // wait past he:𠃌:radical due date
          ],
        });

        expect(prettyQueue(queue)).toMatchInlineSnapshot(`
            [
              "he:八:eight (🌱 NEW SKILL)",
              "he:丿:slash (🌱 NEW SKILL)",
              "he:𠃌:radical (🌱 NEW SKILL)",
              "he:刀:knife (🟥 BLOCKED)",
              "he:分:divide (🟥 BLOCKED)",
            ]
          `);

        // Make sure 𠃌 didn't jump the queue before 八 because it hasn't been
        // introduced yet, instead they should have to answer 八 again.
        const 𠃌Index = queue.items.findIndex(
          ({ skill }) => skill === `he:𠃌:radical`,
        );
        const 八Index = queue.items.findIndex(
          ({ skill }) => skill === `he:八:eight`,
        );

        // he:八:eight should be scheduled before he:𠃌:radical
        expect(𠃌Index).toBeGreaterThan(八Index);
      },
    );

    skillTest(
      `learns new skills before not-due skills (stable sorted to maintain graph order)`,
      async ({ decompositionData, dictionary, charactersJson }) => {
        const queue = await simulateSkillReviews({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [`he:分:divide`],
          history: [`🟡 he:丿:slash`, `💤 1m`],
        });

        expect(prettyQueue(queue)).toMatchInlineSnapshot(`
            [
              "he:八:eight (🌱 NEW SKILL)",
              "he:𠃌:radical (🌱 NEW SKILL)",
              "he:丿:slash",
              "he:刀:knife (🟥 BLOCKED)",
              "he:分:divide (🟥 BLOCKED)",
            ]
          `);
      },
    );

    skillTest(
      `skills unblock dependant skills when they become stable enough`,
      async ({ decompositionData, dictionary, charactersJson }) => {
        vi.useFakeTimers({ toFake: [`Date`] });

        const targetSkills: Skill[] = [`he:刀:knife`];
        const history: HistoryCommand[] = [];

        {
          const queue = await simulateSkillReviews({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills,
            history,
          });
          // `he:刀:knife` starts blocked
          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
              [
                "he:丿:slash (🌱 NEW SKILL)",
                "he:𠃌:radical (🌱 NEW SKILL)",
                "he:刀:knife (🟥 BLOCKED)",
              ]
            `);
        }

        history.push(`💤 1d`, `🟢 he:丿:slash`, `🟢 he:𠃌:radical`);

        {
          const queue = await simulateSkillReviews({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills,
            history,
          });
          // Still blocked, but the other two skills aren't new anymore.
          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
              [
                "he:𠃌:radical",
                "he:丿:slash",
                "he:刀:knife (🟥 BLOCKED)",
              ]
            `);
        }

        history.push(`💤 1d`, `🟢 he:丿:slash`, `🟢 he:𠃌:radical`);

        {
          const queue = await simulateSkillReviews({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills,
            history,
          });
          // Still growing in stability but still blocked.
          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
              [
                "he:丿:slash",
                "he:𠃌:radical",
                "he:刀:knife (🟥 BLOCKED)",
              ]
            `);
        }

        history.push(`💤 1d`, `🟢 he:丿:slash`, `🟢 he:𠃌:radical`);

        {
          const queue = await simulateSkillReviews({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills,
            history,
          });
          // Still growing in stability but still blocked.
          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
              [
                "he:𠃌:radical",
                "he:丿:slash",
                "he:刀:knife (🟥 BLOCKED)",
              ]
            `);
        }

        history.push(`💤 1d`, `🟢 he:丿:slash`, `💤 10s`, `🟢 he:𠃌:radical`);

        {
          const queue = await simulateSkillReviews({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills,
            history,
          });
          // Now unblocked because the dependencies are stable enough.
          expect(prettyQueue(queue)).toContainEqual(
            `he:刀:knife (🌱 NEW SKILL)`,
          );
        }
      },
    );

    skillTest(
      `doesn't get stuck reviewing the same skill after all due skills are done`,
      async ({ decompositionData, dictionary, charactersJson }) => {
        vi.useFakeTimers({ toFake: [`Date`] });

        const targetSkills: Skill[] = [`he:分:divide`];
        const history: HistoryCommand[] = [
          `❌ he:𠃌:radical`, // Get it wrong initially (so after all the reviews it will have lower "stability" than the others).
          `💤 5s`,
          `🟡 he:𠃌:radical`, // Then answer it correctly.
          `💤 5s`,
          `🟡 he:刀:knife`,
          `💤 5s`,
          `🟡 he:八:eight`,
          `💤 5s`,
          `🟡 he:分:divide`,
          `💤 5s`,
          `🟡 he:丿:slash`,
        ];

        let queue = await simulateSkillReviews({
          decompositionData,
          dictionary,
          charactersJson,
          targetSkills,
          history,
        });
        let review1 = queue.items[0];

        // If he:𠃌:radical is the next review, then answer it correctly and
        // move to the next item in the queue.
        if (review1?.skill === `he:𠃌:radical`) {
          history.push(`💤 5s`, `🟡 he:𠃌:radical`);
          queue = await simulateSkillReviews({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills,
            history,
          });
          review1 = queue.items[0];
        }

        // Doesn't get stuck reviewing he:𠃌:radical just because it had a lower stability.
        expect([review1?.skill]).not.toEqual([`he:𠃌:radical`]);
        expect(queue.items.map(({ skill }) => skill)).toContain(
          `he:𠃌:radical`,
        );
      },
    );

    skillTest(
      `skills that are stale (heavily over-due and not stable) are treated as new skills`,
      async ({ decompositionData, dictionary, charactersJson }) => {
        vi.useFakeTimers({ toFake: [`Date`] });

        const targetSkills: Skill[] = [`he:刀:knife`];
        const history: HistoryCommand[] = [
          `❌ he:刀:knife`, // Get it wrong initially so it's considered introduced but not very stable.
          `💤 1h`, // Wait a short time so we can test that it's actually scheduled first again (base case).
        ];

        {
          const queue = await simulateSkillReviews({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills,
            history,
          });
          // he:丿:slash and he:𠃌:radical should come later because he:刀:knife is due.
          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
              [
                "he:刀:knife (⚠️ RETRY)",
                "he:丿:slash (🌱 NEW SKILL)",
                "he:𠃌:radical (🌱 NEW SKILL)",
              ]
            `);
          expect(queue).toMatchObject({
            blockedCount: 0,
            retryCount: 1,
            dueCount: 0,
            overDueCount: 0,
            newContentCount: 2,
            newDifficultyCount: 0,
          });
        }

        history.push(`💤 100d`); // Wait a long time without reviewing it, so it's essentially stale.

        {
          const queue = await simulateSkillReviews({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills,
            history,
          });
          // he:刀:knife comes last because it's "stale" and reset to new.
          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
              [
                "he:丿:slash (🌱 NEW SKILL)",
                "he:𠃌:radical (🌱 NEW SKILL)",
                "he:刀:knife (🟥 BLOCKED)",
              ]
            `);
          expect(queue).toMatchObject({
            blockedCount: 1,
            retryCount: 0,
            dueCount: 0,
            overDueCount: 0,
            newContentCount: 2,
            newDifficultyCount: 0,
          });
        }
      },
    );

    describe(`retry logic`, () => {
      function remediatorContext(
        dictionary: Dictionary,
      ): SkillReviewQueueRemediatorContext {
        return {
          dictionary,
          config: {
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
          },
        };
      }

      function failedEvent(
        skill: Skill,
        pinyinMistake?: string,
      ): SkillReviewQueueRatingEvent {
        return {
          id: `test-${skill}`,
          skill,
          rating: Rating.Again,
          createdAt: new Date(`2026-10-27T00:00:00.000Z`),
          pinyinMistake,
        };
      }

      skillTest(
        `writing remediator creates a configurable repeated-practice plan`,
        ({ dictionary }) => {
          const writingSkill = hanziCharacterToWriting(`好` as HanziCharacter);
          const ordinarySkill = `he:好:good` as Skill;
          expect(
            writingSkillReviewQueueRemediator(
              failedEvent(writingSkill),
              remediatorContext(dictionary),
            ),
          ).toEqual([
            {
              skill: writingSkill,
              successfulAttempts: 5,
              flag: { kind: QuestionFlagKind.WeakWord },
            },
          ]);
          expect(
            writingSkillReviewQueueRemediator(
              failedEvent(ordinarySkill),
              remediatorContext(dictionary),
            ),
          ).toBeNull();
        },
      );

      skillTest(
        `wrong-initial remediator queues initial practice before typed pinyin`,
        ({ dictionary }) => {
          const typedSkill = `hp:好:good` as Skill;
          expect(
            wrongPinyinInitialSkillReviewQueueRemediator(
              failedEvent(typedSkill, `nǎo`),
              remediatorContext(dictionary),
            ),
          ).toEqual([
            {
              skill: `hpi:好:good`,
              successfulAttempts: 3,
              flag: { kind: QuestionFlagKind.WeakWord },
            },
            {
              skill: typedSkill,
              successfulAttempts: 1,
              flag: { kind: QuestionFlagKind.WeakWord },
            },
          ]);
          expect(
            wrongPinyinInitialSkillReviewQueueRemediator(
              failedEvent(typedSkill, `hàn`),
              remediatorContext(dictionary),
            ),
          ).toBeNull();
        },
      );

      skillTest(
        `wrong-final remediator queues final practice before typed pinyin`,
        ({ dictionary }) => {
          const typedSkill = `hp:好:good` as Skill;
          expect(
            wrongPinyinFinalSkillReviewQueueRemediator(
              failedEvent(typedSkill, `hǎi`),
              remediatorContext(dictionary),
            ),
          ).toEqual([
            {
              skill: `hpf:好:good`,
              successfulAttempts: 3,
              flag: { kind: QuestionFlagKind.WeakWord },
            },
            {
              skill: typedSkill,
              successfulAttempts: 1,
              flag: { kind: QuestionFlagKind.WeakWord },
            },
          ]);
          expect(
            wrongPinyinFinalSkillReviewQueueRemediator(
              failedEvent(typedSkill, `hāo`),
              remediatorContext(dictionary),
            ),
          ).toBeNull();
        },
      );

      skillTest(
        `wrong-tone remediator queues tone practice before typed pinyin`,
        ({ dictionary }) => {
          const typedSkill = `hp:好:good` as Skill;
          expect(
            wrongPinyinToneSkillReviewQueueRemediator(
              failedEvent(typedSkill, `hāo`),
              remediatorContext(dictionary),
            ),
          ).toEqual([
            {
              skill: `hpt:好:good`,
              successfulAttempts: 3,
              flag: { kind: QuestionFlagKind.WeakWord },
            },
            {
              skill: typedSkill,
              successfulAttempts: 1,
              flag: { kind: QuestionFlagKind.WeakWord },
            },
          ]);
          expect(
            wrongPinyinToneSkillReviewQueueRemediator(
              failedEvent(typedSkill, `hǎi`),
              remediatorContext(dictionary),
            ),
          ).toBeNull();
        },
      );

      skillTest(
        `composes initial, final, and tone practice in that order`,
        ({ dictionary }) => {
          const typedSkill = `hp:好:good` as Skill;
          expect(
            typedPinyinComponentSkillReviewQueueRemediator(
              failedEvent(typedSkill, `nàn`),
              remediatorContext(dictionary),
            ),
          ).toEqual([
            {
              skill: `hpi:好:good`,
              successfulAttempts: 3,
              flag: { kind: QuestionFlagKind.WeakWord },
            },
            {
              skill: `hpf:好:good`,
              successfulAttempts: 3,
              flag: { kind: QuestionFlagKind.WeakWord },
            },
            {
              skill: `hpt:好:good`,
              successfulAttempts: 3,
              flag: { kind: QuestionFlagKind.WeakWord },
            },
            {
              skill: typedSkill,
              successfulAttempts: 1,
              flag: { kind: QuestionFlagKind.WeakWord },
            },
          ]);
        },
      );

      skillTest(
        `fallback remediator retries unmatched failures once`,
        ({ dictionary }) => {
          const ordinarySkill = `he:好:good` as Skill;
          expect(
            retryFailedSkillReviewQueueRemediator(
              failedEvent(ordinarySkill),
              remediatorContext(dictionary),
            ),
          ).toEqual([{ skill: ordinarySkill, successfulAttempts: 1 }]);
        },
      );

      test(`runs specialized remediators before the fallback`, () => {
        expect(skillReviewQueueRemediators).toEqual([
          writingSkillReviewQueueRemediator,
          typedPinyinComponentSkillReviewQueueRemediator,
          retryFailedSkillReviewQueueRemediator,
        ]);
      });

      skillTest(
        `skills that were just failed should stay first in queue (so you retry it immediately)`,
        async ({ decompositionData, dictionary, charactersJson }) => {
          vi.useFakeTimers({ toFake: [`Date`] });

          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`he:八:eight`, `he:丿:slash`],
          });

          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map([
              [`he:八:eight`, mockSrsState(时`-1d`, 时`-5m`)],
              [`he:丿:slash`, mockSrsState(时`-1d`, 时`-3m`)],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents({
              "he:丿:slash": [Rating.Again, 时`-1m`],
            }),
            dictionary,
          });

          // he:丿:slash should be hoisted first for retry
          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
                [
                  "he:丿:slash (⚠️ RETRY)",
                  "he:八:eight",
                ]
              `);

          expect(queue).toMatchObject({
            blockedCount: 0,
            dueCount: 1,
            newContentCount: 0,
            newDifficultyCount: 0,
            overDueCount: 0,
            retryCount: 1,
          });
        },
      );

      skillTest(
        `failed skills that are not introduced are not promoted`,
        async ({ decompositionData, dictionary, charactersJson }) => {
          vi.useFakeTimers({ toFake: [`Date`] });

          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`he:八:eight`, `he:丿:slash`],
          });

          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map([
              [`he:八:eight`, mockSrsState(时`-1d`, 时`-5m`)],
            ]),
            recentSkillRatingEvents: [
              {
                id: `never-introduced`,
                skill: `he:丿:slash`,
                rating: Rating.Again,
                createdAt: new Date(),
              },
            ],
            dictionary,
          });

          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
                [
                  "he:八:eight",
                  "he:丿:slash (🌱 NEW SKILL)",
                ]
              `);
          expect(queue).toMatchObject({
            blockedCount: 0,
            dueCount: 1,
            newContentCount: 1,
            newDifficultyCount: 0,
            overDueCount: 0,
            retryCount: 0,
          });
        },
      );

      skillTest(
        `multiple failed skills are prioritised in most-recent first`,
        async ({ decompositionData, dictionary, charactersJson }) => {
          vi.useFakeTimers({ toFake: [`Date`] });

          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`he:八:eight`, `he:丿:slash`],
          });

          {
            const queue = skillReviewQueue({
              graph,
              skillSrsStates: new Map([
                [`he:八:eight`, mockSrsState(时`-1d`, 时`-5m`)],
                [`he:丿:slash`, mockSrsState(时`-1d`, 时`-5m`)],
              ]),
              recentSkillRatingEvents: recentSkillRatingEvents({
                "he:八:eight": [Rating.Again, 时`-1m`],
                "he:丿:slash": [Rating.Again, 时`-2m`],
              }),
              dictionary,
            });
            expect(prettyQueue(queue)).toEqual([`he:八:eight (⚠️ RETRY)`]);
            expect(queue).toMatchObject({
              blockedCount: 0,
              dueCount: 0,
              newContentCount: 0,
              newDifficultyCount: 0,
              overDueCount: 0,
              retryCount: 2,
            });
          }

          // try in reverse order
          {
            const queue = skillReviewQueue({
              graph,
              skillSrsStates: new Map([
                [`he:八:eight`, mockSrsState(时`-1d`, 时`-5m`)],
                [`he:丿:slash`, mockSrsState(时`-1d`, 时`-5m`)],
              ]),
              recentSkillRatingEvents: recentSkillRatingEvents({
                "he:八:eight": [Rating.Again, 时`-2m`],
                "he:丿:slash": [Rating.Again, 时`-1m`],
              }),
              dictionary,
            });
            expect(prettyQueue(queue)).toEqual([`he:丿:slash (⚠️ RETRY)`]);
            expect(queue).toMatchObject({
              blockedCount: 0,
              dueCount: 0,
              newContentCount: 0,
              newDifficultyCount: 0,
              overDueCount: 0,
              retryCount: 2,
            });
          }
        },
      );

      skillTest(
        `writing remediation counts correct repetitions and keeps progress after another mistake`,
        ({ decompositionData, dictionary, charactersJson }) => {
          vi.useFakeTimers({ toFake: [`Date`] });
          vi.setSystemTime(new Date(`2026-10-27T00:00:00.000Z`));
          const now = new Date();
          const writingSkill = hanziCharacterToWriting(`好` as HanziCharacter);
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [writingSkill],
          });
          const event = (id: string, rating: Rating, minutesAgo: number) => ({
            id,
            skill: writingSkill,
            rating,
            createdAt: new Date(
              now.getTime() - ms(`${minutesAgo}m` as ms.StringValue),
            ),
          });
          const commonOptions = {
            graph,
            skillSrsStates: new Map<Skill, SrsStateType>([
              [writingSkill, mockSrsState(ms(`-1d`), ms(`-5m`))],
            ]),
            dictionary,
            now,
            remediationConfig: { writingSuccessfulAttempts: 5 },
          };

          const events = [
            event(`1`, Rating.Again, 8),
            event(`2`, Rating.Good, 7),
            event(`2`, Rating.Good, 7),
            event(`3`, Rating.Good, 6),
            event(`4`, Rating.Again, 5),
            event(`5`, Rating.Good, 4),
            event(`6`, Rating.Good, 3),
            event(`7`, Rating.Good, 2),
          ];
          const partialQueue = skillReviewQueue({
            ...commonOptions,
            recentSkillRatingEvents: events.slice(0, 7),
          });
          expect(prettyQueue(partialQueue)[0]).toBe(
            `${writingSkill} (📉 WEAK WORD)`,
          );
          expect(partialQueue.retryCount).toBe(1);

          const completedQueue = skillReviewQueue({
            ...commonOptions,
            recentSkillRatingEvents: events,
          });
          expect(completedQueue.retryCount).toBe(0);
        },
      );

      skillTest(
        `wrong typed-pinyin initials schedule initial practice before typed-pinyin retry`,
        ({ decompositionData, dictionary, charactersJson }) => {
          vi.useFakeTimers({ toFake: [`Date`] });
          vi.setSystemTime(new Date(`2026-10-27T00:00:00.000Z`));
          const now = new Date();
          const typedSkill = `hp:好:good` as Skill;
          const initialSkill = `hpi:好:good` as Skill;
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [typedSkill],
          });

          const remediationConfig = {
            typedPinyinWrongInitial: {
              initialSuccessfulAttempts: 3,
              typedSuccessfulAttempts: 1,
            },
          };
          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map<Skill, SrsStateType>([
              [typedSkill, mockSrsState(ms(`-1d`), ms(`-5m`))],
            ]),
            dictionary,
            now,
            recentSkillRatingEvents: [
              {
                id: `1`,
                skill: typedSkill,
                rating: Rating.Again,
                createdAt: new Date(now.getTime() - ms(`3m`)),
                pinyinMistake: `nǎo`,
              },
            ],
            remediationConfig,
          });

          expect(prettyQueue(queue)[0]).toBe(`${initialSkill} (📉 WEAK WORD)`);

          const sameInitialQueue = skillReviewQueue({
            graph,
            skillSrsStates: new Map<Skill, SrsStateType>([
              [typedSkill, mockSrsState(ms(`-1d`), ms(`-5m`))],
            ]),
            dictionary,
            now,
            recentSkillRatingEvents: [
              {
                id: `2`,
                skill: typedSkill,
                rating: Rating.Again,
                createdAt: new Date(now.getTime() - ms(`3m`)),
                pinyinMistake: `hàn`,
              },
            ],
            remediationConfig,
          });

          expect(prettyQueue(sameInitialQueue)[0]).toBe(
            `${typedSkill} (⚠️ RETRY)`,
          );
        },
      );

      skillTest(
        `replays configured initial, final, and tone practice in order`,
        ({ decompositionData, dictionary, charactersJson }) => {
          vi.useFakeTimers({ toFake: [`Date`] });
          vi.setSystemTime(new Date(`2026-10-27T00:00:00.000Z`));
          const now = new Date();
          const typedSkill = `hp:好:good` as Skill;
          const initialSkill = `hpi:好:good` as Skill;
          const finalSkill = `hpf:好:good` as Skill;
          const toneSkill = `hpt:好:good` as Skill;
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [typedSkill],
          });
          const remediationConfig = {
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
          };
          const event = (
            id: string,
            skill: Skill,
            rating: Rating,
            minutesAgo: number,
            pinyinMistake?: string,
          ) => ({
            id,
            skill,
            rating,
            createdAt: new Date(now.getTime() - ms(`${minutesAgo}m`)),
            pinyinMistake,
          });
          const events = [
            event(`1`, typedSkill, Rating.Again, 12, `nàn`),
            event(`2`, initialSkill, Rating.Good, 11),
            event(`3`, initialSkill, Rating.Good, 10),
            event(`4`, initialSkill, Rating.Good, 9),
            event(`5`, finalSkill, Rating.Good, 8),
            event(`6`, finalSkill, Rating.Good, 7),
            event(`7`, finalSkill, Rating.Good, 6),
            event(`8`, toneSkill, Rating.Good, 5),
            event(`9`, toneSkill, Rating.Good, 4),
            event(`10`, toneSkill, Rating.Good, 3),
          ];
          const queueOptions = {
            graph,
            skillSrsStates: new Map<Skill, SrsStateType>([
              [typedSkill, mockSrsState(ms(`-1d`), ms(`-5m`))],
            ]),
            dictionary,
            now,
            remediationConfig,
          };

          expect(
            prettyQueue(
              skillReviewQueue({
                ...queueOptions,
                recentSkillRatingEvents: events.slice(0, 1),
              }),
            )[0],
          ).toBe(`${initialSkill} (📉 WEAK WORD)`);
          expect(
            prettyQueue(
              skillReviewQueue({
                ...queueOptions,
                recentSkillRatingEvents: events.slice(0, 4),
              }),
            )[0],
          ).toBe(`${finalSkill} (📉 WEAK WORD)`);
          expect(
            prettyQueue(
              skillReviewQueue({
                ...queueOptions,
                recentSkillRatingEvents: events.slice(0, 7),
              }),
            )[0],
          ).toBe(`${toneSkill} (📉 WEAK WORD)`);
          expect(
            prettyQueue(
              skillReviewQueue({
                ...queueOptions,
                recentSkillRatingEvents: events,
              }),
            )[0],
          ).toBe(`${typedSkill} (📉 WEAK WORD)`);
        },
      );

      skillTest(
        `nested remediation resumes its parent and repeated initial errors do not recurse`,
        ({ decompositionData, dictionary, charactersJson }) => {
          vi.useFakeTimers({ toFake: [`Date`] });
          vi.setSystemTime(new Date(`2026-10-27T00:00:00.000Z`));
          const now = new Date();
          const typedSkill = `hp:好:good` as Skill;
          const initialSkill = `hpi:好:good` as Skill;
          const unrelatedSkill = `he:刀:knife` as Skill;
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [typedSkill, unrelatedSkill],
          });
          const ratingEvent = (
            id: string,
            skill: Skill,
            rating: Rating,
            minutesAgo: number,
            pinyinMistake?: string,
          ) => ({
            id,
            skill,
            rating,
            createdAt: new Date(
              now.getTime() - ms(`${minutesAgo}m` as ms.StringValue),
            ),
            pinyinMistake,
          });
          const config = {
            typedPinyinWrongInitial: {
              initialSuccessfulAttempts: 2,
              typedSuccessfulAttempts: 1,
            },
          };
          const options = {
            graph,
            skillSrsStates: new Map<Skill, SrsStateType>([
              [typedSkill, mockSrsState(ms(`-1d`), ms(`-5m`))],
              [unrelatedSkill, mockSrsState(ms(`-1d`), ms(`-5m`))],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents(),
            dictionary,
            now,
            remediationConfig: config,
          };

          const whileNested = skillReviewQueue({
            ...options,
            recentSkillRatingEvents: [
              ratingEvent(`1`, typedSkill, Rating.Again, 6, `nǎo`),
              ratingEvent(`2`, initialSkill, Rating.Again, 5),
              ratingEvent(`3`, unrelatedSkill, Rating.Again, 4),
              ratingEvent(`4`, unrelatedSkill, Rating.Good, 3),
              ratingEvent(`5`, initialSkill, Rating.Good, 2),
            ],
          });
          expect(prettyQueue(whileNested)[0]).toBe(
            `${initialSkill} (📉 WEAK WORD)`,
          );

          const parentResumed = skillReviewQueue({
            ...options,
            recentSkillRatingEvents: [
              ratingEvent(`1`, typedSkill, Rating.Again, 6, `nǎo`),
              ratingEvent(`2`, initialSkill, Rating.Again, 5),
              ratingEvent(`3`, unrelatedSkill, Rating.Again, 4),
              ratingEvent(`4`, unrelatedSkill, Rating.Good, 3),
              ratingEvent(`5`, initialSkill, Rating.Good, 2),
              ratingEvent(`6`, initialSkill, Rating.Good, 1),
            ],
          });
          expect(prettyQueue(parentResumed)[0]).toBe(
            `${typedSkill} (📉 WEAK WORD)`,
          );
        },
      );

      skillTest(
        `remediation ignores failures older than its rolling history window`,
        ({ decompositionData, dictionary, charactersJson }) => {
          vi.useFakeTimers({ toFake: [`Date`] });
          vi.setSystemTime(new Date(`2026-10-27T00:00:00.000Z`));
          const now = new Date();
          const writingSkill = hanziCharacterToWriting(`好` as HanziCharacter);
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [writingSkill],
          });
          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map<Skill, SrsStateType>([
              [writingSkill, mockSrsState(ms(`-1d`), ms(`-5m`))],
            ]),
            dictionary,
            now,
            recentSkillRatingEvents: [
              {
                id: `old`,
                skill: writingSkill,
                rating: Rating.Again,
                createdAt: new Date(now.getTime() - ms(`25h`)),
              },
            ],
            remediationConfig: { writingSuccessfulAttempts: 5 },
          });

          expect(
            queue.items.some(
              ({ skill, flag }) =>
                skill === writingSkill &&
                flag?.kind === QuestionFlagKind.WeakWord,
            ),
          ).toBe(false);
        },
      );
    });

    describe(`pronunciation skill prioritization after successful hanzi-to-english`, () => {
      skillTest(
        `prioritizes pronunciation skill after successful he: review if user has reached rank 1`,
        async ({ decompositionData, dictionary, charactersJson }) => {
          vi.useFakeTimers({ toFake: [`Date`] });

          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [
              `he:好:good`,
              `hp:好:good`,
              `he:人:person`,
              `he:八:eight`,
            ],
          });

          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map<Skill, SrsStateType>([
              // Multiple skills are due for review at different times
              [`he:好:good`, mockSrsState(时`-1d`, 时`-5m`)],
              [`hp:好:good`, mockSrsState(时`-1d`, 时`-10m`)], // More overdue
              [`he:人:person`, mockSrsState(时`-1d`, 时`-3m`)], // Less overdue than hp:好:good
              [`he:八:eight`, mockSrsState(时`-1d`, 时`-8m`)], // More overdue than hp:好:good
              // User has sufficient pronunciation competency (rank 1+)
              [
                `hpi:好:good`,
                {
                  kind: SrsKind.FsrsFourPointFive,
                  prevReviewAt: 时`-1d`,
                  nextReviewAt: 时`1h`,
                  stability: 35, // Above threshold for rank 1
                  difficulty: 5,
                },
              ],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents({
              "he:好:good": [Rating.Good, 时`-1m`], // Most recent successful HanziWordToGloss review
            }),
            dictionary,
          });

          // The pronunciation skill should be prioritized first, despite other skills being due
          expect(prettyQueue(queue)[0]).toEqual(`hp:好:good`);
          const 好Index = queue.items.findIndex(
            ({ skill }) => skill === `hp:好:good`,
          );
          const 八Index = queue.items.findIndex(
            ({ skill }) => skill === `he:八:eight`,
          );
          // Without prioritization, he:八:eight (-8m) would normally come before hp:好:good (-10m)
          // because due skills are sorted by most overdue first, but hp:好:good is prioritized
          expect(好Index).toBeLessThan(八Index);
          expect(prettyQueue(queue)).toContainEqual(`he:好:good`);
          expect(prettyQueue(queue)).toContainEqual(`he:人:person`);
        },
      );

      skillTest(
        `does not prioritize pronunciation skill if user has not reached rank 1`,
        async ({ decompositionData, dictionary, charactersJson }) => {
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [
              `he:好:good`,
              `hp:好:good`,
              `he:人:person`,
              `he:八:eight`,
            ],
          });

          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map<Skill, SrsStateType>([
              [`he:好:good`, mockSrsState(时`-1d`, 时`-5m`)],
              [`hp:好:good`, mockSrsState(时`-1d`, 时`-10m`)],
              [`he:人:person`, mockSrsState(时`-1d`, 时`-3m`)],
              [`he:八:eight`, mockSrsState(时`-1d`, 时`-8m`)],
              // User does not have sufficient pronunciation competency (rank < 1)
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents({
              "he:好:good": [Rating.Good, 时`-1m`],
            }),
            dictionary,
          });

          // Normal ordering should apply based on overdue time, no special prioritization
          const queueText = prettyQueue(queue);
          expect(queueText[0]).toEqual(`hp:好:good`); // most overdue (-10m)
          expect(queueText[1]).toEqual(`he:八:eight`); // second most overdue (-8m)
          expect(queueText[2]).toEqual(`he:好:good`); // third most overdue (-5m)
          expect(queueText[3]).toEqual(`he:人:person`); // least overdue (-3m)
        },
      );

      skillTest(
        `does not prioritize if no recent successful he: review`,
        async ({ decompositionData, dictionary, charactersJson }) => {
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [
              `he:好:good`,
              `hp:好:good`,
              `he:人:person`,
              `he:八:eight`,
            ],
          });

          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map<Skill, SrsStateType>([
              [`he:好:good`, mockSrsState(时`-1d`, 时`-5m`)],
              [`hp:好:good`, mockSrsState(时`-1d`, 时`-10m`)],
              [`he:人:person`, mockSrsState(时`-1d`, 时`-3m`)],
              [`he:八:eight`, mockSrsState(时`-1d`, 时`-8m`)],
              [
                `hpi:好:good`,
                {
                  kind: SrsKind.FsrsFourPointFive,
                  prevReviewAt: 时`-1d`,
                  nextReviewAt: 时`1h`,
                  stability: 35, // Above threshold for rank 1
                  difficulty: 5,
                },
              ],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents({
              "he:好:good": [Rating.Again, 时`-1m`], // No recent successful reviews - failed review instead
            }),
            dictionary,
          });

          const queueText = prettyQueue(queue);
          // Normal ordering should apply, he:好:good goes to retry section, others by overdue time
          expect(queueText[0]).toBe(`he:好:good (⚠️ RETRY)`); // retry comes first
          expect(queueText[1]).toBe(`hp:好:good`); // most overdue in due section
          expect(queueText[2]).toBe(`he:八:eight`); // second most overdue
          expect(queueText[3]).toBe(`he:人:person`); // least overdue
        },
      );

      skillTest(
        `prioritizes pronunciation skill even when it's in not-due section`,
        async ({ decompositionData, dictionary, charactersJson }) => {
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`he:好:good`, `hp:好:good`, `he:人:person`],
          });

          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map<Skill, SrsStateType>([
              // he:好:good is due
              [`he:好:good`, mockSrsState(时`-1d`, 时`-5m`)],
              // hp:好:good is not due yet (future due date)
              [`hp:好:good`, mockSrsState(时`-1d`, 时`+1h`)],
              // he:人:person is new (no SRS state)
              // User has sufficient pronunciation competency (rank 1+)
              [
                `hpi:好:good`,
                {
                  kind: SrsKind.FsrsFourPointFive,
                  prevReviewAt: 时`-1d`,
                  nextReviewAt: 时`1h`,
                  stability: 35, // Above threshold for rank 1
                  difficulty: 5,
                },
              ],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents({
              "he:好:good": [Rating.Good, 时`-1m`], // Most recent successful HanziWordToGloss review
            }),
            dictionary,
          });

          const queueText = prettyQueue(queue);
          // The pronunciation skill should be prioritized first, even though it was not due yet
          expect(queueText[0]).toEqual(`hp:好:good`);
          // The due skill comes after the prioritized pronunciation skill
          expect(queueText[1]).toEqual(`he:好:good`);
          // New skills follow
          expect(queueText).toContainEqual(`he:人:person (🌱 NEW SKILL)`);
        },
      );
    });

    skillTest(
      `prioritises due skills with highest value (rather than most over-due)`,
      async ({ decompositionData, dictionary, charactersJson }) => {
        const graph = skillLearningGraph({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [`he:分:divide`],
        });

        const queue = skillReviewQueue({
          graph,
          skillSrsStates: new Map([
            [`he:八:eight`, mockSrsState(时`-1d`, 时`-5m`)],
            [`he:刀:knife`, mockSrsState(时`-1d`, 时`-5m`)],
          ]),
          recentSkillRatingEvents: recentSkillRatingEvents(),
          dictionary,
        });
        expect(prettyQueue(queue)).toMatchInlineSnapshot(`
              [
                "he:八:eight",
                "he:刀:knife",
                "he:丿:slash (🌱 NEW SKILL)",
                "he:𠃌:radical (🌱 NEW SKILL)",
                "he:分:divide (🟥 BLOCKED)",
              ]
            `);
        expect(queue).toMatchObject({
          blockedCount: 1,
          dueCount: 2,
          newContentCount: 2,
          newDifficultyCount: 0,
          overDueCount: 0,
          retryCount: 0,
        });
      },
    );

    skillTest(
      `schedules new skills in dependency order`,
      async ({ decompositionData, dictionary, charactersJson }) => {
        const graph = skillLearningGraph({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [`he:分:divide`],
        });

        const queue = skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
          recentSkillRatingEvents: recentSkillRatingEvents(),
          dictionary,
        });
        expect(prettyQueue(queue)).toMatchInlineSnapshot(`
              [
                "he:八:eight (🌱 NEW SKILL)",
                "he:丿:slash (🌱 NEW SKILL)",
                "he:𠃌:radical (🌱 NEW SKILL)",
                "he:刀:knife (🟥 BLOCKED)",
                "he:分:divide (🟥 BLOCKED)",
              ]
            `);
      },
    );

    skillTest(
      `schedules skill reviews in order of due, and then deterministic random`,
      async ({ decompositionData, dictionary, charactersJson }) => {
        const graph = skillLearningGraph({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [`he:分:divide`, `he:一:one`],
        });

        const queue = skillReviewQueue({
          graph,
          skillSrsStates: new Map([
            [`he:一:one`, mockSrsState(时`-10m`, 时`-2h`)], // due two hours ago
            [`he:𠃌:radical`, mockSrsState(时`0s`, 时`-1h`)], // due one hour ago
            [`he:八:eight`, mockSrsState(时`-10m`, 时`1h`)], // due in one hour,
            [`he:刀:knife`, mockSrsState(时`-10m`, 时`2h`)], // due in two hours,
          ]),
          recentSkillRatingEvents: recentSkillRatingEvents(),
          dictionary,
        });
        expect(prettyQueue(queue)).toMatchInlineSnapshot(`
              [
                "he:一:one",
                "he:𠃌:radical",
                "he:丿:slash (🌱 NEW SKILL)",
                "he:八:eight",
                "he:刀:knife",
                "he:分:divide (🟥 BLOCKED)",
              ]
            `);
        expect(queue).toMatchObject({
          blockedCount: 1,
          dueCount: 2,
          newContentCount: 1,
          newDifficultyCount: 0,
          overDueCount: 0,
          retryCount: 0,
        });
      },
    );

    skillTest.todo(
      `throttles the number of new skills in the queue`,
      async ({ decompositionData, dictionary, charactersJson }) => {
        const graph = skillLearningGraph({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [
            `he:分:divide`,
            `he:一:one`,
            `he:一下儿:aBit`,
            `he:一些:some`,
            `he:一会儿:aWhile`,
            `he:一共:inTotal`,
            `he:一切:everything`,
            `he:一半:half`,
            `he:一块儿:together`,
            `he:一定:certainly`,
            `he:一方面:onOneHand`,
            `he:一样:same`,
            `he:一点儿:aLittle`,
            `he:一点点:aLittleBit`,
            `he:一生:lifetime`,
            `he:一直:continuously`,
            `he:一般:general`,
            `he:一起:together`,
            `he:一路平安:haveGoodTrip`,
            `he:一路顺风:journeysmooth`,
            `he:一边:side`,
            `he:一部分:part`,
          ],
        });

        // When there's no existing SRS state, you can learn 15 new skills.
        expect(
          skillReviewQueue({
            graph,
            skillSrsStates: new Map(),
            recentSkillRatingEvents: recentSkillRatingEvents(),
            dictionary,
          }),
        ).toMatchObject({
          dueCount: 0,
          newContentCount: 15,
          newDifficultyCount: 0,
          overDueCount: 0,
          retryCount: 0,
        });

        // When you have partially stablised some skills, that reduces the number
        // of new skills you can learn.
        expect(
          skillReviewQueue({
            graph,
            skillSrsStates: new Map([
              [`he:一:one`, mockSrsState(时`-10m`, 时`-2h`)], // due two hours ago
              [`he:𠃌:radical`, mockSrsState(时`0s`, 时`-1h`)], // due one hour ago
              [`he:八:eight`, mockSrsState(时`-10m`, 时`1h`)], // due in one hour,
              [`he:刀:knife`, mockSrsState(时`-10m`, 时`2h`)], // due in two hours,
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents(),
            dictionary,
          }),
        ).toMatchObject({
          dueCount: 2,
          newContentCount: 11,
          newDifficultyCount: 0,
          overDueCount: 0,
          retryCount: 0,
        });
      },
    );
  });

  describe(`SkillKind.HanziWordToGlossTyped skills`, () => {
    describe(`uses an OtherAnswer flag if the previous question was the same hanzi (for any hanzi->gloss type skill)`, () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: [`Date`] });
      });

      skillTest(
        `two meanings`,
        async ({ decompositionData, dictionary, charactersJson }) => {
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`het:好:good`, `het:好:like`],
          });
          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map([
              // 好:good was just reviewed, and 好:like is due, so it should be asked next.
              [`het:好:good`, fsrsSrsState(时`-1s`, 时`1d`, Rating.Good)],
              [`het:好:like`, fsrsSrsState(时`-1d`, 时`5m`, Rating.Good)],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents({
              // TODO refactor to combine with `skillSrsStates` to keep them consistent.
              "het:好:good": [Rating.Good, 时`-1s`],
              // "het:好:like": [Rating.Good, 时`-1d`],
            }),
            dictionary,
          });

          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
                [
                  "het:好:like (🔀 OTHER ANSWER past 好:good)",
                  "he:一:one (🌱 NEW SKILL)",
                  "he:女:woman (🌱 NEW SKILL)",
                  "he:亅:hook (🌱 NEW SKILL)",
                  "het:好:good",
                  "he:了:done (🟥 BLOCKED)",
                  "he:子:child (🟥 BLOCKED)",
                  "he:好:like (🟥 BLOCKED)",
                  "he:好:good (🟥 BLOCKED)",
                ]
              `);
        },
      );

      skillTest(
        `three meanings`,
        async ({ decompositionData, dictionary, charactersJson }) => {
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`het:任:any`, `het:任:appoint`, `het:任:duty`],
          });
          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map([
              [`het:任:any`, fsrsSrsState(时`-5s`, 时`5m`, Rating.Good)],
              [`het:任:appoint`, fsrsSrsState(时`-10s`, 时`6m`, Rating.Good)],
              [`het:任:duty`, fsrsSrsState(时`-1d`, 时`7m`, Rating.Good)],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents({
              // TODO refactor to combine with `skillSrsStates` to keep them consistent.
              "het:任:any": [Rating.Good, 时`-5s`],
              "het:任:appoint": [Rating.Good, 时`-10s`],
              // "het:任:duty": [Rating.Good, 时`-1d`],
            }),
            dictionary,
          });

          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
                [
                  "het:任:duty (🔀 OTHER ANSWER past 任:any,任:appoint)",
                  "he:亻:person (🌱 NEW SKILL)",
                  "het:任:any",
                  "het:任:appoint",
                  "he:任:duty (🟥 BLOCKED)",
                  "he:任:appoint (🟥 BLOCKED)",
                  "he:任:any (🟥 BLOCKED)",
                ]
              `);
        },
      );

      skillTest(
        `doesn't ask follow-up questions for skills that aren't introduced, even if they're in the graph`,
        async ({ decompositionData, dictionary, charactersJson }) => {
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`het:任:any`, `het:任:appoint`],
          });
          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map([
              [`het:任:any`, fsrsSrsState(时`-5s`, 时`5m`, Rating.Good)],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents({
              // TODO refactor to combine with `skillSrsStates` to keep them consistent.
              "het:任:any": [Rating.Good, 时`-5s`],
            }),
            dictionary,
          });

          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
                [
                  "he:亻:person (🌱 NEW SKILL)",
                  "het:任:any",
                  "he:任:appoint (🟥 BLOCKED)",
                  "he:任:any (🟥 BLOCKED)",
                  "het:任:appoint (🟥 BLOCKED)",
                ]
              `);
        },
      );
    });

    describe(`uses an OtherAnswer flag if the previous question was the same hanzi with a different pronunciation`, () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: [`Date`] });
      });

      skillTest(
        `two pronunciations`,
        ({ decompositionData, dictionary, charactersJson }) => {
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`hp:几:howMany`, `hp:几:table`],
          });
          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map([
              // 几:howMany was just reviewed, and 几:table is due, so it should be asked next.
              [`hp:几:howMany`, fsrsSrsState(时`-1s`, 时`1d`, Rating.Good)],
              [`hp:几:table`, fsrsSrsState(时`-1d`, 时`5m`, Rating.Good)],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents({
              "hp:几:howMany": [Rating.Good, 时`-1s`],
            }),
            dictionary,
          });

          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
                [
                  "hp:几:table (🔀 OTHER ANSWER past 几:howMany)",
                  "he:乙:second (🌱 NEW SKILL)",
                  "he:丿:slash (🌱 NEW SKILL)",
                  "hp:几:howMany",
                  "he:几:table (🟥 BLOCKED)",
                  "he:几:howMany (🟥 BLOCKED)",
                  "hpi:几:table (🟥 BLOCKED)",
                  "hpi:几:howMany (🟥 BLOCKED)",
                  "hpf:几:table (🟥 BLOCKED)",
                  "hpf:几:howMany (🟥 BLOCKED)",
                ]
              `);
        },
      );

      skillTest(
        `doesn't ask follow-up questions for skills that aren't introduced, even if they're in the graph`,
        ({ decompositionData, dictionary, charactersJson }) => {
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`hp:几:howMany`, `hp:几:table`],
          });
          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map([
              [`hp:几:howMany`, fsrsSrsState(时`-5s`, 时`5m`, Rating.Good)],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents({
              "hp:几:howMany": [Rating.Good, 时`-5s`],
            }),
            dictionary,
          });

          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
                [
                  "he:乙:second (🌱 NEW SKILL)",
                  "he:丿:slash (🌱 NEW SKILL)",
                  "hp:几:howMany",
                  "he:几:table (🟥 BLOCKED)",
                  "he:几:howMany (🟥 BLOCKED)",
                  "hpi:几:table (🟥 BLOCKED)",
                  "hpi:几:howMany (🟥 BLOCKED)",
                  "hpf:几:table (🟥 BLOCKED)",
                  "hpf:几:howMany (🟥 BLOCKED)",
                  "hp:几:table (🟥 BLOCKED)",
                ]
              `);
        },
      );

      skillTest(
        `doesn't queue reactive OtherAnswer if meanings share the same pinyin (e.g., 点:oClock and 点:point both use diǎn)`,
        ({ decompositionData, dictionary, charactersJson }) => {
          // Both 点:oClock and 点:point have the same pinyin "diǎn"
          // so answering one should NOT trigger an OtherAnswer reactive question
          const graph = skillLearningGraph({
            decompositionData,
            charactersJson,
            dictionary,
            targetSkills: [`hp:点:oClock`, `hp:点:point`],
          });
          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map([
              // 点:oClock was just reviewed, and 点:point is also introduced
              [`hp:点:oClock`, fsrsSrsState(时`-1s`, 时`1d`, Rating.Good)],
              [`hp:点:point`, fsrsSrsState(时`-1d`, 时`5m`, Rating.Good)],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents({
              "hp:点:oClock": [Rating.Good, 时`-1s`],
            }),
            dictionary,
          });

          // The queue should NOT have 点:point with an OtherAnswer flag
          // because both meanings have the same pinyin ("diǎn")
          const queueStrings = prettyQueue(queue);

          // Verify no "OTHER ANSWER" flag appears for 点
          for (const item of queueStrings) {
            if (item.includes(`点`)) {
              expect(item).not.toContain(`🔀 OTHER ANSWER`);
            }
          }
        },
      );
    });
  });

  describe(`SkillKind.HanziWordToPinyinTyped skills`, () => {
    skillTest(
      `doesn't learn pinyin for all constituents of a single character`,
      ({ decompositionData, dictionary, charactersJson }) => {
        const graph = skillLearningGraph({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [`hp:好:good`],
        });
        const queue = skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
          recentSkillRatingEvents: recentSkillRatingEvents(),
          dictionary,
        });

        const queueSkills = queue.items.map(({ skill }) => skill);
        expect(queueSkills).not.toContain(`hpi:女:woman`);
        expect(queueSkills).not.toContain(`hpi:子:child`);
      },
    );

    skillTest(
      `learns the pinyin for each character in multi-character words`,
      ({ decompositionData, dictionary, charactersJson }) => {
        const graph = skillLearningGraph({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [`hp:一样:same`],
        });

        const queue = skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
          recentSkillRatingEvents: recentSkillRatingEvents(),
          dictionary,
        });

        const isHpSkill = (s: Skill) =>
          skillKindFromSkill(s) === SkillKind.HanziWordToPinyinTyped;

        const onlyHpQueue = {
          items: queue.items.filter(({ skill }) => isHpSkill(skill)),
        };

        expect(prettyQueue(onlyHpQueue)).toMatchInlineSnapshot(`
              [
                "hp:样:shape (🟥 BLOCKED)",
                "hp:一:one (🟥 BLOCKED)",
                "hp:一样:same (🟥 BLOCKED)",
              ]
            `);
      },
    );

    skillTest(
      `schedules new skills in dependency order`,
      ({ decompositionData, dictionary, charactersJson }) => {
        const graph = skillLearningGraph({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [`hp:一点儿:aLittle`],
        });

        const queue = skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
          recentSkillRatingEvents: recentSkillRatingEvents(),
          dictionary,
        });
        expect(prettyQueue(queue)).toMatchInlineSnapshot(`
          [
            "he:口:mouth (🌱 NEW SKILL)",
            "he:灬:fire (🌱 NEW SKILL)",
            "he:一:one (🌱 NEW SKILL)",
            "he:丶:dot (🌱 NEW SKILL)",
            "he:丨:line (🌱 NEW SKILL)",
            "he:乚:hidden (🌱 NEW SKILL)",
            "he:丿:slash (🌱 NEW SKILL)",
            "he:卜:divine (🟥 BLOCKED)",
            "he:占:occupy (🟥 BLOCKED)",
            "he:儿:9mRvV (🟥 BLOCKED)",
            "he:点:oClock (🟥 BLOCKED)",
            "hpi:儿:9mRvV (🟥 BLOCKED)",
            "hpi:点:oClock (🟥 BLOCKED)",
            "hpi:一:one (🟥 BLOCKED)",
            "hpf:儿:9mRvV (🟥 BLOCKED)",
            "hpf:点:oClock (🟥 BLOCKED)",
            "hpf:一:one (🟥 BLOCKED)",
            "hp:儿:9mRvV (🟥 BLOCKED)",
            "hp:点:oClock (🟥 BLOCKED)",
            "hp:一:one (🟥 BLOCKED)",
            "he:一点儿:aLittle (🟥 BLOCKED)",
            "hp:一点儿:aLittle (🟥 BLOCKED)",
          ]
        `);
      },
    );

    skillTest(
      `treats non-introduced skills as "not stable" and won't dependant skills`,
      ({ decompositionData, dictionary, charactersJson }) => {
        const graph = skillLearningGraph({
          decompositionData,
          charactersJson,
          dictionary,
          targetSkills: [`hp:一:one`],
        });

        {
          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map(),
            recentSkillRatingEvents: recentSkillRatingEvents(),
            dictionary,
          });

          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
                [
                  "he:一:one (🌱 NEW SKILL)",
                  "hpi:一:one (🟥 BLOCKED)",
                  "hpf:一:one (🟥 BLOCKED)",
                  "hp:一:one (🟥 BLOCKED)",
                ]
              `);
        }

        {
          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map([
              [`he:一:one`, fsrsSrsState(时`-1d`, 时`-5m`, Rating.Good)],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents(),
            dictionary,
          });
          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
                [
                  "he:一:one",
                  "hpi:一:one (🌱 NEW SKILL)",
                  "hpf:一:one (🟥 BLOCKED)",
                  "hp:一:one (🟥 BLOCKED)",
                ]
              `);
          expect(queue).toMatchObject({
            blockedCount: 2,
            dueCount: 1,
            newContentCount: 1,
            newDifficultyCount: 0,
            overDueCount: 0,
            retryCount: 0,
          });
        }

        {
          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map([
              [`he:一:one`, fsrsSrsState(时`-1d`, 时`-6m`, Rating.Good)],
              [`hpi:一:one`, fsrsSrsState(时`-1d`, 时`-4m`, Rating.Good)],
            ]),
            recentSkillRatingEvents: recentSkillRatingEvents(),
            dictionary,
          });
          expect(prettyQueue(queue)).toMatchInlineSnapshot(`
                [
                  "he:一:one",
                  "hpi:一:one",
                  "hpf:一:one (📈 NEW DIFFICULTY)",
                  "hp:一:one (🟥 BLOCKED)",
                ]
              `);
          expect(queue).toMatchObject({
            blockedCount: 1,
            dueCount: 2,
            newContentCount: 0,
            newDifficultyCount: 1,
            overDueCount: 0,
            retryCount: 0,
          });
        }
      },
    );
  });
});

describe(`computeSkillRating suite`, () => {
  test(`includes duration and skill`, async () => {
    const skill = `he:我:i`;
    const durationMs = 1234;

    const rating = computeSkillRating({
      skill,
      durationMs,
      correct: true,
    });
    expect(rating).toMatchObject({ skill, durationMs });
  });

  describe(`SkillKind.HanziWordToGloss suites`, () => {
    const skill = `he:我:i`;

    test(`gives rating based on duration`, async () => {
      {
        const { rating } = computeSkillRating({
          skill,
          durationMs: 1000,
          correct: true,
        });
        expect(rating).toEqual(Rating.Easy);
      }

      {
        const { rating } = computeSkillRating({
          skill,
          durationMs: 6000,
          correct: true,
        });
        expect(rating).toEqual(Rating.Good);
      }

      {
        const { rating } = computeSkillRating({
          skill,
          durationMs: 11_000,
          correct: true,
        });
        expect(rating).toEqual(Rating.Hard);
      }
    });
  });
});

describe(`getHanziWordRank suite`, () => {
  function makeSkillSrsStates(
    skillStabilities: Record<Skill, /* stability */ number>,
  ): Map<Skill, SrsStateType> {
    return new Map<Skill, SrsStateType>(
      Object.entries(skillStabilities).map(([skill, stability]) => [
        skill as Skill,
        {
          kind: SrsKind.FsrsFourPointFive,
          prevReviewAt: 时`-1d`,
          nextReviewAt: 时`+1d`,
          stability,
          difficulty: 0,
        },
      ]),
    );
  }

  test(`it defaults to no rank`, async () => {
    expect(
      getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates: makeSkillSrsStates({}),
        rankRules,
      }),
    ).toEqual({ hanziWord: `一:one`, rank: 0, completion: 0 });
  });

  describe(`single skill per rank`, () => {
    const rankRules: RankRules = [
      {
        rank: 1,
        goals: [{ skill: SkillKind.HanziWordToGloss, stability: 50 }],
      },
      {
        rank: 2,
        goals: [{ skill: SkillKind.HanziWordToPinyinInitial, stability: 50 }],
      },
      {
        rank: 3,
        goals: [{ skill: SkillKind.HanziWordToPinyinFinal, stability: 50 }],
      },
    ];

    test(`no goals started, rank is 0`, async () => {
      const skillSrsStates = makeSkillSrsStates({});

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({ hanziWord: `一:one`, rank: 0, completion: 0 });
    });

    test(`rank 1 goals met, current rank is 2`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 50,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({ hanziWord: `一:one`, rank: 2, completion: 0 });
    });

    test(`rank 1 and 2 goals met, current rank is 3`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 50,
        "hpi:一:one": 50,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({ hanziWord: `一:one`, rank: 3, completion: 0 });
    });

    test(`rank 1 goals missed, but rank 2 goals met, current rank is 3`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 25,
        "hpi:一:one": 50,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({ hanziWord: `一:one`, rank: 3, completion: 0 });
    });

    test(`rank 1 goals not met, progress is fraction of stability`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 25,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({
        hanziWord: `一:one`,
        rank: 1,
        completion: 0.5,
      });
    });

    test(`rank 2 goals not met, progress is fraction of stability`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 50,
        "hpi:一:one": 10,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({
        hanziWord: `一:one`,
        rank: 2,
        completion: 0.2,
      });
    });

    test(`rank 3 goals not met, progress is fraction of stability`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 50,
        "hpi:一:one": 50,
        "hpf:一:one": 40,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({
        hanziWord: `一:one`,
        rank: 3,
        completion: 0.8,
      });
    });
  });

  describe(`multiple skills per rank`, () => {
    const rankRules: RankRules = [
      {
        rank: 1,
        goals: [{ skill: SkillKind.HanziWordToGloss, stability: 50 }],
      },
      {
        rank: 2,
        goals: [
          { skill: SkillKind.HanziWordToPinyinInitial, stability: 50 },
          { skill: SkillKind.HanziWordToPinyinFinal, stability: 50 },
        ],
      },
      {
        rank: 3,
        goals: [{ skill: SkillKind.HanziWordToPinyinTyped, stability: 50 }],
      },
    ];

    test(`no skills attempted, current rank is null`, async () => {
      const skillSrsStates = makeSkillSrsStates({});

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({ hanziWord: `一:one`, rank: 0, completion: 0 });
    });

    test(`rank 1 when the skill has been started`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 1,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({
        hanziWord: `一:one`,
        rank: 1,
        completion: 1 / 50,
      });
    });

    test(`rank 1 goals met, current rank is 2`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 50,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({ hanziWord: `一:one`, rank: 2, completion: 0 });
    });

    test(`rank 1 and 2 goals met, current rank is 3`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 50,
        "hpi:一:one": 50,
        "hpf:一:one": 50,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({ hanziWord: `一:one`, rank: 3, completion: 0 });
    });

    test(`rank 1 goals missed, but rank 2 goals met, current rank is 3`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 25,
        "hpi:一:one": 50,
        "hpf:一:one": 50,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({ hanziWord: `一:one`, rank: 3, completion: 0 });
    });

    test(`rank 2 goals not met, progress is fraction of stability`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 50,
        "hpi:一:one": 10,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({
        hanziWord: `一:one`,
        rank: 2,
        completion: 0.1,
      });
    });

    test(`rank 2 goals not fully met, but one skill is more advanced than required`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 50,
        "hpi:一:one": 100,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({
        hanziWord: `一:one`,
        rank: 2,
        completion: 0.5,
      });
    });

    test(`rank 3 goals not met, progress is fraction of stability`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 50,
        "hpi:一:one": 50,
        "hpf:一:one": 50,
        "hp:一:one": 20,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({
        hanziWord: `一:one`,
        rank: 3,
        completion: 0.4,
      });
    });
  });

  describe(`same skill with increased stability requirement in the next rank`, () => {
    const rankRules: RankRules = [
      {
        rank: 1,
        goals: [{ skill: SkillKind.HanziWordToGloss, stability: 50 }],
      },
      {
        rank: 2,
        goals: [{ skill: SkillKind.HanziWordToGloss, stability: 80 }],
      },
    ];

    test(`rank 1 goals met, partial rank 2 progress`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 65,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({
        hanziWord: `一:one`,
        rank: 2,
        completion: 0.5,
      });
    });
  });

  describe(`same skill with increased stability requirement in the a skipped rank`, () => {
    const rankRules: RankRules = [
      {
        rank: 1,
        goals: [{ skill: SkillKind.HanziWordToGloss, stability: 50 }],
      },
      {
        rank: 2,
        goals: [{ skill: SkillKind.HanziWordToPinyinInitial, stability: 50 }],
      },
      {
        rank: 3,
        goals: [{ skill: SkillKind.HanziWordToGloss, stability: 80 }],
      },
    ];

    test(`rank 1 goals met, partial rank 2 progress`, async () => {
      const skillSrsStates = makeSkillSrsStates({
        "he:一:one": 65,
        "hpi:一:one": 50,
      });

      const result = getHanziWordRank({
        hanziWord: `一:one`,
        skillSrsStates,
        rankRules,
      });

      expect(result).toEqual({
        hanziWord: `一:one`,
        rank: 3,
        completion: 0.5,
      });
    });
  });
});

test(`isHanziWordSkill suite`, () => {
  const skillKinds = Object.fromEntries(
    Object.values(SkillKind).map((skillKind) => [
      skillKind,
      isHanziWordSkill(`${rSkillKind().marshal(skillKind)}:___` as Skill),
    ]),
  );

  expect(skillKinds).toMatchInlineSnapshot(`
    {
      "debug--Deprecated": false,
      "debug--Deprecated_EnglishToRadical": false,
      "debug--Deprecated_PinyinToRadical": false,
      "debug--Deprecated_RadicalToEnglish": false,
      "debug--Deprecated_RadicalToPinyin": false,
      "debug--GlossToHanziWord": true,
      "debug--HanziCharacterToWriting": false,
      "debug--HanziWordToGloss": true,
      "debug--HanziWordToGlossTyped": true,
      "debug--HanziWordToPinyinFinal": true,
      "debug--HanziWordToPinyinInitial": true,
      "debug--HanziWordToPinyinTone": true,
      "debug--HanziWordToPinyinTyped": true,
      "debug--ImageToHanziWord": false,
      "debug--PinyinFinalAssociation": false,
      "debug--PinyinInitialAssociation": false,
      "debug--PinyinToHanziWord": false,
    }
  `);
});

test(`isHarderDifficultyStyleSkillKind suite`, () => {
  const skillKinds = Object.fromEntries(
    Object.values(SkillKind).map((skillKind) => [
      skillKind,
      isHarderDifficultyStyleSkillKind(skillKind),
    ]),
  );

  // These should be identified as harder difficulty
  expect(
    isHarderDifficultyStyleSkillKind(SkillKind.HanziWordToPinyinFinal),
  ).toBe(true);
  expect(
    isHarderDifficultyStyleSkillKind(SkillKind.HanziWordToPinyinTone),
  ).toBe(true);
  expect(
    isHarderDifficultyStyleSkillKind(SkillKind.HanziWordToPinyinTyped),
  ).toBe(true);

  // These should NOT be identified as harder difficulty
  expect(isHarderDifficultyStyleSkillKind(SkillKind.HanziWordToGloss)).toBe(
    false,
  );
  expect(isHarderDifficultyStyleSkillKind(SkillKind.GlossToHanziWord)).toBe(
    false,
  );

  expect(skillKinds).toMatchInlineSnapshot(`
    {
      "debug--Deprecated": false,
      "debug--Deprecated_EnglishToRadical": false,
      "debug--Deprecated_PinyinToRadical": false,
      "debug--Deprecated_RadicalToEnglish": false,
      "debug--Deprecated_RadicalToPinyin": false,
      "debug--GlossToHanziWord": false,
      "debug--HanziCharacterToWriting": false,
      "debug--HanziWordToGloss": false,
      "debug--HanziWordToGlossTyped": true,
      "debug--HanziWordToPinyinFinal": true,
      "debug--HanziWordToPinyinInitial": false,
      "debug--HanziWordToPinyinTone": true,
      "debug--HanziWordToPinyinTyped": true,
      "debug--ImageToHanziWord": false,
      "debug--PinyinFinalAssociation": false,
      "debug--PinyinInitialAssociation": false,
      "debug--PinyinToHanziWord": false,
    }
  `);
});

describe(`randomPickSkillsForReview suite`, () => {
  function monteCarloSample(
    stabilityValues: number[],
    numRuns = 10_000,
  ): number[] {
    invariant(vi.isFakeTimers(), `monteCarloSample requires fake timers`);

    const priorityCounts = new Map<Skill, number>([]);

    const inputs: [Skill, number][] = stabilityValues.map(
      (stability, index) => {
        const skill = `skill${index + 1}` as Skill;
        return [skill, stability];
      },
    );

    // Test with different PRNG seeds by varying stability slightly
    for (let run = 0; run < numRuns; run++) {
      // Tiny variation to change seed on each run to get different samples,
      // otherwise every sample would produce the same results and it wouldn't
      // be monte carlo.
      vi.advanceTimersByTime(1000);

      const skillStates: [Skill, SrsStateType][] = inputs.map(
        ([skill, stability]) => [
          skill,
          {
            kind: SrsKind.FsrsFourPointFive,
            prevReviewAt: 时`-1d`, // arbitrary
            nextReviewAt: 时`+1d`, // arbitrary
            stability,
            difficulty: 5, // arbitrary
          },
        ],
      );

      // Sort by priority (lower priority value = higher priority)
      const [topPrioritySkill] = randomPickSkillsForReview(skillStates);

      // Count which skill was top priority
      if (topPrioritySkill != null) {
        const currentCount = priorityCounts.get(topPrioritySkill) ?? 0;
        priorityCounts.set(topPrioritySkill, currentCount + 1);
      }
    }

    return inputs.map(([skill]) => (priorityCounts.get(skill) ?? 0) / numRuns);
  }

  test(`functional monte carlo testing`, () => {
    vi.useFakeTimers({ toFake: [`Date`] });

    // Actually perform monte carlo sampling to verify priority distribution
    // matches expectations.

    expect(monteCarloSample([10, 100])).toMatchInlineSnapshot(`
        [
          0.5527,
          0.4473,
        ]
      `);

    expect(monteCarloSample([100, 1000])).toMatchInlineSnapshot(`
        [
          0.5042,
          0.4958,
        ]
      `);

    // Increasing orders of magnitude, very high stability should still be
    // sampled occasionally, and lowest stability should be sampled often.
    expect(monteCarloSample([1, 10, 100, 1000, 10_000])).toMatchInlineSnapshot(`
          [
            0.4815,
            0.1412,
            0.1317,
            0.1249,
            0.1207,
          ]
        `);

    expect(
      monteCarloSample([1, 1, 10, 10, 100, 100, 1000, 1000, 10_000, 10_000]),
    ).toMatchInlineSnapshot(`
        [
          0.2159,
          0.2146,
          0.0774,
          0.0753,
          0.071,
          0.0683,
          0.0693,
          0.069,
          0.0674,
          0.0718,
        ]
      `);
  });

  test(`deterministic with same inputs`, () => {
    // Test that the function is deterministic when given the same inputs
    vi.useFakeTimers({ toFake: [`Date`] });

    const skill1 = `he:好:good` as Skill;
    const skill2 = `he:我:i` as Skill;
    const skill3 = `he:你:you` as Skill;

    const skillStates: [Skill, SrsStateType][] = [
      [
        skill1,
        {
          kind: SrsKind.FsrsFourPointFive,
          prevReviewAt: 时`-1d`,
          nextReviewAt: 时`+1d`,
          stability: 5,
          difficulty: 3,
        },
      ],
      [
        skill2,
        {
          kind: SrsKind.FsrsFourPointFive,
          prevReviewAt: 时`-1d`,
          nextReviewAt: 时`+1d`,
          stability: 10,
          difficulty: 4,
        },
      ],
      [
        skill3,
        {
          kind: SrsKind.FsrsFourPointFive,
          prevReviewAt: 时`-1d`,
          nextReviewAt: 时`+1d`,
          stability: 20,
          difficulty: 5,
        },
      ],
    ];

    // Call the function multiple times with identical inputs
    const result1 = randomPickSkillsForReview(skillStates);
    const result2 = randomPickSkillsForReview(skillStates);
    const result3 = randomPickSkillsForReview(skillStates);

    // Results should be identical (deterministic)
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);

    // And should contain all three skills
    expect(result1).toHaveLength(3);
    expect(result1.map((skill) => skill).sort()).toEqual(
      [skill1, skill2, skill3].sort(),
    );
  });

  test(`handles undefined SRS states`, () => {
    // Test that skills with undefined SRS states are processed correctly
    // (they get recallProbability = 0.5)

    // Use a fixed time for deterministic testing
    vi.useFakeTimers({ toFake: [`Date`] });

    const skill1 = `he:好:good` as Skill;
    const skill2 = `he:我:i` as Skill;

    const skillStates: [Skill, SrsStateType | undefined][] = [
      [
        skill1,
        {
          kind: SrsKind.FsrsFourPointFive,
          prevReviewAt: 时`-1d`,
          nextReviewAt: 时`+1d`,
          stability: 5,
          difficulty: 3,
        },
      ],
      [skill2, undefined], // No SRS state - should get recallProbability = 0.5
    ];

    const result = randomPickSkillsForReview(skillStates, Infinity);

    // Should contain both skills
    expect(result).toHaveLength(2);
    expect(result).toContain(skill1);
    expect(result).toContain(skill2);

    // With this specific seed and SRS states, verify deterministic ordering
    expect(result).toMatchInlineSnapshot(`
        [
          "he:好:good",
          "he:我:i",
        ]
      `);
  });
});

describe(`walkSkillAndDependencies suite`, () => {
  test(`walks single skill with no dependencies`, () => {
    const skill1 = `he:我:i` as Skill;

    const graph: SkillLearningGraph = new Map([
      [skill1, { skill: skill1, dependencies: new Set() }],
    ]);

    const result = [...walkSkillAndDependencies(graph, skill1)];
    expect(result).toEqual([skill1]);
  });

  test(`walks single skill with one dependency`, () => {
    const skill1 = `he:我:i` as Skill;
    const skill2 = `he:人:person` as Skill;

    const graph: SkillLearningGraph = new Map([
      [skill1, { skill: skill1, dependencies: new Set([skill2]) }],
      [skill2, { skill: skill2, dependencies: new Set() }],
    ]);

    const result = [...walkSkillAndDependencies(graph, skill1)];
    expect(result).toEqual([skill1, skill2]);
  });

  test(`walks skill with multiple dependencies`, () => {
    const skill1 = `he:我们:we` as Skill;
    const skill2 = `he:我:i` as Skill;
    const skill3 = `he:人:person` as Skill;

    const graph: SkillLearningGraph = new Map([
      [skill1, { skill: skill1, dependencies: new Set([skill2, skill3]) }],
      [skill2, { skill: skill2, dependencies: new Set() }],
      [skill3, { skill: skill3, dependencies: new Set() }],
    ]);

    const result = [...walkSkillAndDependencies(graph, skill1)];
    // Should include all three skills
    expect(result).toHaveLength(3);
    expect(result).toContain(skill1);
    expect(result).toContain(skill2);
    expect(result).toContain(skill3);
    // The starting skill should be first
    expect(result[0]).toBe(skill1);
  });

  test(`walks deeply nested dependencies`, () => {
    const skill1 = `hp:好:positive` as Skill;
    const skill2 = `he:好:positive` as Skill;
    const skill3 = `he:女:woman` as Skill;
    const skill4 = `he:子:child` as Skill;

    const graph: SkillLearningGraph = new Map([
      [skill1, { skill: skill1, dependencies: new Set([skill2]) }],
      [skill2, { skill: skill2, dependencies: new Set([skill3, skill4]) }],
      [skill3, { skill: skill3, dependencies: new Set() }],
      [skill4, { skill: skill4, dependencies: new Set() }],
    ]);

    const result = [...walkSkillAndDependencies(graph, skill1)];
    expect(result).toHaveLength(4);
    expect(result).toContain(skill1);
    expect(result).toContain(skill2);
    expect(result).toContain(skill3);
    expect(result).toContain(skill4);
    // The starting skill should be first
    expect(result[0]).toBe(skill1);
  });

  test(`handles circular dependencies correctly`, () => {
    const skill1 = `he:A:a` as Skill;
    const skill2 = `he:B:b` as Skill;
    const skill3 = `he:C:c` as Skill;

    // Create a circular dependency: skill1 -> skill2 -> skill3 -> skill1
    const graph: SkillLearningGraph = new Map([
      [skill1, { skill: skill1, dependencies: new Set([skill2]) }],
      [skill2, { skill: skill2, dependencies: new Set([skill3]) }],
      [skill3, { skill: skill3, dependencies: new Set([skill1]) }],
    ]);

    const result = [...walkSkillAndDependencies(graph, skill1)];
    // Should visit each skill exactly once despite circular dependency
    expect(result).toHaveLength(3);
    expect(result).toContain(skill1);
    expect(result).toContain(skill2);
    expect(result).toContain(skill3);
    // The starting skill should be first
    expect(result[0]).toBe(skill1);
  });

  test(`handles skill not in graph`, () => {
    const skill1 = `he:我:i` as Skill;
    const skill2 = `he:不存在:nonexistent` as Skill;

    const graph: SkillLearningGraph = new Map([
      [skill1, { skill: skill1, dependencies: new Set() }],
    ]);

    // Try to walk a skill that's not in the graph
    const result = [...walkSkillAndDependencies(graph, skill2)];
    // Should still return the skill itself, even if it has no node in the graph
    expect(result).toEqual([skill2]);
  });

  test(`handles empty graph`, () => {
    const skill1 = `he:我:i` as Skill;
    const graph: SkillLearningGraph = new Map();

    const result = [...walkSkillAndDependencies(graph, skill1)];
    // Should return just the skill itself
    expect(result).toEqual([skill1]);
  });

  test(`walks complex dependency tree`, () => {
    // Create a more complex tree structure
    const skillA = `he:A:a` as Skill;
    const skillB = `he:B:b` as Skill;
    const skillC = `he:C:c` as Skill;
    const skillD = `he:D:d` as Skill;
    const skillE = `he:E:e` as Skill;
    const skillF = `he:F:f` as Skill;

    // Tree: A -> [B, C], B -> [D], C -> [E, F]
    const graph: SkillLearningGraph = new Map([
      [skillA, { skill: skillA, dependencies: new Set([skillB, skillC]) }],
      [skillB, { skill: skillB, dependencies: new Set([skillD]) }],
      [skillC, { skill: skillC, dependencies: new Set([skillE, skillF]) }],
      [skillD, { skill: skillD, dependencies: new Set() }],
      [skillE, { skill: skillE, dependencies: new Set() }],
      [skillF, { skill: skillF, dependencies: new Set() }],
    ]);

    const result = [...walkSkillAndDependencies(graph, skillA)];
    expect(result).toHaveLength(6);
    expect(result).toContain(skillA);
    expect(result).toContain(skillB);
    expect(result).toContain(skillC);
    expect(result).toContain(skillD);
    expect(result).toContain(skillE);
    expect(result).toContain(skillF);
    // The starting skill should be first
    expect(result[0]).toBe(skillA);
  });

  test(`handles diamond dependency pattern`, () => {
    // Diamond pattern: A -> [B, C], B -> D, C -> D
    const skillA = `he:A:a` as Skill;
    const skillB = `he:B:b` as Skill;
    const skillC = `he:C:c` as Skill;
    const skillD = `he:D:d` as Skill;

    const graph: SkillLearningGraph = new Map([
      [skillA, { skill: skillA, dependencies: new Set([skillB, skillC]) }],
      [skillB, { skill: skillB, dependencies: new Set([skillD]) }],
      [skillC, { skill: skillC, dependencies: new Set([skillD]) }],
      [skillD, { skill: skillD, dependencies: new Set() }],
    ]);

    const result = [...walkSkillAndDependencies(graph, skillA)];
    // Should visit D only once despite being reachable through both B and C
    expect(result).toHaveLength(4);
    expect(result).toContain(skillA);
    expect(result).toContain(skillB);
    expect(result).toContain(skillC);
    expect(result).toContain(skillD);
    // The starting skill should be first
    expect(result[0]).toBe(skillA);
  });
});

describe(`makeLargeSkillReviewFixture suite`, () => {
  test(`it works with skillReviewQueue`, async () => {
    const dictionary = await loadDictionary();

    const { graph, skillSrsStates, recentSkillRatingEvents, now } =
      makeLargeSkillReviewFixture({
        skillCount: 1000,
        introducedCount: 800,
        ratingCount: 600,
      });

    expect(graph.size).toBe(1000);
    expect(skillSrsStates.size).toBe(800);
    expect(recentSkillRatingEvents).toHaveLength(600);
    expect(now).toEqual(new Date(`2025-01-01T00:00:00.000Z`));

    skillReviewQueue({
      graph,
      skillSrsStates,
      recentSkillRatingEvents,
      dictionary,
      now,
      maxQueueItems: graph.size,
    });
  });
});

type SkillReviewQueueRatingEventSpec = [rating: Rating, createdAt: Date];

function recentSkillRatingEvents(
  spec: Record<Skill, SkillReviewQueueRatingEventSpec> = {},
): SkillReviewQueueRatingEvent[] {
  return (
    Object.entries(spec) as [Skill, SkillReviewQueueRatingEventSpec][]
  ).map(([skill, [rating, createdAt]], index) => ({
    id: `test-${index}-${skill}`,
    skill,
    rating,
    createdAt,
  }));
}

/**
 * Testing helper to calculate a skill review queue based on a history of
 * simulated reviews.
 */
async function simulateSkillReviews({
  decompositionData,
  dictionary,
  charactersJson,
  targetSkills,
  history,
}: {
  decompositionData: CharacterDecompositionData;
  dictionary: Dictionary;
  charactersJson: CharactersJson;
  targetSkills: Skill[];
  history: HistoryCommand[];
}): Promise<SkillReviewQueue> {
  await using rizzle = r.replicache(
    testReplicacheOptions(),
    currentSchema,
    mutators,
  );

  await seedSkillHistory(rizzle, history);

  // Now compute the skill review queue using data from replicache.
  const graph = skillLearningGraph({
    decompositionData,
    dictionary,
    charactersJson,
    targetSkills,
  });

  // Calculate input dependencies.
  const skillSrsStates = new Map<Skill, SrsStateType>();
  for await (const [, v] of rizzle.queryPaged.skillState.scan()) {
    skillSrsStates.set(v.skill, v.srs);
  }
  const recentSkillRatingEvents: SkillReviewQueueRatingEvent[] = [];
  for await (const [, v] of rizzle.queryPaged.skillRating.byCreatedAt()) {
    if (v.trashedAt == null) {
      recentSkillRatingEvents.push(v);
    }
  }

  // Compute the review queue.
  return skillReviewQueue({
    graph,
    skillSrsStates,
    recentSkillRatingEvents,
    dictionary,
  });
}

export function makeLargeSkillReviewFixture({
  skillCount,
  introducedCount,
  ratingCount,
  branchingFactor = 8,
  now = new Date(`2025-01-01T00:00:00.000Z`),
}: {
  skillCount: number;
  introducedCount: number;
  ratingCount: number;
  branchingFactor?: number;
  now?: Date;
}): {
  graph: SkillLearningGraph;
  skillSrsStates: Map<Skill, SrsStateType>;
  recentSkillRatingEvents: SkillReviewQueueRatingEvent[];
  skills: readonly Skill[];
  now: Date;
} {
  invariant(introducedCount <= skillCount);

  const secondaryFactor = branchingFactor * branchingFactor;
  const skillPrefix = rSkillKind().marshal(SkillKind.HanziWordToGloss);
  const skills: Skill[] = Array.from(
    { length: skillCount },
    (_, index) => `${skillPrefix}:好:${index}` as Skill,
  );

  const graph: SkillLearningGraph = new Map();
  for (let index = 0; index < skillCount; index++) {
    const skill = skills[index]!;
    const dependencies = new Set<Skill>();

    if (index > 0) {
      const primaryParent = skills[Math.floor((index - 1) / branchingFactor)]!;
      if (primaryParent !== skill) {
        dependencies.add(primaryParent);
      }

      const secondaryIndex = Math.floor((index - 1) / secondaryFactor);
      if (secondaryIndex > 0) {
        dependencies.add(skills[secondaryIndex]!);
      }
    }

    graph.set(skill, { skill, dependencies });
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const skillSrsStates = new Map<Skill, SrsStateType>();
  for (let index = 0; index < introducedCount; index++) {
    const skill = skills[index]!;
    const prevReviewAt = new Date(now.getTime() - (40 + (index % 10)) * dayMs);
    const nextReviewAt =
      index % 5 === 0
        ? new Date(now.getTime() - ((index % 6) + 1) * hourMs)
        : new Date(now.getTime() + ((index % 6) + 1) * hourMs);
    skillSrsStates.set(skill, mockSrsState(prevReviewAt, nextReviewAt));
  }

  const recentSkillRatingEvents: SkillReviewQueueRatingEvent[] = [];
  for (let index = 0; index < ratingCount; index++) {
    const skill = skills[index % skills.length]!;
    recentSkillRatingEvents.push({
      id: `fixture-${index}`,
      skill,
      rating: index % 4 === 0 ? Rating.Again : Rating.Good,
      createdAt: new Date(now.getTime() - index * 90 * 1000),
    });
  }

  return { graph, skillSrsStates, recentSkillRatingEvents, skills, now };
}
