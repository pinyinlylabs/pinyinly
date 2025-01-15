import { SkillType } from "#data/model.ts";
import { rSkill, rSkillType } from "#data/rizzleSchema.ts";
import { r } from "#util/rizzle.ts";
import assert from "node:assert/strict";
import test, { TestContext } from "node:test";
import { ReadTransaction, WriteTransaction } from "replicache";

function makeMockTx(t: TestContext) {
  const readTx = {
    get: t.mock.fn<ReadTransaction[`get`]>(async () => undefined),
    scan: t.mock.fn<ReadTransaction[`scan`]>(() => {
      return null as never;
    }),
    clientID: null as never,
    environment: null as never,
    location: null as never,
    has: null as never,
    isEmpty: null as never,
  } satisfies ReadTransaction;

  const writeTx = {
    ...readTx,
    set: t.mock.fn<WriteTransaction[`set`]>(async () => undefined),
    mutationID: null as never,
    reason: null as never,
    put: null as never,
    del: null as never,
  } satisfies WriteTransaction;

  return {
    ...writeTx,
    readonly: readTx,
    [Symbol.dispose]: () => {
      writeTx.get.mock.resetCalls();
      writeTx.set.mock.resetCalls();
      writeTx.scan.mock.resetCalls();
    },
  };
}

void test(`skillId as key`, async (t) => {
  const posts = r.entity(`foo/[skill]`, {
    skill: rSkill(),
    text: r.string(),
  });

  // Marshal and unmarshal round tripping
  for (const [skill, skillId] of [
    [{ type: SkillType.EnglishToHanzi, hanzi: `好` }, `eh:好`],
    [
      { type: SkillType.RadicalToEnglish, hanzi: `好`, name: `good` },
      `re:好:good`,
    ],
    [
      { type: SkillType.RadicalToPinyin, hanzi: `好`, pinyin: `hǎo` },
      `rp:好:hǎo`,
    ],
  ] as const) {
    using tx = makeMockTx(t);
    await posts.set(tx, { skill }, { text: `hello` });
    const [, marshaledData] = tx.set.mock.calls[0]!.arguments;
    tx.get.mock.mockImplementationOnce(async () => marshaledData);
    assert.deepEqual(await posts.get(tx, { skill }), {
      text: `hello`,
    });
    assert.equal(tx.get.mock.callCount(), 1);
    assert.deepEqual(tx.get.mock.calls[0]?.arguments, [`foo/${skillId}`]);
  }
});

void test(`skillType()`, async (t) => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    skill: rSkillType,
  });

  // Marshal and unmarshal round tripping
  for (const skillType of [
    SkillType.RadicalToEnglish,
    SkillType.EnglishToRadical,
    SkillType.RadicalToPinyin,
    SkillType.PinyinToRadical,
    SkillType.HanziWordToEnglish,
    SkillType.HanziWordToPinyinInitial,
    SkillType.HanziWordToPinyinFinal,
    SkillType.HanziWordToPinyinTone,
    SkillType.EnglishToHanzi,
    SkillType.PinyinToHanzi,
    SkillType.ImageToHanzi,
  ] as const) {
    using tx = makeMockTx(t);

    await posts.set(tx, { id: `1` }, { skill: skillType });
    const [, marshaledData] = tx.set.mock.calls[0]!.arguments;
    tx.get.mock.mockImplementationOnce(async () => marshaledData);
    assert.deepEqual(await posts.get(tx, { id: `1` }), {
      skill: skillType,
    });
  }
});

void test(`skillId()`, async (t) => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    skill: rSkill(),
  });

  // Marshal and unmarshal round tripping
  for (const skill of [
    { type: SkillType.EnglishToHanzi, hanzi: `好` },
  ] as const) {
    using tx = makeMockTx(t);
    await posts.set(tx, { id: `1` }, { skill });
    const [, marshaledData] = tx.set.mock.calls[0]!.arguments;
    tx.get.mock.mockImplementationOnce(async () => marshaledData);
    assert.deepEqual(await posts.get(tx, { id: `1` }), {
      skill,
    });
  }
});
