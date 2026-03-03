import type {
  AssetId,
  HanziWord,
  PinyinlyObjectId,
  PinyinSoundId,
  Skill,
} from "#data/model.ts";
import {
  assetIdFromPinyinlyObjectId,
  assetIdPinyinlyObjectId,
  assetIdPinyinlyObjectIdKind,
  assetIdSchema,
  hanziWordFromPinyinlyObjectId,
  hanziWordPinyinlyObjectId,
  hanziWordPinyinlyObjectIdKind,
  pinyinlyObjectIdKind,
  pinyinSoundIdPinyinlyObjectId,
  pinyinSoundIdPinyinlyObjectIdKind,
  skillIdFromPinyinlyObjectId,
  skillPinyinlyObjectId,
  skillPinyinlyObjectIdKind,
  soundIdFromPinyinlyObjectId,
} from "#data/model.ts";
import { describe, expect, test } from "vitest";

describe(`assetIdSchema` satisfies HasNameOf<typeof assetIdSchema>, () => {
  test(`accepts valid sha256 base64url asset IDs`, () => {
    // Each hash must be exactly 43 characters
    const validIds = [
      `sha256/${`a`.repeat(43)}`,
      `sha256/${`0123456789`.repeat(4) + `012`}`, // 43 chars
      `sha256/${`abc`.repeat(14) + `a`}`, // 43 chars
      `sha256/${`_`.repeat(43)}`,
      `sha256/${`-`.repeat(43)}`,
    ];

    for (const id of validIds) {
      const result = assetIdSchema.safeParse(id);
      if (!result.success) {
        console.error(`Failed for id: ${id}`, result.error);
      }
      expect(result.success).toBe(true);
    }
  });

  test(`rejects asset IDs with wrong prefix`, () => {
    const result = assetIdSchema.safeParse(
      `sha512/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNO`,
    );
    expect(result.success).toBe(false);
  });

  test(`rejects asset IDs with missing prefix`, () => {
    const result = assetIdSchema.safeParse(
      `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNO`,
    );
    expect(result.success).toBe(false);
  });

  test(`rejects asset IDs with wrong hash length`, () => {
    // Too short
    expect(
      assetIdSchema.safeParse(`sha256/abcdefghijklmnopqrstuvwxyz`).success,
    ).toBe(false);

    // Too long
    expect(
      assetIdSchema.safeParse(
        `sha256/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRST`,
      ).success,
    ).toBe(false);
  });

  test(`rejects asset IDs with invalid base64url characters`, () => {
    expect(
      assetIdSchema.safeParse(
        `sha256/abcdefghijklmnopqrstuvwxyz+BCDEFGHIJKLMNO`,
      ).success,
    ).toBe(false);

    expect(
      assetIdSchema.safeParse(
        `sha256/abcdefghijklmnopqrstuvwxyz/BCDEFGHIJKLMNO`,
      ).success,
    ).toBe(false);

    expect(
      assetIdSchema.safeParse(
        `sha256/abcdefghijklmnopqrstuvwxyz=BCDEFGHIJKLMNO`,
      ).success,
    ).toBe(false);
  });

  test(`rejects empty string`, () => {
    expect(assetIdSchema.safeParse(``).success).toBe(false);
  });
});

