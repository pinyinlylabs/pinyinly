import { parsePylymark, stringifyPylymark } from "#data/pylymark.ts";
import type { PylymarkNode } from "#data/pylymark.ts";

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

    test(`parses basic token references correctly`, () => {
      const nodes = parsePylymark(
        `[bi- Bigfoot] [-ao barn] [3 basement] [表 express himself]`,
      );
      expect(nodes).toEqual([
        {
          type: `token`,
          ref: `bi-`,
          text: `Bigfoot`,
        },
        {
          type: `text`,
          text: ` `,
        },
        {
          type: `token`,
          ref: `-ao`,
          text: `barn`,
        },
        {
          type: `text`,
          text: ` `,
        },
        {
          type: `token`,
          ref: `3`,
          text: `basement`,
        },
        {
          type: `text`,
          text: ` `,
        },
        {
          type: `token`,
          ref: `表`,
          text: `express himself`,
        },
      ]);
    });

    test(`parses multiword token text correctly`, () => {
      const nodes = parsePylymark(`[表 express himself without speaking]`);
      expect(nodes).toEqual([
        {
          type: `token`,
          ref: `表`,
          text: `express himself without speaking`,
        },
      ]);
    });

    test(`parses mixed PylyMark with token references`, () => {
      const nodes = parsePylymark(
        `**Bigfoot** hides in the [-ao barn] and tries to [表 express himself].`,
      );
      expect(nodes).toEqual([
        {
          type: `bold`,
          text: `Bigfoot`,
        },
        {
          type: `text`,
          text: ` hides in the `,
        },
        {
          type: `token`,
          ref: `-ao`,
          text: `barn`,
        },
        {
          type: `text`,
          text: ` and tries to `,
        },
        {
          type: `token`,
          ref: `表`,
          text: `express himself`,
        },
        {
          type: `text`,
          text: `.`,
        },
      ]);
    });

    test(`preserves existing syntax regressions`, () => {
      const nodes = parsePylymark(
        `{好:good}{好:-good}**bold***italic*==marked==`,
      );
      expect(nodes).toEqual([
        {
          type: `hanziWord`,
          hanziWord: `好:good`,
          showGloss: true,
        },
        {
          type: `hanziWord`,
          hanziWord: `好:good`,
          showGloss: false,
        },
        {
          type: `bold`,
          text: `bold`,
        },
        {
          type: `italic`,
          text: `italic`,
        },
        {
          type: `mark`,
          text: `marked`,
        },
      ]);
    });

    test(`keeps token adjacency and text-node merging behavior`, () => {
      expect(parsePylymark(`Before [表 express] after.`)).toEqual([
        {
          type: `text`,
          text: `Before `,
        },
        {
          type: `token`,
          ref: `表`,
          text: `express`,
        },
        {
          type: `text`,
          text: ` after.`,
        },
      ]);

      expect(parsePylymark(`[bi- Bigfoot][-ao barn]`)).toEqual([
        {
          type: `token`,
          ref: `bi-`,
          text: `Bigfoot`,
        },
        {
          type: `token`,
          ref: `-ao`,
          text: `barn`,
        },
      ]);
    });

    test(`keeps malformed token references as plain text`, () => {
      const malformed = [`[]`, `[表]`, `[ 表]`, `[表 ]`];

      for (const value of malformed) {
        expect(parsePylymark(value)).toEqual([
          {
            type: `text`,
            text: value,
          },
        ]);
      }
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

    test(`roundtrips token references`, () => {
      const str = `Try [表 express himself] in the [-ao barn].`;
      expect(roundTrip(str)).toBe(str);
    });

    test(`serializes token references in canonical format`, () => {
      expect(
        stringifyPylymark([
          {
            type: `token`,
            ref: `表`,
            text: `express himself`,
          },
          {
            type: `text`,
            text: ` and `,
          },
          {
            type: `token`,
            ref: `-ong`,
            text: `temple`,
          },
        ]),
      ).toBe(`[表 express himself] and [-ong temple]`);
    });

    test(`serializes unexpected invalid token data predictably`, () => {
      expect(
        stringifyPylymark([
          {
            type: `token`,
            ref: ``,
            text: `express`,
          },
          {
            type: `text`,
            text: ` `,
          },
          {
            type: `token`,
            ref: `表`,
            text: ``,
          },
        ]),
      ).toBe(`[ express] [表 ]`);
    });

    test(`roundtrips valid token nodes through stringify then parse`, () => {
      const nodes: PylymarkNode[] = [
        {
          type: `token`,
          ref: `bi-`,
          text: `Bigfoot`,
        },
        {
          type: `text`,
          text: ` hides in `,
        },
        {
          type: `token`,
          ref: `-ao`,
          text: `barn`,
        },
      ];

      expect(parsePylymark(stringifyPylymark(nodes))).toEqual(nodes);
    });
  },
);
