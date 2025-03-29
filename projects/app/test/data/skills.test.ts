import {
  hanziWordToEnglish,
  SkillLearningGraph,
  skillLearningGraph,
  skillReviewQueue,
} from "#data/skills.ts";
import {
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
} from "#dictionary/dictionary.ts";
import { invariant } from "@haohaohow/lib/invariant";
import assert from "node:assert/strict";
import test from "node:test";
import { mockSrsState } from "./helpers";

await test(`${skillLearningGraph.name} suite`, async () => {
  await test(`no targets gives an empty graph`, async () => {
    assert.deepEqual(
      await skillLearningGraph({
        targetSkills: [],
        shouldSkipSubTree: () => false,
      }),
      new Map(),
    );
  });

  await test(`includes the target skill in the graph`, async () => {
    const skill = `he:我:i`;

    assert.deepEqual(
      await skillLearningGraph({
        targetSkills: [skill],
        shouldSkipSubTree: () => false,
      }),
      new Map([[skill, { skill, dependencies: new Set() }]]),
    );
  });

  await test(`includes decomposition dependencies when learning 好`, async () => {
    const goodHanziWordToEnglish = `he:好:good`;
    const womanRadicalToEnglish = `he:女:woman`;
    const childRadicalToEnglish = `he:子:child`;

    assert.deepEqual(
      await skillLearningGraph({
        targetSkills: [goodHanziWordToEnglish],
        shouldSkipSubTree: () => false,
      }),
      new Map([
        [
          goodHanziWordToEnglish,
          {
            skill: goodHanziWordToEnglish,
            dependencies: new Set([
              womanRadicalToEnglish,
              childRadicalToEnglish,
            ]),
          },
        ],
        [
          womanRadicalToEnglish,
          {
            skill: womanRadicalToEnglish,
            dependencies: new Set(),
          },
        ],
        [
          childRadicalToEnglish,
          {
            skill: childRadicalToEnglish,
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
        shouldSkipSubTree: () => false,
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
      const res = /^(\s*)(.+)$/.exec(line);
      invariant(res != null);
      const [, indentText, id] = res;
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
        shouldSkipSubTree: () => false,
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
      `,
    );
  });

  await test(`works for hsk words`, async () => {
    await skillLearningGraph({
      targetSkills: [
        ...(await allHsk1HanziWords()),
        ...(await allHsk2HanziWords()),
        ...(await allHsk3HanziWords()),
      ].map((w) => hanziWordToEnglish(w)),
      shouldSkipSubTree: () => false,
    });
  });

  await test.todo(`splits words into characters`);
});

await test(`${skillReviewQueue.name} suite`, async () => {
  await test(`no skills gives an empty queue`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [],
      shouldSkipSubTree: () => false,
    });
    assert.deepEqual(
      skillReviewQueue({ graph, skillSrsStates: new Map() }),
      [],
    );
  });

  await test(`works for 好`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [`he:好:good`],
      shouldSkipSubTree: () => false,
    });
    assert.deepEqual(skillReviewQueue({ graph, skillSrsStates: new Map() }), [
      `he:子:child`,
      `he:女:woman`,
      `he:好:good`,
    ]);
  });

  await test(`skips learned skills and their dependencies`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [`he:好:good`],
      shouldSkipSubTree: (skill) => [`he:子:child`].includes(skill),
    });

    assert.deepEqual(skillReviewQueue({ graph, skillSrsStates: new Map() }), [
      `he:女:woman`,
      `he:好:good`,
    ]);
  });

  await test(`prioritises due skills with highest value (rather than most overdue)`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [`he:分:divide`],
      shouldSkipSubTree: () => false,
    });

    assert.deepEqual(
      skillReviewQueue({
        graph,
        skillSrsStates: new Map([
          [`he:八:eight`, mockSrsState(`-1d`, `-5m`)],
          [`he:刀:knife`, mockSrsState(`-1d`, `-5m`)],
        ]),
      }),
      [
        `he:八:eight`,
        `he:刀:knife`,
        `he:丿:slash`,
        `he:𠃌:radical`,
        `he:分:divide`,
      ],
    );
  });

  await test(`schedules new skills in dependency order`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [`he:分:divide`],
      shouldSkipSubTree: () => false,
    });

    assert.deepEqual(
      skillReviewQueue({
        graph,
        skillSrsStates: new Map(),
      }),
      [
        `he:丿:slash`,
        `he:𠃌:radical`,
        `he:刀:knife`,
        `he:八:eight`,
        `he:分:divide`,
      ],
    );
  });

  await test(`schedules skill reviews in order of due, and then deterministic random`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [`he:分:divide`, `he:一:one`],
      shouldSkipSubTree: () => false,
    });

    assert.deepEqual(
      skillReviewQueue({
        graph,
        skillSrsStates: new Map([
          [`he:一:one`, mockSrsState(`-10m`, `-2h`)], // due two hours ago
          [`he:𠃌:radical`, mockSrsState(`0s`, `-1h`)], // due one hour ago
          [`he:八:eight`, mockSrsState(`-10m`, `1h`)], // due in one hour,
          [`he:刀:knife`, mockSrsState(`-10m`, `2h`)], // due in two hours,
        ]),
      }),
      [
        `he:一:one`,
        `he:𠃌:radical`,
        `he:丿:slash`,
        `he:分:divide`,
        `he:刀:knife`,
        `he:八:eight`,
      ],
    );
  });
});
