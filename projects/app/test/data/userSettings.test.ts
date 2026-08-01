import {
  decodeUserSettingValue,
  encodeUserSettingStoredValue,
  getUserSettingKeyInfo,
  getImageSettingKeyPatterns,
  hanziPronunciationHintImageSetting,
  hanziWordMeaningHintImageSetting,
  imageSettingDefs,
  pinyinFinalSoundLocationSelectionSetting,
  actorIdentityImageSetting,
  actorModelSheetImageSetting,
  locationIdentityImageSetting,
  locationThoughtChainsJsonSetting,
  locationSetIdentityImageSetting,
  pinyinSoundImageSetting,
  userNameTextSetting,
  userHanziMeaningDefs,
  userHanziMeaningGlossSetting,
  userHanziMeaningNoteSetting,
  userHanziMeaningPinyinSetting,
  userSettingDefinitions,
  userHanziSettingLike,
} from "#data/userSettings.ts";
import type { PinyinSoundId, LocationId } from "#data/model.ts";
import { describe, expect, test } from "vitest";
import { 汉 } from "./helpers";

const testSoundId = `-a` as PinyinSoundId;
const testLocationId = `place_123` as LocationId;

function expectUniqueSettingKeyPaths(
  settings: readonly { entity: { _def: { keyPath: string } } }[],
) {
  const keyPaths = settings.map((setting) => setting.entity._def.keyPath);
  expect(new Set(keyPaths).size).toBe(keyPaths.length);
}

describe(`imageSettings` satisfies HasNameOf<typeof imageSettingDefs>, () => {
  test(`contains all image setting entities`, () => {
    expect(new Set(imageSettingDefs)).toEqual(
      new Set([
        actorIdentityImageSetting,
        actorModelSheetImageSetting,
        locationIdentityImageSetting,
        locationSetIdentityImageSetting,
        pinyinSoundImageSetting,
        hanziWordMeaningHintImageSetting,
        hanziPronunciationHintImageSetting,
      ]),
    );
  });

  test(`all settings have imageId field`, () => {
    for (const setting of imageSettingDefs) {
      const valueShape = setting.entity._def.valueType._def.shape;
      expect(valueShape).toHaveProperty(`imageId`);
    }
  });

  test(
    `imageSettingDefs has unique entries` satisfies HasNameOf<
      typeof imageSettingDefs
    >,
    () => {
      expectUniqueSettingKeyPaths(imageSettingDefs);
    },
  );
});

describe(
  `getImageSettingKeyPatterns` satisfies HasNameOf<
    typeof getImageSettingKeyPatterns
  >,
  () => {
    test(`returns SQL LIKE patterns for all image settings`, () => {
      const patterns = getImageSettingKeyPatterns();

      expect(patterns).toMatchInlineSnapshot(`
        [
          "psai/%",
          "psams/%",
          "pspi/%",
          "pspli/%",
          "psi/%",
          "hwmhi/%",
          "hphi/%",
        ]
      `);
    });

    test(`extracts prefix before first parameter`, () => {
      const patterns = getImageSettingKeyPatterns();

      // Each pattern should end with '%' for SQL LIKE matching
      for (const pattern of patterns) {
        expect(pattern).toMatch(/%$/u);
      }

      // Each pattern should have extracted the prefix before '[' correctly
      for (const pattern of patterns) {
        expect(pattern).not.toContain(`[`);
      }
    });
  },
);

describe(
  `getUserSettingKeyInfo` satisfies HasNameOf<typeof getUserSettingKeyInfo>,
  () => {
    test(`returns marshaled key metadata for keyed settings`, () => {
      const keyInfo = getUserSettingKeyInfo(
        pinyinFinalSoundLocationSelectionSetting,
        { soundId: testSoundId },
      );

      expect(keyInfo.settingKey).toBe(`pfsps/-a`);
      expect(keyInfo.keyParamAliases).toEqual([`s`]);
      expect(keyInfo.keyParamMarshaled).toEqual({ s: `-a` });
    });

    test(`returns empty key metadata for keyless settings`, () => {
      const keyInfo = getUserSettingKeyInfo(userNameTextSetting, {});

      expect(keyInfo.settingKey).toBe(`userName`);
      expect(keyInfo.keyParamAliases).toEqual([]);
      expect(keyInfo.keyParamMarshaled).toEqual({});
    });
  },
);

