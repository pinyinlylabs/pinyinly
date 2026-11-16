import { SimpleCronIntervalKind } from "#client/theme.ts";
import { getThemeSwapColorScheme } from "#client/ui/hooks/useColorSchemeOverride.ts";
import { expect, test } from "vitest";

test(`returns null without an interval`, () => {
  expect(getThemeSwapColorScheme(null, 0)).toBeNull();
});

test.each([
  [SimpleCronIntervalKind.Every2Minutes, 0, `dark`],
  [SimpleCronIntervalKind.Every2Minutes, 120_000, `light`],
  [SimpleCronIntervalKind.Every2Minutes, 240_000, `dark`],
  [SimpleCronIntervalKind.Every5Minutes, 300_000, `light`],
  [SimpleCronIntervalKind.Hourly, new Date(2026, 0, 1, 1).getTime(), `light`],
  [SimpleCronIntervalKind.Hourly, new Date(2026, 0, 1, 2).getTime(), `dark`],
] as const)(
  `returns the scheduled scheme for %s at %s`,
  (interval, now, expected) => {
    expect(getThemeSwapColorScheme(interval, now)).toBe(expected);
  },
);
