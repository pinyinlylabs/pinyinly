import { regExpEscape } from "#util/regExp.ts";
import { describe, expect, test } from "vitest";

describe(`${regExpEscape.name} suite`, async () => {
  test(`fixtures`, async () => {
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