describe(
  `decodeUserSettingValue` satisfies HasNameOf<typeof decodeUserSettingValue>,
  () => {
    test(`decodes keyed setting when stored value omits key fields`, () => {
      const decoded = decodeUserSettingValue(
        pinyinFinalSoundLocationSelectionSetting,
        { soundId: testSoundId },
        { p: testLocationId },
      );

      expect(decoded).toEqual({
        soundId: testSoundId,
        locationId: testLocationId,
      });
    });

    test(`returns null when stored value is null`, () => {
      const decoded = decodeUserSettingValue(
        pinyinFinalSoundLocationSelectionSetting,
        { soundId: testSoundId },
        null,
      );

      expect(decoded).toBeNull();
    });

    test(`returns null when stored object cannot be decoded`, () => {
      const decoded = decodeUserSettingValue(
        pinyinFinalSoundLocationSelectionSetting,
        { soundId: testSoundId },
        { notPlace: `x` },
      );

      expect(decoded).toBeNull();
    });

    test(`decodes keyless setting values directly`, () => {
      const decoded = decodeUserSettingValue(
        userNameTextSetting,
        {},
        { t: `Brad` },
      );

      expect(decoded).toEqual({ text: `Brad` });
    });

    test(`decodes location thought chains setting with json payload`, () => {
      const decoded = decodeUserSettingValue(
        locationThoughtChainsJsonSetting,
        { locationId: testLocationId },
        {
          j: {
            "-ong": [
              {
                path: [
                  { anchor: `-ong` },
                  { anchor: `gong`, reason: `close pronunciation` },
                  { anchor: `Temple`, reason: `belongs in temple` },
                ],
                score: 90,
                strengths: [],
                weaknesses: [],
              },
            ],
          },
        },
      );

      expect(decoded).toMatchInlineSnapshot(`
        {
          "locationId": "place_123",
          "value": {
            "-ong": [
              {
                "path": [
                  {
                    "anchor": "-ong",
                  },
                  {
                    "anchor": "gong",
                    "reason": "close pronunciation",
                  },
                  {
                    "anchor": "Temple",
                    "reason": "belongs in temple",
                  },
                ],
                "score": 90,
                "strengths": [],
                "weaknesses": [],
              },
            ],
          },
        }
      `);
    });
  },
);

describe(
  `encodeUserSettingStoredValue` satisfies HasNameOf<
    typeof encodeUserSettingStoredValue
  >,
  () => {
    test(`strips key-path fields from keyed setting stored values`, () => {
      const encoded = encodeUserSettingStoredValue(
        pinyinFinalSoundLocationSelectionSetting,
        { soundId: testSoundId },
        {
          soundId: testSoundId,
          locationId: testLocationId,
        },
      );

      expect(encoded).toEqual({ p: testLocationId });
    });

    test(`keeps all marshaled fields for keyless settings`, () => {
      const encoded = encodeUserSettingStoredValue(
        userNameTextSetting,
        {},
        {
          text: `Brad`,
        },
      );

      expect(encoded).toEqual({ t: `Brad` });
    });

    test(`returns null when value is null`, () => {
      const encoded = encodeUserSettingStoredValue(
        userNameTextSetting,
        {},
        null,
      );

      expect(encoded).toBeNull();
    });

    test(`stores only json payload for location thought chains setting`, () => {
      const encoded = encodeUserSettingStoredValue(
        locationThoughtChainsJsonSetting,
        { locationId: testLocationId },
        {
          locationId: testLocationId,
          value: {
            "-ong": [
              {
                path: [
                  { anchor: `-ong` },
                  { anchor: `gong`, reason: `close pronunciation` },
                  { anchor: `Temple`, reason: `belongs in temple` },
                ],
                score: 80,
                strengths: [],
                weaknesses: [],
              },
            ],
          },
        },
      );

      expect(encoded).toEqual({
        j: {
          "-ong": [
            {
              path: [
                { anchor: `-ong` },
                { anchor: `gong`, reason: `close pronunciation` },
                { anchor: `Temple`, reason: `belongs in temple` },
              ],
              score: 80,
              strengths: [],
              weaknesses: [],
            },
          ],
        },
      });
    });
  },
);