describe(
  `pinyinlyObjectIdKind` satisfies HasNameOf<typeof pinyinlyObjectIdKind>,
  () => {
    test(`returns hanziWordPinyinlyObjectIdKind for hanzi word IDs`, () => {
      const objectId: PinyinlyObjectId = `hw/好:positive`;
      expect(pinyinlyObjectIdKind(objectId)).toBe(
        hanziWordPinyinlyObjectIdKind,
      );
    });

    test(`returns skillPinyinlyObjectIdKind for skill IDs`, () => {
      const objectId: PinyinlyObjectId = `sk/he:好:positive`;
      expect(pinyinlyObjectIdKind(objectId)).toBe(skillPinyinlyObjectIdKind);
    });

    test(`returns pinyinSoundIdPinyinlyObjectIdKind for pinyin sound IDs`, () => {
      const objectId: PinyinlyObjectId = `ps/n-`;
      expect(pinyinlyObjectIdKind(objectId)).toBe(
        pinyinSoundIdPinyinlyObjectIdKind,
      );
    });

    test(`returns assetIdPinyinlyObjectIdKind for asset IDs`, () => {
      const objectId: PinyinlyObjectId = `a/sha256/${`a`.repeat(43)}`;
      expect(pinyinlyObjectIdKind(objectId)).toBe(assetIdPinyinlyObjectIdKind);
    });

    test(`returns null for unknown kind`, () => {
      // @ts-expect-error: Intentionally testing invalid format
      const objectId: PinyinlyObjectId = `unknown/something`;
      expect(pinyinlyObjectIdKind(objectId)).toBeNull();
    });

    test(`returns null for malformed ID`, () => {
      // @ts-expect-error: Intentionally testing invalid format
      const objectId: PinyinlyObjectId = `no-slash`;
      expect(pinyinlyObjectIdKind(objectId)).toBeNull();
    });
  },
);

describe(
  `hanziWordFromPinyinlyObjectId` satisfies HasNameOf<
    typeof hanziWordFromPinyinlyObjectId
  >,
  () => {
    test(`extracts hanzi word from valid ID`, () => {
      const hanziWord = `好:positive` as HanziWord;
      const objectId = hanziWordPinyinlyObjectId(hanziWord);
      const result = hanziWordFromPinyinlyObjectId(objectId);
      expect(result).toBe(hanziWord);
    });

    test(`returns null for non-hanzi-word IDs`, () => {
      const skillObjectId: PinyinlyObjectId = `sk/he:好:positive`;
      expect(hanziWordFromPinyinlyObjectId(skillObjectId)).toBeNull();
    });

    test(`handles hanzi words with colons in the word part`, () => {
      const hanziWord = `多:many` as HanziWord;
      const objectId = hanziWordPinyinlyObjectId(hanziWord);
      const result = hanziWordFromPinyinlyObjectId(objectId);
      expect(result).toBe(hanziWord);
    });
  },
);

describe(
  `skillIdFromPinyinlyObjectId` satisfies HasNameOf<
    typeof skillIdFromPinyinlyObjectId
  >,
  () => {
    test(`extracts skill ID from valid skill object ID`, () => {
      const skill = `he:好:positive` as Skill;
      const objectId = skillPinyinlyObjectId(skill);
      const result = skillIdFromPinyinlyObjectId(objectId);
      expect(result).toBe(skill);
    });

    test(`returns null for non-skill IDs`, () => {
      const hanziWordObjectId: PinyinlyObjectId = `hw/好:positive`;
      expect(skillIdFromPinyinlyObjectId(hanziWordObjectId)).toBeNull();
    });

    test(`handles various skill types`, () => {
      const skills: readonly Skill[] = [
        `he:好:positive`,
        `het:好:positive`,
        `eh:好:positive`,
        `hpi:好:positive`,
        `hpf:好:positive`,
        `hpt:好:positive`,
      ];

      for (const skill of skills) {
        const objectId = skillPinyinlyObjectId(skill);
        const result = skillIdFromPinyinlyObjectId(objectId);
        expect(result).toBe(skill);
      }
    });
  },
);

describe(
  `soundIdFromPinyinlyObjectId` satisfies HasNameOf<
    typeof soundIdFromPinyinlyObjectId
  >,
  () => {
    test(`extracts sound ID from valid sound object ID`, () => {
      const soundId = `n-` as PinyinSoundId;
      const objectId = pinyinSoundIdPinyinlyObjectId(soundId);
      const result = soundIdFromPinyinlyObjectId(objectId);
      expect(result).toBe(soundId);
    });

    test(`returns null for non-sound IDs`, () => {
      const skillObjectId: PinyinlyObjectId = `sk/he:好:positive`;
      expect(soundIdFromPinyinlyObjectId(skillObjectId)).toBeNull();
    });

    test(`handles various sound ID formats`, () => {
      const soundIds: readonly PinyinSoundId[] = [
        `p-` as PinyinSoundId,
        `b-` as PinyinSoundId,
        `-an` as PinyinSoundId,
        `-ang` as PinyinSoundId,
        `3` as PinyinSoundId,
        `4` as PinyinSoundId,
        `sh-` as PinyinSoundId,
        `-ong` as PinyinSoundId,
      ];

      for (const soundId of soundIds) {
        const objectId = pinyinSoundIdPinyinlyObjectId(soundId);
        const result = soundIdFromPinyinlyObjectId(objectId);
        expect(result).toBe(soundId);
      }
    });
  },
);

