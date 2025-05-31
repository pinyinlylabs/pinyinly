import { SkillKind } from "#data/model.ts";
import { rSkill, rSkillKind } from "#data/rizzleSchema.ts";
import { hanziWordToGloss } from "#data/skills.ts";
import { r } from "#util/rizzle.ts";
import assert from "node:assert/strict";
import type { TestContext } from "node:test";
import test from "node:test";
import type { ReadTransaction, WriteTransaction } from "replicache";

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

await test(`skill as key`, async (t) => {
  const posts = r.entity(`foo/[skill]`, {
    skill: rSkill(),
    text: r.string(),
  });

  // Marshal and unmarshal round tripping
  for (const skill of [`eh:好:good`, `he:好:good`] as const) {
    using tx = makeMockTx(t);
    await posts.set(tx, { skill }, { skill, text: `hello` });
    const [, marshaledData] = tx.set.mock.calls[0]!.arguments;
    tx.get.mock.mockImplementationOnce(async () => marshaledData);
    assert.deepEqual(await posts.get(tx, { skill }), {
      skill,
      text: `hello`,
    });
    assert.equal(tx.get.mock.callCount(), 1);
    assert.deepEqual(tx.get.mock.calls[0]?.arguments, [`foo/${skill}`]);
  }
});

await test(`${rSkillKind.name}()`, async (t) => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    skill: rSkillKind(),
  });

  // Marshal and unmarshal round tripping
  for (const skillKind of [
    SkillKind.Deprecated_EnglishToRadical,
    SkillKind.Deprecated_PinyinToRadical,
    SkillKind.Deprecated_RadicalToEnglish,
    SkillKind.Deprecated_RadicalToPinyin,
    SkillKind.Deprecated,
    SkillKind.GlossToHanziWord,
    SkillKind.HanziWordToGloss,
    SkillKind.HanziWordToPinyin,
    SkillKind.HanziWordToPinyinFinal,
    SkillKind.HanziWordToPinyinInitial,
    SkillKind.HanziWordToPinyinTone,
    SkillKind.ImageToHanziWord,
    SkillKind.PinyinToHanziWord,
  ] as const) {
    using tx = makeMockTx(t);

    await posts.set(tx, { id: `1` }, { id: `1`, skill: skillKind });
    const [, marshaledData] = tx.set.mock.calls[0]!.arguments;
    tx.get.mock.mockImplementationOnce(async () => marshaledData);
    assert.deepEqual(await posts.get(tx, { id: `1` }), {
      id: `1`,
      skill: skillKind,
    });
  }
});

await test(`${rSkill.name}()`, async (t) => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    skill: rSkill(),
  });

  // Marshal and unmarshal round tripping
  for (const skill of [hanziWordToGloss(`好:good`)] as const) {
    using tx = makeMockTx(t);
    const id = `1`;
    await posts.set(tx, { id }, { id, skill });
    const [, marshaledData] = tx.set.mock.calls[0]!.arguments;
    tx.get.mock.mockImplementationOnce(async () => marshaledData);
    assert.deepEqual(await posts.get(tx, { id }), { id, skill });
  }
});
