import type { ColorRGBA } from "#util/color.ts";
import {
  parseCssColorOrThrow,
  parseHexColor,
  parseRiveColorPropertyName,
  parseScalar,
} from "#util/color.ts";
import assert from "node:assert/strict";
import { describe, expect, test } from "vitest";

describe(`${parseCssColorOrThrow.name} suite`, async () => {
  test(`fixtures`, () => {
    const fixtures = [
      [`rgb(1 2 3)`, [1, 2, 3, 1]],
      [`rgb(0 0 0 / 0)`, [0, 0, 0, 0]],
      [`rgb(0 0 0 / 1)`, [0, 0, 0, 1]],
      [`rgb(1 2 3 / 0)`, [1, 2, 3, 0]],
      [`rgb(1 2 3 / 1)`, [1, 2, 3, 1]],
      [`rgb(1 2 3 / .9)`, [1, 2, 3, 0.9]],
      [`rgb(1 2 3/.9)`, [1, 2, 3, 0.9]],
      [`rgb(0% 0% 0%)`, [0, 0, 0, 1]],
      [`rgb(0% 0% 0% / 50%)`, [0, 0, 0, 0.5]],
      [`rgb(100% 100% 100% / 50%)`, [255, 255, 255, 0.5]],
      [`rgb(none none none)`, [0, 0, 0, 1]],
      [`rgb(none none none / none)`, [0, 0, 0, 1]],
      [`rgb(none 10 10% / 10%)`, [0, 10, 25.5, 0.1]],
      [`rgb(none 10 10% / 20%)`, [0, 10, 25.5, 0.2]],
      [`rgb(from #abc r g b)`, [170, 187, 204, 1]],
      [`rgb(from #aabbcc r g b)`, [170, 187, 204, 1]],
      [`rgb(from #aabbcc r g b / none)`, [170, 187, 204, 1]],
      [`rgb(from #aabbcc r g b / 0.5)`, [170, 187, 204, 0.5]],
      [`RgB(fRoM #aabbcc r G b / NoNe)`, [170, 187, 204, 1]],
      [
        // Comments in the middle of the color
        `rgb(/**/from/**/#11181d/**/r/**/g/**/b/**///**/.9/**/)`,
        [17, 24, 29, 0.9],
      ],
      [
        // Newline and comments in the middle of the color
        `rgb(/*
        */from/**/#11181d/**/r/**/g/**/b/**///**/.9/**/)`,
        [17, 24, 29, 0.9],
      ],
      [`#aabbcc`, [170, 187, 204, 1]],
      [`#AABbCc`, [170, 187, 204, 1]],
    ] as const;

    for (const [input, [red, green, blue, alpha]] of fixtures) {
      const expected = { red, green, blue, alpha };
      assert.deepEqual([input, parseCssColorOrThrow(input)], [input, expected]);
    }
  });
});

describe(`${parseScalar.name} suite`, async () => {
  test(`valid fixtures`, () => {
    const fixtures: [string, number | null][] = [
      [`0`, 0],
      [`1`, 1],
      [`1.123`, 1.123],
      [`.123`, 0.123],
      [`255`, 255],
      [`02`, 2],
      [`100%`, 255],
      [`.5%`, 0.005 * 255],
      [`50%`, 127.5],
      [`none`, null],
    ];

    for (const [input, expected] of fixtures) {
      expect(parseScalar(input)).toEqual(expected);
    }
  });

  test(`invalid fixtures`, () => {
    const fixtures: string[] = [`-1`, `256`, `100.5%`];

    for (const input of fixtures) {
      expect(() => parseScalar(input, 255)).toThrow();
    }
  });

  test(`valid fixtures for alpha`, () => {
    const fixtures: [string, number | null][] = [
      [`0`, 0],
      [`1`, 1],
      [`0.5`, 0.5],
      [`100%`, 1],
      [`50%`, 0.5],
      [`none`, null],
    ];

    for (const [input, expected] of fixtures) {
      expect(parseScalar(input, 1)).toEqual(expected);
    }
  });

  test(`invalid fixtures for alpha`, () => {
    const fixtures: string[] = [`-1`, `256`, `100.5%`];

    for (const input of fixtures) {
      expect(() => parseScalar(input, 1)).toThrow();
    }
  });
});

describe(`${parseHexColor.name} suite`, async () => {
  test(`valid fixtures`, () => {
    const fixtures: [string, ColorRGBA][] = [
      [`#000`, { red: 0, green: 0, blue: 0, alpha: 1 }],
      [`#000000`, { red: 0, green: 0, blue: 0, alpha: 1 }],
      [`#fff`, { red: 255, green: 255, blue: 255, alpha: 1 }],
      [`#ffffff`, { red: 255, green: 255, blue: 255, alpha: 1 }],
      [`#123`, { red: 17, green: 34, blue: 51, alpha: 1 }],
      [`#112233`, { red: 17, green: 34, blue: 51, alpha: 1 }],
    ];

    for (const [input, expected] of fixtures) {
      expect(parseHexColor(input)).toEqual(expected);
    }
  });
});

describe(`${parseRiveColorPropertyName.name} suite`, async () => {
  test(`no alpha suffix`, () => {
    expect(parseRiveColorPropertyName(`fg`)).toEqual({ name: `fg`, alpha: 1 });
  });

  test(`alpha suffix`, () => {
    expect(parseRiveColorPropertyName(`fg@100`)).toEqual({
      name: `fg`,
      alpha: 1,
    });
    expect(parseRiveColorPropertyName(`fg@50`)).toEqual({
      name: `fg`,
      alpha: 0.5,
    });
    expect(parseRiveColorPropertyName(`fg@0`)).toEqual({
      name: `fg`,
      alpha: 0,
    });
  });

  test(`throws on invalid name`, () => {
    expect(() => parseRiveColorPropertyName(`fg/100`)).toThrow();
  });
});
