import { rSkillMarshal } from "#data/rizzleSchema.ts";
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

void test(skillLearningGraph.name, async () => {
  await test(`no targets gives an empty graph`, async () => {
    assert.deepEqual(
      await skillLearningGraph({
        targetSkills: [],
        isSkillLearned: () => false,
      }),
      new Map(),
    );
  });

  await test(`includes the target skill in the graph`, async () => {
    const skill = hanziWordToEnglish(`我:i`);

    assert.deepEqual(
      await skillLearningGraph({
        targetSkills: [skill],
        isSkillLearned: () => false,
      }),
      new Map([[rSkillMarshal(skill), { skill, dependencies: new Set() }]]),
    );
  });

  await test(`includes decomposition dependencies when learning 好`, async () => {
    const goodHanziWordToEnglish = hanziWordToEnglish(`好:good`);
    const womanRadicalToEnglish = hanziWordToEnglish(`女:woman`);
    const childRadicalToEnglish = hanziWordToEnglish(`子:child`);

    assert.deepEqual(
      await skillLearningGraph({
        targetSkills: [goodHanziWordToEnglish],
        isSkillLearned: () => false,
      }),
      new Map([
        [
          rSkillMarshal(goodHanziWordToEnglish),
          {
            skill: goodHanziWordToEnglish,
            dependencies: new Set([
              rSkillMarshal(womanRadicalToEnglish),
              rSkillMarshal(childRadicalToEnglish),
            ]),
          },
        ],
        [
          rSkillMarshal(womanRadicalToEnglish),
          {
            skill: womanRadicalToEnglish,
            dependencies: new Set(),
          },
        ],
        [
          rSkillMarshal(childRadicalToEnglish),
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
        targetSkills: [hanziWordToEnglish(`外:outside`)],
        isSkillLearned: () => false,
      }),
      new Map([
        [
          rSkillMarshal(hanziWordToEnglish(`外:outside`)),
          {
            skill: hanziWordToEnglish(`外:outside`),
            dependencies: new Set([
              rSkillMarshal(hanziWordToEnglish(`夕:evening`)),
              rSkillMarshal(hanziWordToEnglish(`卜:divine`)),
            ]),
          },
        ],
        [
          rSkillMarshal(hanziWordToEnglish(`夕:evening`)),
          {
            skill: hanziWordToEnglish(`夕:evening`),
            dependencies: new Set([
              rSkillMarshal(hanziWordToEnglish(`丶:dot`)),
              rSkillMarshal(hanziWordToEnglish(`𠂊:hands`)),
            ]),
          },
        ],
        [
          rSkillMarshal(hanziWordToEnglish(`丶:dot`)),
          {
            skill: hanziWordToEnglish(`丶:dot`),
            dependencies: new Set([]),
          },
        ],
        [
          rSkillMarshal(hanziWordToEnglish(`卜:divine`)),
          {
            skill: hanziWordToEnglish(`卜:divine`),
            dependencies: new Set([]),
          },
        ],
        [
          rSkillMarshal(hanziWordToEnglish(`𠂊:hands`)),
          {
            skill: hanziWordToEnglish(`𠂊:hands`),
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
      if (siblingIndex > -1) {
        parentStack.splice(siblingIndex, parentStack.length);
      }

      // If there's a parent, add this as a child.
      const parentId = parentStack[parentStack.length - 1]?.id;
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

  await test(parseTextGraph.name, () => {
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
        targetSkills: [hanziWordToEnglish(`一下儿:aBit`)],
        isSkillLearned: () => false,
      }),
      `
      he:一下儿:aBit
        he:一:one
        he:下:below
          he:一:one
          he:卜:divine
        he:儿:son
      he:儿:son
        he:丿:radicalSlash
      `,
    );
  });

  await test(`works for hsk words`, async () => {
    await skillLearningGraph({
      targetSkills: [
        ...(await allHsk1HanziWords()).map((w) => hanziWordToEnglish(w)),
        ...(await allHsk2HanziWords()).map((w) => hanziWordToEnglish(w)),
        ...(await allHsk3HanziWords()).map((w) => hanziWordToEnglish(w)),
      ],
      isSkillLearned: () => false,
    });
  });

  await test.todo(`splits words into characters`);
});

void test(skillReviewQueue.name, async () => {
  await test(`no skills gives an empty queue`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [],
      isSkillLearned: () => false,
    });
    assert.deepEqual(skillReviewQueue(graph), []);
  });

  await test(`works for 好`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [hanziWordToEnglish(`好:good`)],
      isSkillLearned: () => false,
    });
    assert.deepEqual(skillReviewQueue(graph), [
      rSkillMarshal(hanziWordToEnglish(`子:child`)),
      rSkillMarshal(hanziWordToEnglish(`女:woman`)),
      rSkillMarshal(hanziWordToEnglish(`好:good`)),
    ]);
  });

  await test(`skips learned skills and their dependencies`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [hanziWordToEnglish(`好:good`)],
      isSkillLearned: (skill) =>
        [rSkillMarshal(hanziWordToEnglish(`子:child`))].includes(skill),
    });

    assert.deepEqual(skillReviewQueue(graph), [
      rSkillMarshal(hanziWordToEnglish(`女:woman`)),
      rSkillMarshal(hanziWordToEnglish(`好:good`)),
    ]);
  });
});
