import { loadCharactersJson } from "#dictionary.ts";
import { bench, describe, expect } from "vitest";
import { parseIds, parseIdsLeafs } from "#data/hanzi.js";

// Add a regression test to make sure Vitest bench mode sets the `MODE`
// environment variable to 'benchmark'. This is assumed in other places in the
// code.
expect(process.env[`MODE`]).toBe(`benchmark`);

describe(`IDS parsing`, async () => {
  const charactersJson = await loadCharactersJson();
  const allIds = charactersJson
    .values()
    .flatMap((c) => Object.keys(c.decompositions ?? {}));

  bench(`parseIds()`, () => {
    for (const ids of allIds) {
      parseIds(ids);
    }
  });

  bench(`parseIdsLeafs()`, () => {
    for (const ids of allIds) {
      parseIdsLeafs(ids);
    }
  });
});
