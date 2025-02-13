import {
  hanziWordToEnglish,
  radicalToEnglish,
  skillId,
  skillLearningGraph,
  skillReviewQueue,
} from "#data/skills.ts";
import {
  allHsk1Words,
  allHsk2Words,
  allHsk3Words,
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
    const skill = hanziWordToEnglish(`我`);

    assert.deepEqual(
      await skillLearningGraph({
        targetSkills: [skill],
        isSkillLearned: () => false,
      }),
      new Map([[skillId(skill), { skill, dependencies: new Set() }]]),
    );
  });

  await test(`includes decomposition dependencies when learning 好`, async () => {
    const goodHanziWordToEnglish = hanziWordToEnglish(`好`);
    const womanRadicalToEnglish = radicalToEnglish(`女`, `woman`);
    const childRadicalToEnglish = radicalToEnglish(`子`, `child`);

    assert.deepEqual(
      await skillLearningGraph({
        targetSkills: [goodHanziWordToEnglish],
        isSkillLearned: () => false,
      }),
      new Map([
        [
          skillId(goodHanziWordToEnglish),
          {
            skill: goodHanziWordToEnglish,
            dependencies: new Set([
              skillId(womanRadicalToEnglish),
              skillId(childRadicalToEnglish),
            ]),
          },
        ],
        [
          skillId(womanRadicalToEnglish),
          {
            skill: womanRadicalToEnglish,
            dependencies: new Set(),
          },
        ],
        [
          skillId(childRadicalToEnglish),
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
        targetSkills: [hanziWordToEnglish(`外`)],
        isSkillLearned: () => false,
      }),
      new Map([
        [
          skillId(hanziWordToEnglish(`外`)),
          {
            skill: hanziWordToEnglish(`外`),
            dependencies: new Set([
              skillId(radicalToEnglish(`夕`, `evening`)),
              skillId(radicalToEnglish(`卜`, `divination`)),
            ]),
          },
        ],
        [
          skillId(radicalToEnglish(`夕`, `evening`)),
          {
            skill: radicalToEnglish(`夕`, `evening`),
            dependencies: new Set([
              skillId(radicalToEnglish(`丶`, `dot`)),
              skillId(hanziWordToEnglish(`𠂊`)),
            ]),
          },
        ],
        [
          skillId(radicalToEnglish(`丶`, `dot`)),
          {
            skill: radicalToEnglish(`丶`, `dot`),
            dependencies: new Set([]),
          },
        ],
        [
          skillId(radicalToEnglish(`卜`, `divination`)),
          {
            skill: radicalToEnglish(`卜`, `divination`),
            dependencies: new Set([]),
          },
        ],
        [
          skillId(hanziWordToEnglish(`𠂊`)),
          {
            skill: hanziWordToEnglish(`𠂊`),
            dependencies: new Set([]),
          },
        ],
      ]),
    );
  });

  await test(`works for hsk1 words`, async () => {
    await skillLearningGraph({
      targetSkills: [
        ...(await allHsk1Words()).map((w) => hanziWordToEnglish(w)),
        ...(await allHsk2Words()).map((w) => hanziWordToEnglish(w)),
        ...(await allHsk3Words()).map((w) => hanziWordToEnglish(w)),
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
      targetSkills: [hanziWordToEnglish(`好`)],
      isSkillLearned: () => false,
    });
    assert.deepEqual(skillReviewQueue(graph), [
      skillId(radicalToEnglish(`子`, `child`)),
      skillId(radicalToEnglish(`女`, `woman`)),
      skillId(hanziWordToEnglish(`好`)),
    ]);
  });

  await test(`skips learned skills and their dependencies`, async () => {
    const graph = await skillLearningGraph({
      targetSkills: [hanziWordToEnglish(`好`)],
      isSkillLearned: (skill) =>
        [skillId(radicalToEnglish(`子`, `child`))].includes(skill),
    });

    assert.deepEqual(skillReviewQueue(graph), [
      skillId(radicalToEnglish(`女`, `woman`)),
      skillId(hanziWordToEnglish(`好`)),
    ]);
  });
});
