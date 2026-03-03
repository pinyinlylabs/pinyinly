import {
  getImageSettingKeyPatterns,
  hanziPronunciationHintImageSetting,
  hanziWordMeaningHintImageSetting,
  imageSettingDefs,
  pinyinFinalToneImageSetting,
  pinyinSoundImageSetting,
} from "#data/userSettings.ts";
import { describe, expect, test } from "vitest";

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
