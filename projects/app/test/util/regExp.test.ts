import { regExpEscape } from "#util/regExp.ts";
import test from "node:test";

await test(`${regExpEscape.name} suite`, async () => {
  await test(`fixtures`, async () => {
    const cases: [string, string][] = [
      [``, String.raw``],
      [`[`, String.raw`\[`],
      [`.`, String.raw`\.`],
      [`*`, String.raw`\*`],
      [`+`, String.raw`\+`],
      [`?`, String.raw`\?`],
      [`^`, String.raw`\^`],
      [`$`, String.raw`\$`],
      [`{`, String.raw`\{`],
      [`}`, String.raw`\}`],
      [`(`, String.raw`\(`],
      [`)`, String.raw`\)`],
      [`|`, String.raw`\|`],
      [`[`, String.raw`\[`],
      [`]`, String.raw`\]`],
      [`\\`, String.raw`\\`],
    ];
    for (const [input, expected] of cases) {
      expect(regExpEscape(input)).toEqual(expected);
    }
  });
});
