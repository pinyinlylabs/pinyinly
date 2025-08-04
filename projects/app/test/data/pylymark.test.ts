import { parsePylymark, stringifyPylymark } from "#data/pylymark.ts";

import { describe, expect, test } from "vitest";

describe(
  `parsePylymark suite` satisfies HasNameOf<typeof parsePylymark>,
  () => {
    test(`parses plain text correctly`, () => {
      const nodes = parsePylymark(`This is a plain text.`);
      expect(nodes).toEqual([
        {
          text: `This is a plain text.`,
          type: `text`,
        },
      ]);
    });

    test(`parses HanziWord references correctly`, () => {
      const nodes = parsePylymark(`See also {好:good}.`);
      expect(nodes).toEqual([
        {
          text: `See also `,
          type: `text`,
        },
        {
          hanziWord: `好:good`,
          type: `hanziWord`,
          showGloss: true,
        },
        {
          text: `.`,
          type: `text`,
        },
      ]);
    });

    test(`parses HanziWord references with omitted gloss`, () => {
      const nodes = parsePylymark(`See also {好:-good}.`);
      expect(nodes).toEqual([
        {
          text: `See also `,
          type: `text`,
        },
        {
          hanziWord: `好:good`,
          type: `hanziWord`,
          showGloss: false,
        },
        {
          text: `.`,
          type: `text`,
        },
      ]);
    });

    test(`parses bold text correctly`, () => {
      const nodes = parsePylymark(`This is **bold** text.`);
      expect(nodes).toEqual([
        {
          text: `This is `,
          type: `text`,
        },
        {
          text: `bold`,
          type: `bold`,
        },
        {
          text: ` text.`,
          type: `text`,
        },
      ]);
    });

    test(`parses italic text correctly`, () => {
      const nodes = parsePylymark(`This is *italic* text.`);
      expect(nodes).toEqual([
        {
          text: `This is `,
          type: `text`,
        },
        {
          text: `italic`,
          type: `italic`,
        },
        {
          text: ` text.`,
          type: `text`,
        },
      ]);
    });

    test(`parses marked text correctly`, () => {
      const nodes = parsePylymark(`This is ==marked== text.`);
      expect(nodes).toEqual([
        {
          text: `This is `,
          type: `text`,
        },
        {
          text: `marked`,
          type: `mark`,
        },
        {
          text: ` text.`,
          type: `text`,
        },
      ]);
    });
  },
);

describe(
  `stringifyPylymark suite` satisfies HasNameOf<typeof stringifyPylymark>,
  () => {
    const roundTrip = (str: string) => stringifyPylymark(parsePylymark(str));

    test(`roundtrips bold text`, () => {
      const str = `This is **bold** text.`;
      expect(roundTrip(str)).toBe(str);
    });

    test(`roundtrips italic text`, () => {
      const str = `This is *italic* text.`;
      expect(roundTrip(str)).toBe(str);
    });

    test(`roundtrips HanziWord references`, () => {
      const str = `This is {好:good}.`;
      expect(roundTrip(str)).toBe(str);
    });

    test(`roundtrips HanziWord references with omitted gloss`, () => {
      const str = `This is {好:-good}.`;
      expect(roundTrip(str)).toBe(str);
    });

    test(`roundtrips marked text`, () => {
      const str = `This is ==marked== text.`;
      expect(roundTrip(str)).toBe(str);
    });
  },
);
