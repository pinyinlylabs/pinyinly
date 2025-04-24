import { SkillType } from "#data/model.ts";
import type { Skill } from "#data/rizzleSchema.ts";
import type { SkillLearningGraph } from "#data/skills.ts";
import {
  computeSkillRating,
  hanziWordToGloss,
  skillLearningGraph,
  skillReviewQueue,
  skillTypeFromSkill,
} from "#data/skills.ts";
import {
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
} from "#dictionary/dictionary.ts";
import { Rating } from "#util/fsrs.ts";
import { invariant } from "@haohaohow/lib/invariant";
import assert from "node:assert/strict";
import test from "node:test";
import { fsrsSrsState, mockSrsState } from "./helpers";

await test(`${skillLearningGraph.name} suite`, async () => {
  await test(`no targets gives an empty graph`, async () => {
    assert.deepEqual(await skillLearningGraph({ targetSkills: [] }), new Map());
  });

  await test(`includes the target skill in the graph`, async () => {
    const skill = `he:我:i`;

    assert.deepEqual(
      await skillLearningGraph({ targetSkills: [skill] }),
      new Map([[skill, { skill, dependencies: new Set() }]]),
    );
  });

  await test(`includes decomposition dependencies when learning 好`, async () => {
    const skillGood = `he:好:good`;
    const skillWoman = `he:女:woman`;
    const skillChild = `he:子:child`;

    assert.deepEqual(
      await skillLearningGraph({ targetSkills: [skillGood] }),
      new Map([
        [
          skillGood,
          {
            skill: skillGood,
            dependencies: new Set([skillWoman, skillChild]),
          },
        ],
        [
          skillWoman,
          {
            skill: skillWoman,
            dependencies: new Set(),
          },
        ],
        [
          skillChild,
          {
            skill: skillChild,
            dependencies: new Set(),
          },
        ],
      ]),
    );
  });

  await test(`includes multiple levels of decomposition for a character`, async () => {
    assert.deepEqual(
      await skillLearningGraph({
        targetSkills: [`he:外:outside`],
      }),
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
          `he:卜:divine`,
          {
            skill: `he:卜:divine`,
            dependencies: new Set([]),
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
        parentStack.splice(siblingIndex, parentStack.length);
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

  await test(`${parseTextGraph.name} basics`, () => {
    assert.deepEqual(
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
  });

  function assertLearningGraphEqual(
    actual: SkillLearningGraph,
    expected: string,
  ) {
    assert.deepEqual(
      skillLearningGraphToText(actual),
      parseTextGraph(expected),
    );
  }

  await test(`supports multi-character words`, async () => {
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
        he:儿:son
      he:儿:son
        he:丿:slash
        he:乚:hidden
      `,
    );
  });

  await test(`supports HanziWordToPinyin dependency chain`, async () => {
    assertLearningGraphEqual(
      await skillLearningGraph({ targetSkills: [`hp:儿:son`] }),
      `
      hp:儿:son
        he:儿:son
        hpt:儿:son
          hpf:儿:son
            hpi:儿:son
              he:儿:son
                he:丿:slash
                he:乚:hidden
      `,
    );
  });

  await test(`works for hsk words`, async () => {
    await skillLearningGraph({
      targetSkills: [
        ...(await allHsk1HanziWords()),
        ...(await allHsk2HanziWords()),
        ...(await allHsk3HanziWords()),
      ].map((w) => hanziWordToGloss(w)),
    });
  });

  await test(`learns the word form of component-form first`, async () => {
    assertLearningGraphEqual(
      await skillLearningGraph({ targetSkills: [`he:汉:chinese`] }),
      `
      he:汉:chinese
        he:又:again
        he:氵:water
          he:水:water
            he:丿:slash
            he:亅:hook
      `,
    );
  });

  await test.todo(`splits words into characters`);
});

await test(`${skillReviewQueue.name} suite`, async () => {
  await test(`no target skills or skill states gives an empty queue`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [],
    });
    assert.partialDeepStrictEqual(
      skillReviewQueue({ graph, skillSrsStates: new Map() }),
      {
        available: [],
        blocked: [],
        dueCount: 0,
        overDueCount: 0,
        newDueAt: null,
        newOverDueAt: null,
      },
    );
  });

  await test(`no target skills but some skill states (i.e. introduced skills) includes introduced skills (but not any dependencies of it)`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [],
    });
    assert.partialDeepStrictEqual(
      skillReviewQueue({
        graph,
        skillSrsStates: new Map([[`he:刀:knife`, mockSrsState(`-1d`, `-5m`)]]),
      }),
      { available: [`he:刀:knife`], blocked: [], dueCount: 1, overDueCount: 0 },
    );
  });

  await test(`introduced skills that would otherwise be blocked are not blocked (because they've been introduced already)`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [`he:刀:knife`],
    });
    assert.partialDeepStrictEqual(
      skillReviewQueue({
        graph,
        skillSrsStates: new Map([[`he:刀:knife`, mockSrsState(`-1d`, `-5m`)]]),
      }),
      {
        available: [
          // This would normally be blocked but because it's already introduced
          // (because there's an srs state for it) it's available.
          `he:刀:knife`,

          // These would normally come first in the queue because they're
          // dependencies of he:刀:knife, but he:刀:knife is first because it's
          // "due" while these are not yet.
          `he:丿:slash`,
          `he:𠃌:radical`,
        ],
        blocked: [],
        dueCount: 1,
        overDueCount: 0,
      },
    );
  });

  await test(`${SkillType.HanziWordToGloss} skills`, async () => {
    await test(`works for 好`, async () => {
      const graph = await skillLearningGraph({
        targetSkills: [`he:好:good`],
      });
      assert.partialDeepStrictEqual(
        skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
        }),
        {
          available: [`he:子:child`, `he:女:woman`],
          blocked: [`he:好:good`],
        },
      );
    });

    await test(`learns the word form of component-form first`, async () => {
      const graph = await skillLearningGraph({
        targetSkills: [`he:汉:chinese`],
      });

      assert.partialDeepStrictEqual(
        skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
        }),
        {
          available: [`he:丿:slash`, `he:亅:hook`, `he:又:again`],
          blocked: [
            `he:水:water`, // learns this because of 氵
            `he:氵:water`,
            `he:汉:chinese`,
          ],
        },
      );
    });

    await test(`prioritises due skills with highest value (rather than most over-due)`, async () => {
      const graph = await skillLearningGraph({
        targetSkills: [`he:分:divide`],
      });

      assert.partialDeepStrictEqual(
        skillReviewQueue({
          graph,
          skillSrsStates: new Map([
            [`he:八:eight`, mockSrsState(`-1d`, `-5m`)],
            [`he:刀:knife`, mockSrsState(`-1d`, `-5m`)],
          ]),
        }),
        {
          available: [
            `he:八:eight`,
            `he:刀:knife`,
            `he:丿:slash`,
            `he:𠃌:radical`,
          ],
          blocked: [`he:分:divide`],
          dueCount: 2,
          overDueCount: 0,
        },
      );
    });

    await test(`schedules new skills in dependency order`, async () => {
      const graph = await skillLearningGraph({
        targetSkills: [`he:分:divide`],
      });

      assert.partialDeepStrictEqual(
        skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
        }),
        {
          available: [`he:丿:slash`, `he:𠃌:radical`, `he:八:eight`],
          blocked: [`he:刀:knife`, `he:分:divide`],
        },
      );
    });

    await test(`schedules skill reviews in order of due, and then deterministic random`, async () => {
      const graph = await skillLearningGraph({
        targetSkills: [`he:分:divide`, `he:一:one`],
      });

      assert.partialDeepStrictEqual(
        skillReviewQueue({
          graph,
          skillSrsStates: new Map([
            [`he:一:one`, mockSrsState(`-10m`, `-2h`)], // due two hours ago
            [`he:𠃌:radical`, mockSrsState(`0s`, `-1h`)], // due one hour ago
            [`he:八:eight`, mockSrsState(`-10m`, `1h`)], // due in one hour,
            [`he:刀:knife`, mockSrsState(`-10m`, `2h`)], // due in two hours,
          ]),
        }),
        {
          available: [
            `he:一:one`,
            `he:𠃌:radical`,
            `he:丿:slash`,
            `he:刀:knife`,
            `he:八:eight`,
          ],
          blocked: [`he:分:divide`],
          dueCount: 2,
          overDueCount: 0,
        },
      );
    });
  });

  await test(`${SkillType.HanziWordToPinyin} skills`, async () => {
    await test(`doesn't learn pinyin for all constituents of a single character`, async () => {
      const graph = await skillLearningGraph({ targetSkills: [`hp:好:good`] });
      assert.partialDeepStrictEqual(
        skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
        }),
        {
          available: [`he:子:child`, `he:女:woman`],
          blocked: [
            `he:好:good`,
            `hpi:好:good`,
            `hpf:好:good`,
            `hpt:好:good`,
            `hp:好:good`,
          ],
        },
      );
    });

    await test(`learns the pinyin for each character in multi-character words`, async () => {
      const graph = await skillLearningGraph({
        targetSkills: [`hp:一样:same`],
      });

      const queue = skillReviewQueue({
        graph,
        skillSrsStates: new Map(),
      });

      const isHpSkill = (s: Skill) =>
        skillTypeFromSkill(s) === SkillType.HanziWordToPinyin;

      const onlyHpQueue = {
        available: queue.available.filter((s) => isHpSkill(s)),
        blocked: queue.blocked.filter((s) => isHpSkill(s)),
      };

      assert.deepEqual(onlyHpQueue, {
        available: [],
        blocked: [`hp:样:shape`, `hp:一:one`, `hp:一样:same`],
      });
    });

    await test(`schedules new skills in dependency order`, async () => {
      const graph = await skillLearningGraph({
        targetSkills: [`hp:一点儿:aLittle`],
      });

      assert.partialDeepStrictEqual(
        skillReviewQueue({
          graph,
          skillSrsStates: new Map(),
        }),
        {
          available: [
            `he:人:person`,
            `he:八:eight`,
            `he:口:mouth`,
            `he:乚:hidden`,
            `he:丿:slash`,
            `he:一:one`,
          ],
          blocked: [
            `he:火:fire`,
            `he:灬:fire`,
            `he:占:occupy`,
            `he:儿:son`,
            `he:点:oClock`,
            `hpi:儿:son`,
            `hpi:点:oClock`,
            `hpi:一:one`,
            `hpf:儿:son`,
            `hpf:点:oClock`,
            `hpf:一:one`,
            `hpt:儿:son`,
            `hpt:点:oClock`,
            `hpt:一:one`,
            `hp:儿:son`,
            `hp:点:oClock`,
            `hp:一:one`,
            `he:一点儿:aLittle`,
            `hp:一点儿:aLittle`,
          ],
        },
      );
    });

    await test(`treats non-introduced skills as "not stable" and won't dependant skills`, async () => {
      const graph = await skillLearningGraph({
        targetSkills: [`hp:一:one`],
      });

      assert.partialDeepStrictEqual(
        skillReviewQueue({ graph, skillSrsStates: new Map() }),
        {
          available: [`he:一:one`],
          blocked: [`hpi:一:one`, `hpf:一:one`, `hpt:一:one`, `hp:一:one`],
        },
      );

      assert.partialDeepStrictEqual(
        skillReviewQueue({
          graph,
          skillSrsStates: new Map([
            [`he:一:one`, fsrsSrsState(`-1d`, `-5m`, Rating.Good)],
          ]),
        }),
        {
          available: [`he:一:one`, `hpi:一:one`],
          blocked: [`hpf:一:one`, `hpt:一:one`, `hp:一:one`],
          dueCount: 1,
          overDueCount: 0,
        },
      );

      assert.partialDeepStrictEqual(
        skillReviewQueue({
          graph,
          skillSrsStates: new Map([
            [`he:一:one`, fsrsSrsState(`-1d`, `-6m`, Rating.Good)],
            [`hpi:一:one`, fsrsSrsState(`-1d`, `-4m`, Rating.Good)],
          ]),
        }),
        {
          available: [`he:一:one`, `hpi:一:one`, `hpf:一:one`],
          blocked: [`hpt:一:one`, `hp:一:one`],
          dueCount: 2,
          overDueCount: 0,
        },
      );
    });
  });
});

await test(`${computeSkillRating.name} suite`, async () => {
  await test(`includes duration and skill`, async () => {
    const skill = `he:我:i`;
    const durationMs = 1234;

    const rating = computeSkillRating({
      skill,
      durationMs,
      correct: true,
    });
    assert.partialDeepStrictEqual(rating, { skill, durationMs });
  });

  await test(`${SkillType.HanziWordToGloss} suites`, async () => {
    const skill = `he:我:i`;

    await test(`gives rating based on duration`, async () => {
      {
        const { rating } = computeSkillRating({
          skill,
          durationMs: 1000,
          correct: true,
        });
        assert.equal(rating, Rating.Easy);
      }

      {
        const { rating } = computeSkillRating({
          skill,
          durationMs: 6000,
          correct: true,
        });
        assert.equal(rating, Rating.Good);
      }

      {
        const { rating } = computeSkillRating({
          skill,
          durationMs: 11_000,
          correct: true,
        });
        assert.equal(rating, Rating.Hard);
      }
    });
  });
});
