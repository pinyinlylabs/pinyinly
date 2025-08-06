import { SkillKind } from "#data/model.ts";
import { rSkill, rSkillKind } from "#data/rizzleSchema.ts";
import { hanziWordToGloss } from "#data/skills.ts";
import { r } from "#util/rizzle.ts";
import type { DeepReadonly, ReadonlyJSONValue } from "replicache";
import { expect, test, vi } from "vitest";
import { makeMockTx } from "../util/rizzleHelpers.ts";

test(`skill as key`, async () => {
  const posts = r.entity(`foo/[skill]`, {
    skill: rSkill(),
    text: r.string(),
  });

  // Marshal and unmarshal round tripping
  for (const skill of [`eh:好:good`, `he:好:good`] as const) {
    using tx = makeMockTx();
    const setSpy = vi.spyOn(tx, `set`);
    const getSpy = vi.spyOn(tx, `get`);

    await posts.set(tx, { skill }, { skill, text: `hello` });
    const [, marshaledData] = setSpy.mock.calls[0]!;
    getSpy.mockImplementationOnce(
      async () => marshaledData as DeepReadonly<ReadonlyJSONValue>,
    );
    await expect(posts.get(tx, { skill })).resolves.toEqual({
      skill,
      text: `hello`,
    });
    expect(getSpy.mock.calls.length).toEqual(1);
    expect(getSpy.mock.calls[0]).toEqual([`foo/${skill}`]);
  }
});

test(`rSkillKind()` satisfies HasNameOf<typeof rSkillKind>, async () => {
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
    using tx = makeMockTx();
    const setSpy = vi.spyOn(tx, `set`);
    const getSpy = vi.spyOn(tx, `get`);

    await posts.set(tx, { id: `1` }, { id: `1`, skill: skillKind });
    const [, marshaledData] = setSpy.mock.calls[0]!;
    getSpy.mockImplementationOnce(
      async () => marshaledData as DeepReadonly<ReadonlyJSONValue>,
    );
    await expect(posts.get(tx, { id: `1` })).resolves.toEqual({
      id: `1`,
      skill: skillKind,
    });
  }
});

test(`rSkill()` satisfies HasNameOf<typeof rSkill>, async () => {
  const posts = r.entity(`foo/[id]`, {
    id: r.string(),
    skill: rSkill(),
  });

  // Marshal and unmarshal round tripping
  for (const skill of [hanziWordToGloss(`好:good`)] as const) {
    using tx = makeMockTx();
    const setSpy = vi.spyOn(tx, `set`);
    const getSpy = vi.spyOn(tx, `get`);

    const id = `1`;
    await posts.set(tx, { id }, { id, skill });
    const [, marshaledData] = setSpy.mock.calls[0]!;
    getSpy.mockImplementationOnce(
      async () => marshaledData as DeepReadonly<ReadonlyJSONValue>,
    );
    await expect(posts.get(tx, { id })).resolves.toEqual({ id, skill });
  }
});
