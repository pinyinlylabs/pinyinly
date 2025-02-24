import { rSkillMarshal } from "#data/rizzleSchema.ts";
import {
  hanziWordToEnglish,
  skillLearningGraph,
  skillReviewQueue,
} from "#data/skills.ts";
import {
  allHsk1HanziWords,
  allHsk2HanziWords,
  allHsk3HanziWords,
} from "#dictionary/dictionary.ts";
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

  await test(`works for hsk1 words`, async () => {
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
