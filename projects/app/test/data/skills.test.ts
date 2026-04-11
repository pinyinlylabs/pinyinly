import type { Skill, SrsStateType } from "#data/model.ts";
import { SkillKind, SrsKind } from "#data/model.ts";
import { mutators } from "#data/rizzleMutators.ts";
import { currentSchema, rSkillKind } from "#data/rizzleSchema.ts";
import type {
  LatestSkillRating,
  RankRules,
  SkillLearningGraph,
  SkillReviewQueue,
} from "#data/skills.ts";
import {
  computeSkillRating,
  getHanziWordRank,
  hanziWordToGloss,
  isHanziWordSkill,
  isHarderDifficultyStyleSkillKind,
  randomPickSkillsForReview,
  rankRules,
  skillKindFromSkill,
  skillLearningGraph,
  skillReviewQueue,
  walkSkillAndDependencies,
} from "#data/skills.ts";
import { getIsStructuralHanzi, loadDictionary } from "#dictionary.ts";
import type { HistoryCommand } from "#test/data/helpers.ts";
import {
  fsrsSrsState,
  mockSrsState,
  prettyQueue,
  seedSkillReviews as seedSkillHistory,
  时,
} from "#test/data/helpers.ts";
import { testReplicacheOptions } from "#test/util/rizzleHelpers.ts";
import { Rating } from "#util/fsrs.ts";
import { r } from "#util/rizzle.ts";
import { invariant } from "@pinyinly/lib/invariant";
import { beforeEach, describe, expect, test, vi } from "vitest";