describe(
  `userHanziMeaningDefs` satisfies HasNameOf<typeof userHanziMeaningDefs>,
  () => {
    test(`all user hanzi meaning entities follow uhm/[hanzi]/ convention`, () => {
      const hanziPrefix = `uhm/`;

      expect(userHanziMeaningDefs.length).toBeGreaterThan(2);
      for (const setting of userHanziMeaningDefs) {
        expect(setting.entity.keyPrefix).toBe(hanziPrefix);
      }
    });

    test(`all user hanzi meaning entities have hanzi and meaningKey parameters`, () => {
      const keyPaths = userHanziMeaningDefs.map((x) => x.entity._def.keyPath);

      expect(keyPaths).toContain(`uhm/[hanzi]/[meaningKey]/g`);
      expect(keyPaths).toContain(`uhm/[hanzi]/[meaningKey]/p`);
      expect(keyPaths).toContain(`uhm/[hanzi]/[meaningKey]/n`);

      for (const keyPath of keyPaths) {
        expect(keyPath.startsWith(`uhm/[hanzi]/[meaningKey]/`)).toBe(true);
      }
    });

    test(`userHanziMeaningDefs has unique entries`, () => {
      expectUniqueSettingKeyPaths(userHanziMeaningDefs);
    });
  },
);

describe(
  `userSettingDefinitions` satisfies HasNameOf<typeof userSettingDefinitions>,
  () => {
    test(`has unique entries`, () => {
      expectUniqueSettingKeyPaths(userSettingDefinitions);
    });
  },
);

describe(
  `userHanziSettingLike` satisfies HasNameOf<typeof userHanziSettingLike>,
  () => {
    test(`returns SQL LIKE pattern for querying by hanzi`, () => {
      const hanzi = 汉`好`;
      const pattern = userHanziSettingLike(hanzi);
      const expectedPattern = `${userHanziMeaningGlossSetting.entity.keyPrefix}${hanzi}/%`;

      expect(pattern).toBe(expectedPattern);
    });

    test(`pattern matches all three user meaning types (g, p, n)`, () => {
      const hanzi = 汉`测试`;
      const meaningKey = `u_abc123def456`;
      const pattern = userHanziSettingLike(hanzi);

      // Build concrete keys from entity keyPath definitions
      const fillKeyPath = (keyPath: string) =>
        keyPath.replace(`[hanzi]`, hanzi).replace(`[meaningKey]`, meaningKey);

      const glossKey = fillKeyPath(
        userHanziMeaningGlossSetting.entity._def.keyPath,
      );
      const pinyinKey = fillKeyPath(
        userHanziMeaningPinyinSetting.entity._def.keyPath,
      );
      const noteKey = fillKeyPath(
        userHanziMeaningNoteSetting.entity._def.keyPath,
      );

      const keyParams = { hanzi, meaningKey };
      const marshaledGlossKey =
        userHanziMeaningGlossSetting.entity.marshalKey(keyParams);
      const marshaledPinyinKey =
        userHanziMeaningPinyinSetting.entity.marshalKey(keyParams);
      const marshaledNoteKey =
        userHanziMeaningNoteSetting.entity.marshalKey(keyParams);

      // Validate pattern format
      expect(pattern).toMatch(/^uhm\/.*\/%$/u);

      // Ensure keyPath-derived keys and marshalKey keys agree
      expect(glossKey).toBe(marshaledGlossKey);
      expect(pinyinKey).toBe(marshaledPinyinKey);
      expect(noteKey).toBe(marshaledNoteKey);

      // Check that keys would match this pattern format (basic validation)
      const patternBase = pattern.slice(0, -1); // Remove '%'
      expect(glossKey.startsWith(patternBase)).toBe(true);
      expect(pinyinKey.startsWith(patternBase)).toBe(true);
      expect(noteKey.startsWith(patternBase)).toBe(true);
    });

    test(`pattern has no parameter placeholders`, () => {
      const pattern = userHanziSettingLike(汉`好`);

      expect(pattern).not.toContain(`[`);
      expect(pattern).not.toContain(`]`);
    });
  },
);