describe(
  `assetIdFromPinyinlyObjectId` satisfies HasNameOf<
    typeof assetIdFromPinyinlyObjectId
  >,
  () => {
    test(`extracts asset ID from valid asset object ID`, () => {
      const assetId = `sha256/${`a`.repeat(43)}` as AssetId;
      const objectId = assetIdPinyinlyObjectId(assetId);
      const result = assetIdFromPinyinlyObjectId(objectId);
      expect(result).toBe(assetId);
    });

    test(`returns null for non-asset IDs`, () => {
      const hanziWordObjectId: PinyinlyObjectId = `hw/好:positive`;
      expect(assetIdFromPinyinlyObjectId(hanziWordObjectId)).toBeNull();
    });

    test(`handles different valid asset ID formats`, () => {
      const assetIds: readonly AssetId[] = [
        `sha256/${`0`.repeat(43)}` as AssetId,
        `sha256/${`a`.repeat(43)}` as AssetId,
        `sha256/${`z`.repeat(43)}` as AssetId,
        `sha256/${`_`.repeat(43)}` as AssetId,
        `sha256/${`-`.repeat(43)}` as AssetId,
      ];

      for (const assetId of assetIds) {
        const objectId = assetIdPinyinlyObjectId(assetId);
        const result = assetIdFromPinyinlyObjectId(objectId);
        expect(result).toBe(assetId);
      }
    });
  },
);

