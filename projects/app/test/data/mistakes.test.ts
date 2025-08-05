import { skillsToReReviewForHanziGlossMistake } from "#data/mistakes.ts";
import type { HanziGlossMistakeType } from "#data/model.ts";
import { MistakeKind } from "#data/model.ts";
import { describe, expect, test } from "vitest";
import { 汉 } from "./helpers.ts";

describe(
  `skillsToReReviewForHanziGlossMistake suite` satisfies HasNameOf<
    typeof skillsToReReviewForHanziGlossMistake
  >,
  () => {
    test(`reviews all meanings with the same hanzi`, async () => {
      const mistake: HanziGlossMistakeType = {
        kind: MistakeKind.HanziGloss,
        hanziOrHanziWord: 汉`任`,
        gloss: `xxxxxx`,
      };

      await expect(
        skillsToReReviewForHanziGlossMistake(mistake),
      ).resolves.toEqual(new Set([`he:任:any`, `he:任:appoint`, `he:任:duty`]));
    });

    test(`reviews all meanings with the same meaning`, async () => {
      const mistake: HanziGlossMistakeType = {
        kind: MistakeKind.HanziGloss,
        hanziOrHanziWord: 汉`xx`,
        gloss: `wrong`,
      };

      await expect(
        skillsToReReviewForHanziGlossMistake(mistake),
      ).resolves.toEqual(new Set([`he:不对:incorrect`, `he:错:wrong`]));
    });

    test(`reviews combination from hanzi and gloss`, async () => {
      const mistake: HanziGlossMistakeType = {
        kind: MistakeKind.HanziGloss,
        hanziOrHanziWord: 汉`任`,
        gloss: `wrong`,
      };

      await expect(
        skillsToReReviewForHanziGlossMistake(mistake),
      ).resolves.toEqual(
        new Set([
          `he:不对:incorrect`,
          `he:任:any`,
          `he:任:appoint`,
          `he:任:duty`,
          `he:错:wrong`,
        ]),
      );
    });
  },
);
