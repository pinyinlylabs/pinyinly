import { loadCharactersJson } from "#dictionary.ts";
import { describe, test } from "vitest";
import { parseIds, parseIdsLeafs } from "#data/hanzi.js";

describe(`IDS parsing`, async () => {
  const charactersJson = await loadCharactersJson();
  const allIds = charactersJson
    .values()
    .flatMap((c) => Object.keys(c.decompositions ?? {}));

  test(`parseIds()`, async ({ bench }) => {
    await bench(`parseIds()`, () => {
      for (const ids of allIds) {
        parseIds(ids);
      }
    }).run();
  });

  test(`parseIdsLeafs()`, async ({ bench }) => {
    await bench(`parseIdsLeafs()`, () => {
      for (const ids of allIds) {
        parseIdsLeafs(ids);
      }
    }).run();
  });
});
