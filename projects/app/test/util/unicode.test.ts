import { unicodeShortIdentifier } from "#util/unicode.ts";
import test from "node:test";

await test(`${unicodeShortIdentifier.name} suite`, async () => {
  await test(`works for hanzi`, () => {
    expect(unicodeShortIdentifier(`汉`)).toEqual(`U+6C49`);
  });
});
