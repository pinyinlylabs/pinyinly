import { proficiencyFillProgress } from "#client/ui/proficiencyStyles.ts";
import { describe, expect, test } from "vitest";

describe(`proficiencyFillProgress`, () => {
  test(`maps progress from 10% through 100%`, () => {
    expect(proficiencyFillProgress(0)).toBe(0.1);
    expect(proficiencyFillProgress(0.5)).toBe(0.55);
    expect(proficiencyFillProgress(1)).toBe(1);
    expect(proficiencyFillProgress(2)).toBe(1);
  });
});
