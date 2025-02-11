import { HanziSkill, SkillType } from "#data/model.ts";
import {
  hanziWordToEnglish,
  radicalToEnglish,
  skillId,
  skillLearningGraph,
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
    assert.deepEqual(await skillLearningGraph({ targetSkills: [] }), new Map());
  });

  await test(`includes the target skill in the graph`, async () => {
    const skill: HanziSkill = {
      type: SkillType.HanziWordToEnglish,
      hanzi: `我`,
    };

    assert.deepEqual(
      await skillLearningGraph({ targetSkills: [skill] }),
      new Map([[skillId(skill), { skill, dependencies: new Set() }]]),
    );
  });

  await test(`includes decomposition dependencies when learning 好`, async () => {
    const goodHanziWordToEnglish = hanziWordToEnglish(`好`);
    const womanRadicalToEnglish = radicalToEnglish(`女`, `woman`);
    const childRadicalToEnglish = radicalToEnglish(`子`, `child`);

    assert.deepEqual(
      await skillLearningGraph({ targetSkills: [goodHanziWordToEnglish] }),
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
            dependencies: new Set([skillId(hanziWordToEnglish(`女`))]),
          },
        ],
        [
          skillId(childRadicalToEnglish),
          {
            skill: childRadicalToEnglish,
            dependencies: new Set([skillId(hanziWordToEnglish(`子`))]),
          },
        ],
        [
          skillId(hanziWordToEnglish(`女`)),
          { skill: hanziWordToEnglish(`女`), dependencies: new Set() },
        ],
        [
          skillId(hanziWordToEnglish(`子`)),
          { skill: hanziWordToEnglish(`子`), dependencies: new Set() },
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
    });
  });

  await test.todo(`splits words into characters`);
});
