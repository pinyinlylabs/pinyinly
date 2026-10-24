import { rSkillKind } from "@/data/rizzleSchema";
import { describe, test } from "vitest";

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

  test(`unmarshal()`, async ({ bench }) => {
    await bench(`unmarshal()`, () => {
      for (const v of values) {
        rSkillKind().unmarshal(v);
      }
    }).run();
  });
});
