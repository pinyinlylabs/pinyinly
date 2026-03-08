import {
  getImageSettingKeyPatterns,
  hanziPronunciationHintImageSetting,
  hanziWordMeaningHintImageSetting,
  imageSettingDefs,
  pinyinFinalToneImageSetting,
  pinyinSoundImageSetting,
  userHanziMeaningDefs,
  userHanziMeaningGlossSetting,
  userHanziMeaningNoteSetting,
  userHanziMeaningPinyinSetting,
  userHanziSettingLike,
} from "#data/userSettings.ts";
import { describe, expect, test } from "vitest";
import { 汉 } from "./helpers";

describe(`imageSettings`, () => {
  test(`contains all image setting entities`, () => {
    expect(imageSettingDefs).toHaveLength(4);
    expect(imageSettingDefs).toContain(pinyinSoundImageSetting);
    expect(imageSettingDefs).toContain(hanziWordMeaningHintImageSetting);
    expect(imageSettingDefs).toContain(hanziPronunciationHintImageSetting);
    expect(imageSettingDefs).toContain(pinyinFinalToneImageSetting);
  });

  test(`all settings have imageId field`, () => {
    for (const setting of imageSettingDefs) {
      const valueShape = (
        setting.entity._def.valueType as unknown as {
          _def: { shape: Record<string, unknown> };
        }
      )._def.shape;
      expect(valueShape).toHaveProperty(`imageId`);
    }
  });
});

describe(
  `getImageSettingKeyPatterns` satisfies HasNameOf<
    typeof getImageSettingKeyPatterns
  >,
  () => {
    test(`returns SQL LIKE patterns for all image settings`, () => {
      const patterns = getImageSettingKeyPatterns();

      expect(patterns).toHaveLength(4);
      expect(patterns).toContain(`psi/%`); // pinyinSoundImageSetting
      expect(patterns).toContain(`hwmhi/%`); // hanziWordMeaningHintImageSetting
      expect(patterns).toContain(`hphi/%`); // hanziPronunciationHintImageSetting
      expect(patterns).toContain(`pfti/%`); // pinyinFinalToneImageSetting
    });

    test(`patterns match the key path prefixes`, () => {
      const patterns = getImageSettingKeyPatterns();

      // Verify each pattern corresponds to its setting's key path
      expect(pinyinSoundImageSetting.entity._def.keyPath).toBe(`psi/[soundId]`);
      expect(patterns).toContain(`psi/%`);

      expect(hanziWordMeaningHintImageSetting.entity._def.keyPath).toBe(
        `hwmhi/[hanziWord]`,
      );
      expect(patterns).toContain(`hwmhi/%`);

      expect(hanziPronunciationHintImageSetting.entity._def.keyPath).toBe(
        `hphi/[hanzi]/[pinyin]`,
      );
      expect(patterns).toContain(`hphi/%`);

      expect(pinyinFinalToneImageSetting.entity._def.keyPath).toBe(
        `pfti/[soundId]/[tone]`,
      );
      expect(patterns).toContain(`pfti/%`);
    });

    test(`extracts prefix before first parameter`, () => {
      const patterns = getImageSettingKeyPatterns();

      // Each pattern should end with '%' for SQL LIKE matching
      for (const pattern of patterns) {
        expect(pattern).toMatch(/%$/);
      }

      // Each pattern should have extracted the prefix before '[' correctly
      for (const pattern of patterns) {
        expect(pattern).not.toContain(`[`);
      }
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
      expect(pattern).toMatch(/^uhm\/.*\/%$/);

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
