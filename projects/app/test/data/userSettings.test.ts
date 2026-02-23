import {
  getImageSettingKeyPatterns,
  hanziPronunciationHintImageSetting,
  hanziWordMeaningHintImageSetting,
  imageSettings,
  pinyinFinalToneImageSetting,
  pinyinSoundImageSetting,
} from "#data/userSettings.ts";
import { describe, expect, test } from "vitest";

describe(`imageSettings`, () => {
  test(`contains all image setting entities`, () => {
    expect(imageSettings).toHaveLength(4);
    expect(imageSettings).toContain(pinyinSoundImageSetting);
    expect(imageSettings).toContain(hanziWordMeaningHintImageSetting);
    expect(imageSettings).toContain(hanziPronunciationHintImageSetting);
    expect(imageSettings).toContain(pinyinFinalToneImageSetting);
  });

  test(`all settings have imageId field`, () => {
    for (const setting of imageSettings) {
      const valueShape = (
        setting._def.valueType as unknown as {
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
      expect(pinyinSoundImageSetting._def.keyPath).toBe(`psi/[soundId]`);
      expect(patterns).toContain(`psi/%`);

      expect(hanziWordMeaningHintImageSetting._def.keyPath).toBe(
        `hwmhi/[hanziWord]`,
      );
      expect(patterns).toContain(`hwmhi/%`);

      expect(hanziPronunciationHintImageSetting._def.keyPath).toBe(
        `hphi/[hanzi]/[pinyin]`,
      );
      expect(patterns).toContain(`hphi/%`);

      expect(pinyinFinalToneImageSetting._def.keyPath).toBe(
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