const skillTest = test.extend<{
  isStructuralHanzi: Awaited<ReturnType<typeof getIsStructuralHanzi>>;
  dictionary: Awaited<ReturnType<typeof loadDictionary>>;
}>({
  isStructuralHanzi: [
    async ({}, use) => {
      const isStructuralHanzi = await getIsStructuralHanzi();
      await use(isStructuralHanzi);
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
});

describe(
  `skillLearningGraph suite` satisfies HasNameOf<typeof skillLearningGraph>,
  () => {
    test(`no targets gives an empty graph`, async () => {
      await expect(skillLearningGraph({ targetSkills: [] })).resolves.toEqual(
        new Map(),
      );
    });

    test(`includes the target skill in the graph`, async () => {
      const skill = `he:我:i`;

      const graph = await skillLearningGraph({ targetSkills: [skill] });

      expect(graph.keys()).toContain(`he:我:i`);
    });

    test(`includes decomposition dependencies when learning 好`, async () => {
      await expect(skillLearningGraph({ targetSkills: [`he:好:good`] }))
        .resolves.toMatchInlineSnapshot(`
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
    });

    test(`includes multiple levels of decomposition for a character`, async () => {
      await expect(
        skillLearningGraph({
          targetSkills: [`he:外:outside`],
        }),
      ).resolves.toEqual(
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
    });

    type TextGraph = Map</* id */ string, /* children */ Set<string>>;

    /**
     * Parses a text representation of a graph.
     *
     * Convenient when writing test cases.
     *
     * @example
     *
     * ```ts
     * parseTextGraph(`
     * he:一下儿:aBit
     *   he:外:outside
     *     he:夕:evening
     *       he:丶:dot
     *       he:𠂊:hands
     *     he:卜:divine
     *   he:一:one
     *   he:儿:son
     * `)
     * ```
     */
    function parseTextGraph(textGraph: string) {
      const graph: TextGraph = new Map();

      // Drop empty lines
      const lines = textGraph.split(`\n`).filter((line) => line.trim() !== ``);

      // Maintain a list of the parents in the current tree branch so that when a
      // dedent is encountered we can pop the parent off the stack and add the new
      // branch to the correct parent.
      const parentStack: { id: string; indent: number }[] = [];

      for (const line of lines) {
        const res = /^(\s*)(.+?)(\s*\/\/.+)?$/.exec(line);
        invariant(res != null);
        const [, indentText, id, _comment] = res;
        invariant(indentText != null);
        invariant(id != null);

        const indent = indentText.length;

        // Drop any existing subtree starting at the same indent.
        const siblingIndex = parentStack.findIndex((p) => p.indent === indent);
        if (siblingIndex !== -1) {
          parentStack.splice(siblingIndex);
        }

        // If there's a parent, add this as a child.
        const parentId = parentStack.at(-1)?.id;
        if (parentId != null) {
          const children = graph.get(parentId);
          invariant(children != null);
          children.add(id);
        }

        // Add this item to the parent stack so that if it has siblings they are
        // added to the correct parent.
        parentStack.push({ id, indent });

        // Add this item to the graph.
        if (!graph.has(id)) {
          graph.set(id, new Set());
        }
      }
      return graph;
    }

    function skillLearningGraphToText(graph: SkillLearningGraph): TextGraph {
      const textGraph: TextGraph = new Map();

      for (const [skill, node] of graph.entries()) {
        textGraph.set(skill, node.dependencies);
      }

      return textGraph;
    }

    test(
      `parseTextGraph basics` satisfies HasNameOf<typeof parseTextGraph>,
      () => {
        expect(
          parseTextGraph(`
      he:一下儿:aBit
        he:外:outside
          he:夕:evening
            he:丶:dot
            he:𠂊:hands
          he:卜:divine
            he:丨:line
            he:丶:dot
        he:一:one
        he:儿:son
          he:丿:slash
          he:乚:second
      he:一:one
      `),
        ).toEqual(
          new Map([
            [
              `he:一下儿:aBit`,
              new Set([`he:外:outside`, `he:一:one`, `he:儿:son`]),
            ],
            [`he:外:outside`, new Set([`he:夕:evening`, `he:卜:divine`])],
            [`he:夕:evening`, new Set([`he:丶:dot`, `he:𠂊:hands`])],
            [`he:丿:slash`, new Set()],
            [`he:乚:second`, new Set()],
            [`he:丨:line`, new Set()],
            [`he:一:one`, new Set()],
            [`he:丶:dot`, new Set()],
            [`he:𠂊:hands`, new Set()],
            [`he:儿:son`, new Set([`he:丿:slash`, `he:乚:second`])],
            [`he:卜:divine`, new Set([`he:丨:line`, `he:丶:dot`])],
          ]),
        );
      },
    );

    function assertLearningGraphEqual(
      actual: SkillLearningGraph,
      expected: string,
    ) {
      expect(skillLearningGraphToText(actual)).toEqual(
        parseTextGraph(expected),
      );
    }

    test(`supports multi-character words`, async () => {
      assertLearningGraphEqual(
        await skillLearningGraph({
          targetSkills: [`he:一下儿:aBit`],
        }),
        `
      he:一下儿:aBit
        he:一:one
        he:下:below
          he:一:one
          he:卜:divine
            he:丨:line
            he:丶:dot
        he:儿:son
      he:儿:son
        he:丿:slash
        he:乚:hidden
      `,
      );
    });

    test(`supports HanziWordToPinyin dependency chain`, async () => {
      assertLearningGraphEqual(
        await skillLearningGraph({ targetSkills: [`hp:儿:son`] }),
        `
      hp:儿:son
        he:儿:son
        hpf:儿:son
          hpi:儿:son
            he:儿:son
              he:丿:slash
              he:乚:hidden
      `,
      );
    });

    test(`works for hsk words`, async () => {
      const dictionary = await loadDictionary();
      await skillLearningGraph({
        targetSkills: [
          ...dictionary.hsk1HanziWords,
          ...dictionary.hsk2HanziWords,
          ...dictionary.hsk3HanziWords,
        ].map((w) => hanziWordToGloss(w)),
      });
    });

    test(`learns the word form of component-form first`, async () => {
      assertLearningGraphEqual(
        await skillLearningGraph({ targetSkills: [`he:汉:chinese`] }),
        `
        he:汉:chinese
          he:又:again
          he:氵:water
        `,
      );
    });

    test.todo(`splits words into characters`);
  },
);

describe(
  `skillReviewQueue suite` satisfies HasNameOf<typeof skillReviewQueue>,
  () => {
    skillTest(
      `no target skills or skill states gives an empty queue`,
      async ({ isStructuralHanzi, dictionary }) => {
        const graph = await skillLearningGraph({
          targetSkills: [],
        });
        expect(
          skillReviewQueue({
            graph,
            skillSrsStates: new Map(),
            latestSkillRatings: latestSkillRatings(),
            isStructuralHanzi,
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
      async ({ isStructuralHanzi, dictionary }) => {
        const graph = await skillLearningGraph({
          targetSkills: [],
        });
        const queue = skillReviewQueue({
          graph,
          skillSrsStates: new Map([
            [`he:刀:knife`, mockSrsState(时`-1d`, 时`-5m`)],
          ]),
          latestSkillRatings: latestSkillRatings(),
          isStructuralHanzi,
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
      async ({ isStructuralHanzi, dictionary }) => {
        const graph = await skillLearningGraph({
          targetSkills: [`he:刀:knife`],
        });

        const queue = skillReviewQueue({
          graph,
          skillSrsStates: new Map([
            [`he:刀:knife`, mockSrsState(时`-1d`, 时`-5m`)],
          ]),
          latestSkillRatings: latestSkillRatings(),
          isStructuralHanzi,
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
      async ({ isStructuralHanzi, dictionary }) => {
        const graph = await skillLearningGraph({
          targetSkills: [`he:丿:slash`, `he:人:person`, `he:𠃌:radical`],
        });

        const queue = skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
          latestSkillRatings: latestSkillRatings(),
          isStructuralHanzi,
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
        const latestSkillRatings = new Map<Skill, LatestSkillRating>();

        return {
          skillA,
          skillB,
          skillC,
          graph,
          skillSrsStates,
          latestSkillRatings,
        };
      }

      skillTest(
        `limits the number of items in the queue`,
        async ({ isStructuralHanzi, dictionary }) => {
          const { graph, skillSrsStates, latestSkillRatings } = makeMockData();

          const queue = skillReviewQueue({
            graph,
            skillSrsStates,
            latestSkillRatings,
            isStructuralHanzi,
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
        async ({ isStructuralHanzi, dictionary }) => {
          const { graph, skillSrsStates, latestSkillRatings } = makeMockData();

          const queue = skillReviewQueue({
            graph,
            skillSrsStates,
            latestSkillRatings,
            isStructuralHanzi,
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

    describe(
      `SkillKind.HanziWordToGloss skills` satisfies HasNameOf<
        typeof SkillKind.HanziWordToGloss
      >,
      () => {
        skillTest(`works for 好`, async ({ isStructuralHanzi, dictionary }) => {
          const graph = await skillLearningGraph({
            targetSkills: [`he:好:good`],
          });
          const queue = skillReviewQueue({
            graph,
            skillSrsStates: new Map(),
            latestSkillRatings: latestSkillRatings(),
            isStructuralHanzi,
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
        });

        skillTest(
          `learns the word form of component-form first`,
          async ({ isStructuralHanzi, dictionary }) => {
            const graph = await skillLearningGraph({
              targetSkills: [`he:汉:chinese`],
            });

            const queue = skillReviewQueue({
              graph,
              skillSrsStates: new Map(),
              latestSkillRatings: latestSkillRatings(),
              isStructuralHanzi,
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

        test(`incorrect answers in a quiz don't get scheduled prematurely`, async () => {
          vi.useFakeTimers({ toFake: [`Date`] });

          // There was a bug where "wrong answers" were being scheduled for review
          // even though they'd never been introduced yet. This is a regression test
          // against that scenario.

          const queue = await simulateSkillReviews({
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
        });

        test(`learns new skills before not-due skills (stable sorted to maintain graph order)`, async () => {
          const queue = await simulateSkillReviews({
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
        });

        test(`skills unblock dependant skills when they become stable enough`, async () => {
          vi.useFakeTimers({ toFake: [`Date`] });

          const targetSkills: Skill[] = [`he:刀:knife`];
          const history: HistoryCommand[] = [];

          {
            const queue = await simulateSkillReviews({
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
              targetSkills,
              history,
            });
            // Now unblocked because the dependencies are stable enough.
            expect(prettyQueue(queue)).toContainEqual(
              `he:刀:knife (🌱 NEW SKILL)`,
            );
          }
        });

        test(`doesn't get stuck reviewing the same skill after all due skills are done`, async () => {
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

          let queue = await simulateSkillReviews({ targetSkills, history });
          let review1 = queue.items[0];

          // If he:𠃌:radical is the next review, then answer it correctly and
          // move to the next item in the queue.
          if (review1?.skill === `he:𠃌:radical`) {
            history.push(`💤 5s`, `🟡 he:𠃌:radical`);
            queue = await simulateSkillReviews({ targetSkills, history });
            review1 = queue.items[0];
          }

          // Doesn't get stuck reviewing he:𠃌:radical just because it had a lower stability.
          expect([review1?.skill]).not.toEqual([`he:𠃌:radical`]);
          expect(queue.items.map(({ skill }) => skill)).toContain(
            `he:𠃌:radical`,
          );
        });

        test(`skills that are stale (heavily over-due and not stable) are treated as new skills`, async () => {
          vi.useFakeTimers({ toFake: [`Date`] });

          const targetSkills: Skill[] = [`he:刀:knife`];
          const history: HistoryCommand[] = [
            `❌ he:刀:knife`, // Get it wrong initially so it's considered introduced but not very stable.
            `💤 1h`, // Wait a short time so we can test that it's actually scheduled first again (base case).
          ];

          {
            const queue = await simulateSkillReviews({
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
        });

        describe(`retry logic`, () => {
          skillTest(
            `skills that were just failed should stay first in queue (so you retry it immediately)`,
            async ({ isStructuralHanzi, dictionary }) => {
              vi.useFakeTimers({ toFake: [`Date`] });

              const graph = await skillLearningGraph({
                targetSkills: [`he:八:eight`, `he:丿:slash`],
              });

              const queue = skillReviewQueue({
                graph,
                skillSrsStates: new Map([
                  [`he:八:eight`, mockSrsState(时`-1d`, 时`-5m`)],
                  [`he:丿:slash`, mockSrsState(时`-1d`, 时`-3m`)],
                ]),
                latestSkillRatings: latestSkillRatings({
                  "he:丿:slash": [Rating.Again, 时`-1m`],
                }),
                isStructuralHanzi,
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
            async ({ isStructuralHanzi, dictionary }) => {
              vi.useFakeTimers({ toFake: [`Date`] });

              const graph = await skillLearningGraph({
                targetSkills: [`he:八:eight`, `he:丿:slash`],
              });

              const queue = skillReviewQueue({
                graph,
                skillSrsStates: new Map([
                  [`he:八:eight`, mockSrsState(时`-1d`, 时`-5m`)],
                ]),
                latestSkillRatings: latestSkillRatings({
                  "he:丿:slash": [Rating.Again, 时`-1m`], // it's incorrect but was never introduced
                }),
                isStructuralHanzi,
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
            async ({ isStructuralHanzi, dictionary }) => {
              vi.useFakeTimers({ toFake: [`Date`] });

              const graph = await skillLearningGraph({
                targetSkills: [`he:八:eight`, `he:丿:slash`],
              });

              {
                const queue = skillReviewQueue({
                  graph,
                  skillSrsStates: new Map([
                    [`he:八:eight`, mockSrsState(时`-1d`, 时`-5m`)],
                    [`he:丿:slash`, mockSrsState(时`-1d`, 时`-5m`)],
                  ]),
                  latestSkillRatings: latestSkillRatings({
                    "he:八:eight": [Rating.Again, 时`-1m`],
                    "he:丿:slash": [Rating.Again, 时`-2m`],
                  }),
                  isStructuralHanzi,
                  dictionary,
                });
                expect(prettyQueue(queue)).toMatchInlineSnapshot(`
                  [
                    "he:八:eight (⚠️ RETRY)",
                    "he:丿:slash (⚠️ RETRY)",
                  ]
                `);
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
                  latestSkillRatings: latestSkillRatings({
                    "he:八:eight": [Rating.Again, 时`-2m`],
                    "he:丿:slash": [Rating.Again, 时`-1m`],
                  }),
                  isStructuralHanzi,
                  dictionary,
                });
                expect(prettyQueue(queue)).toMatchInlineSnapshot(`
                  [
                    "he:丿:slash (⚠️ RETRY)",
                    "he:八:eight (⚠️ RETRY)",
                  ]
                `);
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
        });

        describe(`pronunciation skill prioritization after successful hanzi-to-english`, () => {
          skillTest(
            `prioritizes pronunciation skill after successful he: review if user has reached rank 1`,
            async ({ isStructuralHanzi, dictionary }) => {
              vi.useFakeTimers({ toFake: [`Date`] });

              const graph = await skillLearningGraph({
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
                latestSkillRatings: latestSkillRatings({
                  "he:好:good": [Rating.Good, 时`-1m`], // Most recent successful HanziWordToGloss review
                }),
                isStructuralHanzi,
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
            async ({ isStructuralHanzi, dictionary }) => {
              const graph = await skillLearningGraph({
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
                latestSkillRatings: latestSkillRatings({
                  "he:好:good": [Rating.Good, 时`-1m`],
                }),
                isStructuralHanzi,
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
            async ({ isStructuralHanzi, dictionary }) => {
              const graph = await skillLearningGraph({
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
                latestSkillRatings: latestSkillRatings({
                  "he:好:good": [Rating.Again, 时`-1m`], // No recent successful reviews - failed review instead
                }),
                isStructuralHanzi,
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
            async ({ isStructuralHanzi, dictionary }) => {
              const graph = await skillLearningGraph({
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
                latestSkillRatings: latestSkillRatings({
                  "he:好:good": [Rating.Good, 时`-1m`], // Most recent successful HanziWordToGloss review
                }),
                isStructuralHanzi,
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
          async ({ dictionary }) => {
            const graph = await skillLearningGraph({
              targetSkills: [`he:分:divide`],
            });

            const queue = skillReviewQueue({
              graph,
              skillSrsStates: new Map([
                [`he:八:eight`, mockSrsState(时`-1d`, 时`-5m`)],
                [`he:刀:knife`, mockSrsState(时`-1d`, 时`-5m`)],
              ]),
              latestSkillRatings: latestSkillRatings(),
              isStructuralHanzi: () => false,
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
          async ({ dictionary }) => {
            const graph = await skillLearningGraph({
              targetSkills: [`he:分:divide`],
            });

            const queue = skillReviewQueue({
              graph,
              skillSrsStates: new Map(),
              latestSkillRatings: latestSkillRatings(),
              isStructuralHanzi: () => false,
              dictionary,
            });
            expect(prettyQueue(queue)).toMatchInlineSnapshot(`
              [
                "he:丿:slash (🌱 NEW SKILL)",
                "he:𠃌:radical (🌱 NEW SKILL)",
                "he:八:eight (🌱 NEW SKILL)",
                "he:刀:knife (🟥 BLOCKED)",
                "he:分:divide (🟥 BLOCKED)",
              ]
            `);
          },
        );

        skillTest(
          `schedules skill reviews in order of due, and then deterministic random`,
          async ({ isStructuralHanzi, dictionary }) => {
            const graph = await skillLearningGraph({
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
              latestSkillRatings: latestSkillRatings(),
              isStructuralHanzi,
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

        skillTest(
          `throttles the number of new skills in the queue`,
          async ({ isStructuralHanzi, dictionary }) => {
            const graph = await skillLearningGraph({
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
                latestSkillRatings: latestSkillRatings(),
                isStructuralHanzi,
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
                latestSkillRatings: latestSkillRatings(),
                isStructuralHanzi,
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
      },
    );

    describe(
      `SkillKind.HanziWordToGlossTyped skills` satisfies HasNameOf<
        typeof SkillKind.HanziWordToGlossTyped
      >,
      () => {
        describe(`uses an OtherAnswer flag if the previous question was the same hanzi (for any hanzi->gloss type skill)`, () => {
          beforeEach(() => {
            vi.useFakeTimers({ toFake: [`Date`] });
          });

          skillTest(
            `two meanings`,
            async ({ isStructuralHanzi, dictionary }) => {
              const graph = await skillLearningGraph({
                targetSkills: [`het:好:good`, `het:好:like`],
              });
              const queue = skillReviewQueue({
                graph,
                skillSrsStates: new Map([
                  // 好:good was just reviewed, and 好:like is due, so it should be asked next.
                  [`het:好:good`, fsrsSrsState(时`-1s`, 时`1d`, Rating.Good)],
                  [`het:好:like`, fsrsSrsState(时`-1d`, 时`5m`, Rating.Good)],
                ]),
                latestSkillRatings: latestSkillRatings({
                  // TODO refactor to combine with `skillSrsStates` to keep them consistent.
                  "het:好:good": [Rating.Good, 时`-1s`],
                  // "het:好:like": [Rating.Good, 时`-1d`],
                }),
                isStructuralHanzi,
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
            async ({ isStructuralHanzi, dictionary }) => {
              const graph = await skillLearningGraph({
                targetSkills: [`het:任:any`, `het:任:appoint`, `het:任:duty`],
              });
              const queue = skillReviewQueue({
                graph,
                skillSrsStates: new Map([
                  [`het:任:any`, fsrsSrsState(时`-5s`, 时`5m`, Rating.Good)],
                  [
                    `het:任:appoint`,
                    fsrsSrsState(时`-10s`, 时`6m`, Rating.Good),
                  ],
                  [`het:任:duty`, fsrsSrsState(时`-1d`, 时`7m`, Rating.Good)],
                ]),
                latestSkillRatings: latestSkillRatings({
                  // TODO refactor to combine with `skillSrsStates` to keep them consistent.
                  "het:任:any": [Rating.Good, 时`-5s`],
                  "het:任:appoint": [Rating.Good, 时`-10s`],
                  // "het:任:duty": [Rating.Good, 时`-1d`],
                }),
                isStructuralHanzi,
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
            async ({ isStructuralHanzi, dictionary }) => {
              const graph = await skillLearningGraph({
                targetSkills: [`het:任:any`, `het:任:appoint`],
              });
              const queue = skillReviewQueue({
                graph,
                skillSrsStates: new Map([
                  [`het:任:any`, fsrsSrsState(时`-5s`, 时`5m`, Rating.Good)],
                ]),
                latestSkillRatings: latestSkillRatings({
                  // TODO refactor to combine with `skillSrsStates` to keep them consistent.
                  "het:任:any": [Rating.Good, 时`-5s`],
                }),
                isStructuralHanzi,
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
            async ({ isStructuralHanzi, dictionary }) => {
              const graph = await skillLearningGraph({
                targetSkills: [`hp:几:howMany`, `hp:几:table`],
              });
              const queue = skillReviewQueue({
                graph,
                skillSrsStates: new Map([
                  // 几:howMany was just reviewed, and 几:table is due, so it should be asked next.
                  [`hp:几:howMany`, fsrsSrsState(时`-1s`, 时`1d`, Rating.Good)],
                  [`hp:几:table`, fsrsSrsState(时`-1d`, 时`5m`, Rating.Good)],
                ]),
                latestSkillRatings: latestSkillRatings({
                  "hp:几:howMany": [Rating.Good, 时`-1s`],
                }),
                isStructuralHanzi,
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
            async ({ isStructuralHanzi, dictionary }) => {
              const graph = await skillLearningGraph({
                targetSkills: [`hp:几:howMany`, `hp:几:table`],
              });
              const queue = skillReviewQueue({
                graph,
                skillSrsStates: new Map([
                  [`hp:几:howMany`, fsrsSrsState(时`-5s`, 时`5m`, Rating.Good)],
                ]),
                latestSkillRatings: latestSkillRatings({
                  "hp:几:howMany": [Rating.Good, 时`-5s`],
                }),
                isStructuralHanzi,
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
            async ({ isStructuralHanzi, dictionary }) => {
              // Both 点:oClock and 点:point have the same pinyin "diǎn"
              // so answering one should NOT trigger an OtherAnswer reactive question
              const graph = await skillLearningGraph({
                targetSkills: [`hp:点:oClock`, `hp:点:point`],
              });
              const queue = skillReviewQueue({
                graph,
                skillSrsStates: new Map([
                  // 点:oClock was just reviewed, and 点:point is also introduced
                  [`hp:点:oClock`, fsrsSrsState(时`-1s`, 时`1d`, Rating.Good)],
                  [`hp:点:point`, fsrsSrsState(时`-1d`, 时`5m`, Rating.Good)],
                ]),
                latestSkillRatings: latestSkillRatings({
                  "hp:点:oClock": [Rating.Good, 时`-1s`],
                }),
                isStructuralHanzi,
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
      },
    );

    describe(
      `SkillKind.HanziWordToPinyinTyped skills` satisfies HasNameOf<
        typeof SkillKind.HanziWordToPinyinTyped
      >,
      () => {
        skillTest(
          `doesn't learn pinyin for all constituents of a single character`,
          async ({ isStructuralHanzi, dictionary }) => {
            const graph = await skillLearningGraph({
              targetSkills: [`hp:好:good`],
            });
            const queue = skillReviewQueue({
              graph,
              skillSrsStates: new Map(),
              latestSkillRatings: latestSkillRatings(),
              isStructuralHanzi,
              dictionary,
            });

            const queueSkills = queue.items.map(({ skill }) => skill);
            expect(queueSkills).not.toContain(`hpi:女:woman`);
            expect(queueSkills).not.toContain(`hpi:子:child`);
          },
        );

        skillTest(
          `learns the pinyin for each character in multi-character words`,
          async ({ isStructuralHanzi, dictionary }) => {
            const graph = await skillLearningGraph({
              targetSkills: [`hp:一样:same`],
            });

            const queue = skillReviewQueue({
              graph,
              skillSrsStates: new Map(),
              latestSkillRatings: latestSkillRatings(),
              isStructuralHanzi,
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
          async ({ dictionary }) => {
            const graph = await skillLearningGraph({
              targetSkills: [`hp:一点儿:aLittle`],
            });

            const queue = skillReviewQueue({
              graph,
              skillSrsStates: new Map(),
              latestSkillRatings: latestSkillRatings(),
              isStructuralHanzi: () => false,
              dictionary,
            });
            expect(prettyQueue(queue)).toMatchInlineSnapshot(`
              [
                "he:丶:dot (🌱 NEW SKILL)",
                "he:丨:line (🌱 NEW SKILL)",
                "he:口:mouth (🌱 NEW SKILL)",
                "he:乚:hidden (🌱 NEW SKILL)",
                "he:丿:slash (🌱 NEW SKILL)",
                "he:灬:fire (🌱 NEW SKILL)",
                "he:一:one (🌱 NEW SKILL)",
                "he:卜:divine (🟥 BLOCKED)",
                "he:占:occupy (🟥 BLOCKED)",
                "he:儿:son (🟥 BLOCKED)",
                "he:点:oClock (🟥 BLOCKED)",
                "hpi:儿:son (🟥 BLOCKED)",
                "hpi:点:oClock (🟥 BLOCKED)",
                "hpi:一:one (🟥 BLOCKED)",
                "hpf:儿:son (🟥 BLOCKED)",
                "hpf:点:oClock (🟥 BLOCKED)",
                "hpf:一:one (🟥 BLOCKED)",
                "hp:儿:son (🟥 BLOCKED)",
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
          async ({ isStructuralHanzi, dictionary }) => {
            const graph = await skillLearningGraph({
              targetSkills: [`hp:一:one`],
            });

            {
              const queue = skillReviewQueue({
                graph,
                skillSrsStates: new Map(),
                latestSkillRatings: latestSkillRatings(),
                isStructuralHanzi,
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
                latestSkillRatings: latestSkillRatings(),
                isStructuralHanzi,
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
                latestSkillRatings: latestSkillRatings(),
                isStructuralHanzi,
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
      },
    );
  },
);

describe(
  `computeSkillRating suite` satisfies HasNameOf<typeof computeSkillRating>,
  () => {
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

    describe(
      `SkillKind.HanziWordToGloss suites` satisfies HasNameOf<
        typeof SkillKind.HanziWordToGloss
      >,
      () => {
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
      },
    );
  },
);

describe(
  `getHanziWordRank suite` satisfies HasNameOf<typeof getHanziWordRank>,
  () => {
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
  },
);

test(
  `isHanziWordSkill suite` satisfies HasNameOf<typeof isHanziWordSkill>,
  () => {
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
  },
);

test(
  `isHarderDifficultyStyleSkillKind suite` satisfies HasNameOf<
    typeof isHarderDifficultyStyleSkillKind
  >,
  () => {
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
  },
);

describe(
  `randomPickSkillsForReview suite` satisfies HasNameOf<
    typeof randomPickSkillsForReview
  >,
  () => {
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

      return inputs.map(
        ([skill]) => (priorityCounts.get(skill) ?? 0) / numRuns,
      );
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
      expect(monteCarloSample([1, 10, 100, 1000, 10_000]))
        .toMatchInlineSnapshot(`
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
  },
);

describe(
  `walkSkillAndDependencies suite` satisfies HasNameOf<
    typeof walkSkillAndDependencies
  >,
  () => {
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
  },
);

type LatestSkillRatingSpec = [rating: Rating, createdAt: Date];

function latestSkillRatings(
  spec: Record<Skill, LatestSkillRatingSpec> = {},
): Map<Skill, LatestSkillRating> {
  const result = new Map<Skill, LatestSkillRating>();

  for (const [skill, [rating, createdAt]] of Object.entries(spec) as [
    Skill,
    LatestSkillRatingSpec,
  ][]) {
    result.set(skill, { skill, rating, createdAt });
  }

  return result;
}

/**
 * Testing helper to calculate a skill review queue based on a history of
 * simulated reviews.
 */
async function simulateSkillReviews({
  targetSkills,
  history,
}: {
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
  const graph = await skillLearningGraph({ targetSkills });

  // Calculate input dependencies.
  const skillSrsStates = new Map<Skill, SrsStateType>();
  for await (const [, v] of rizzle.queryPaged.skillState.scan()) {
    skillSrsStates.set(v.skill, v.srs);
  }
  const latestSkillRatings = new Map<Skill, LatestSkillRating>();
  for await (const [, v] of rizzle.queryPaged.skillRating.byCreatedAt()) {
    latestSkillRatings.set(v.skill, v);
  }
  const isStructuralHanzi = await getIsStructuralHanzi();
  const dictionary = await loadDictionary();

  // Compute the review queue.
  return skillReviewQueue({
    graph,
    skillSrsStates,
    latestSkillRatings,
    isStructuralHanzi,
    dictionary,
  });
}