describe(
  `hanziWordPinyinlyObjectId` satisfies HasNameOf<
    typeof hanziWordPinyinlyObjectId
  >,
  () => {
    test(`formats hanzi word into valid object ID`, () => {
      const hanziWord = `好:positive` as HanziWord;
      const objectId = hanziWordPinyinlyObjectId(hanziWord);
      expect(objectId).toBe(`hw/好:positive`);
    });

    test(`produces object ID with correct prefix`, () => {
      const objectId = hanziWordPinyinlyObjectId(`多:many` as HanziWord);
      expect(objectId).toMatch(/^hw\//);
    });

    test(`preserves hanzi word with colons`, () => {
      const hanziWord = `好:like` as HanziWord;
      const objectId = hanziWordPinyinlyObjectId(hanziWord);
      expect(objectId).toBe(`hw/好:like`);
    });
  },
);

describe(
  `skillPinyinlyObjectId` satisfies HasNameOf<typeof skillPinyinlyObjectId>,
  () => {
    test(`formats skill ID into valid object ID`, () => {
      const skill = `he:好:positive` as Skill;
      const objectId = skillPinyinlyObjectId(skill);
      expect(objectId).toBe(`sk/he:好:positive`);
    });

    test(`produces object ID with correct prefix`, () => {
      const objectId = skillPinyinlyObjectId(`het:多:many` as Skill);
      expect(objectId).toMatch(/^sk\//);
    });

    test(`handles all skill type prefixes`, () => {
      const skillPrefixes = [
        `he`,
        `het`,
        `eh`,
        `ph`,
        `hpi`,
        `hpf`,
        `hpt`,
        `ih`,
      ];

      for (const prefix of skillPrefixes) {
        const skill = `${prefix}:好:positive` as Skill;
        const objectId = skillPinyinlyObjectId(skill);
        expect(objectId).toBe(`sk/${skill}`);
      }
    });
  },
);

describe(
  `pinyinSoundIdPinyinlyObjectId` satisfies HasNameOf<
    typeof pinyinSoundIdPinyinlyObjectId
  >,
  () => {
    test(`formats sound ID into valid object ID`, () => {
      const soundId = `n-` as PinyinSoundId;
      const objectId = pinyinSoundIdPinyinlyObjectId(soundId);
      expect(objectId).toBe(`ps/n-`);
    });

    test(`produces object ID with correct prefix`, () => {
      const objectId = pinyinSoundIdPinyinlyObjectId(`-ang` as PinyinSoundId);
      expect(objectId).toMatch(/^ps\//);
    });

    test(`handles various sound ID formats`, () => {
      const soundIds: readonly PinyinSoundId[] = [
        `p-` as PinyinSoundId,
        `b-` as PinyinSoundId,
        `-an` as PinyinSoundId,
        `-ang` as PinyinSoundId,
        `1` as PinyinSoundId,
        `4` as PinyinSoundId,
        `sh-` as PinyinSoundId,
        `-ong` as PinyinSoundId,
      ];

      for (const soundId of soundIds) {
        const objectId = pinyinSoundIdPinyinlyObjectId(soundId);
        expect(objectId).toBe(`ps/${soundId}`);
      }
    });
  },
);

describe(
  `assetIdPinyinlyObjectId` satisfies HasNameOf<typeof assetIdPinyinlyObjectId>,
  () => {
    test(`formats asset ID into valid object ID`, () => {
      const assetId = `sha256/${`a`.repeat(43)}` as AssetId;
      const objectId = assetIdPinyinlyObjectId(assetId);
      expect(objectId).toBe(`a/${assetId}`);
    });

    test(`produces object ID with correct prefix`, () => {
      const objectId = assetIdPinyinlyObjectId(
        `sha256/${`0`.repeat(43)}` as AssetId,
      );
      expect(objectId).toMatch(/^a\//);
    });

    test(`produces correct ID length`, () => {
      const assetId = `sha256/${`a`.repeat(43)}` as AssetId;
      const objectId = assetIdPinyinlyObjectId(assetId);
      // "a/" (2) + "sha256/" (7) + 43 = 52
      expect(objectId.length).toBe(52);
    });
  },
);

describe(`PinyinlyObjectId round-trip conversions`, () => {
  test(`hanzi word round-trip`, () => {
    const originalHanziWord = `好:positive` as HanziWord;
    const objectId = hanziWordPinyinlyObjectId(originalHanziWord);
    const extractedHanziWord = hanziWordFromPinyinlyObjectId(objectId);
    expect(extractedHanziWord).toBe(originalHanziWord);
  });

  test(`skill ID round-trip`, () => {
    const originalSkill = `he:好:positive` as Skill;
    const objectId = skillPinyinlyObjectId(originalSkill);
    const extractedSkill = skillIdFromPinyinlyObjectId(objectId);
    expect(extractedSkill).toBe(originalSkill);
  });

  test(`sound ID round-trip`, () => {
    const originalSoundId = `n-` as PinyinSoundId;
    const objectId = pinyinSoundIdPinyinlyObjectId(originalSoundId);
    const extractedSoundId = soundIdFromPinyinlyObjectId(objectId);
    expect(extractedSoundId).toBe(originalSoundId);
  });

  test(`asset ID round-trip`, () => {
    const originalAssetId = `sha256/${`b`.repeat(43)}` as AssetId;
    const objectId = assetIdPinyinlyObjectId(originalAssetId);
    const extractedAssetId = assetIdFromPinyinlyObjectId(objectId);
    expect(extractedAssetId).toBe(originalAssetId);
  });

  test(`kind detection after formatting`, () => {
    const testCases = [
      {
        objectId: hanziWordPinyinlyObjectId(`好:positive` as HanziWord),
        expectedKind: hanziWordPinyinlyObjectIdKind,
      },
      {
        objectId: skillPinyinlyObjectId(`he:好:positive` as Skill),
        expectedKind: skillPinyinlyObjectIdKind,
      },
      {
        objectId: pinyinSoundIdPinyinlyObjectId(`n-` as PinyinSoundId),
        expectedKind: pinyinSoundIdPinyinlyObjectIdKind,
      },
      {
        objectId: assetIdPinyinlyObjectId(
          `sha256/${`a`.repeat(43)}` as AssetId,
        ),
        expectedKind: assetIdPinyinlyObjectIdKind,
      },
    ];

    for (const { objectId, expectedKind } of testCases) {
      expect(pinyinlyObjectIdKind(objectId)).toBe(expectedKind);
    }
  });
});
