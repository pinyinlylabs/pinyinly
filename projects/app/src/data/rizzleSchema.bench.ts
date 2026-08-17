import { rSkillKind } from "@/data/rizzleSchema";
import { bench, describe, expect } from "vitest";

// Add a regression test to make sure Vitest bench mode sets the `MODE`
// environment variable to 'benchmark'. This is assumed in other places in the
// code.
expect(process.env[`MODE`]).toBe(`benchmark`);

describe(`rSkillKind`, () => {
  const values = [
    `re`,
    `er`,
    `rp`,
    `pr`,
    `xx`,
    `he`,
    `het`,
    `hp`,
    `hpi`,
    `hpf`,
    `hpt`,
    `eh`,
    `ph`,
    `ih`,
    `pia`,
    `pfa`,
  ];

  bench(`unmarshal()`, () => {
    for (const v of values) {
      rSkillKind().unmarshal(v);
    }
  });
});
