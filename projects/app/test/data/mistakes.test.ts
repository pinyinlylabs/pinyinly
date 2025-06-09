import { skillsToReReviewForHanziGlossMistake } from "#data/mistakes.ts";
import type { HanziGlossMistakeType } from "#data/model.ts";
import { MistakeKind } from "#data/model.ts";
import test from "node:test";
import { 汉 } from "./helpers";

await test(`${skillsToReReviewForHanziGlossMistake.name} suite`, async () => {
  await test(`reviews all meanings with the same hanzi`, async () => {
    const mistake: HanziGlossMistakeType = {
      kind: MistakeKind.HanziGloss,
      hanziOrHanziWord: 汉`任`,
      gloss: `xxxxxx`,
    };

    expect(await skillsToReReviewForHanziGlossMistake(mistake)).toEqual(
      new Set([`he:任:any`, `he:任:appoint`, `he:任:duty`]),
    );
  });

  await test(`reviews all meanings with the same meaning`, async () => {
    const mistake: HanziGlossMistakeType = {
      kind: MistakeKind.HanziGloss,
      hanziOrHanziWord: 汉`xx`,
      gloss: `wrong`,
    };

    expect(await skillsToReReviewForHanziGlossMistake(mistake)).toEqual(
      new Set([`he:不对:incorrect`, `he:错:wrong`]),
    );
  });

  await test(`reviews combination from hanzi and gloss`, async () => {
    const mistake: HanziGlossMistakeType = {
      kind: MistakeKind.HanziGloss,
      hanziOrHanziWord: 汉`任`,
      gloss: `wrong`,
    };

    expect(await skillsToReReviewForHanziGlossMistake(mistake)).toEqual(
      new Set([
        `he:不对:incorrect`,
        `he:任:any`,
        `he:任:appoint`,
        `he:任:duty`,
        `he:错:wrong`,
      ]),
    );
  });
});
