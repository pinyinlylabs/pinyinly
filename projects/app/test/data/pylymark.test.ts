import {
  parsePylymark,
  stringifyPylymark,
  stripTokens,
} from "#data/pylymark.ts";
import type { PylymarkNode } from "#data/pylymark.ts";

import { describe, expect, test } from "vitest";

describe(
  `parsePylymark suite` satisfies HasNameOf<typeof parsePylymark>,
  () => {
    test(`parses plain text correctly`, () => {
      const nodes = parsePylymark(`This is a plain text.`);
      expect(nodes).toMatchInlineSnapshot(`
        [
          {
            "text": "This is a plain text.",
            "type": "text",
          },
        ]
      `);
    });

    test(`parses HanziWord references correctly`, () => {
      const nodes = parsePylymark(`See also {好:good}.`);
      expect(nodes).toMatchInlineSnapshot(`
        [
          {
            "text": "See also ",
            "type": "text",
          },
          {
            "hanziWord": "好:good",
            "showGloss": true,
            "type": "hanziWord",
          },
          {
            "text": ".",
            "type": "text",
          },
        ]
      `);
    });

    test(`parses HanziWord references with omitted gloss`, () => {
      const nodes = parsePylymark(`See also {好:-good}.`);
      expect(nodes).toMatchInlineSnapshot(`
        [
          {
            "text": "See also ",
            "type": "text",
          },
          {
            "hanziWord": "好:good",
            "showGloss": false,
            "type": "hanziWord",
          },
          {
            "text": ".",
            "type": "text",
          },
        ]
      `);
    });

    test(`parses bold text correctly`, () => {
      const nodes = parsePylymark(`This is **bold** text.`);
      expect(nodes).toMatchInlineSnapshot(`
        [
          {
            "text": "This is ",
            "type": "text",
          },
          {
            "text": "bold",
            "type": "bold",
          },
          {
            "text": " text.",
            "type": "text",
          },
        ]
      `);
    });

    test(`parses italic text correctly`, () => {
      const nodes = parsePylymark(`This is *italic* text.`);
      expect(nodes).toMatchInlineSnapshot(`
        [
          {
            "text": "This is ",
            "type": "text",
          },
          {
            "text": "italic",
            "type": "italic",
          },
          {
            "text": " text.",
            "type": "text",
          },
        ]
      `);
    });

    test(`parses marked text correctly`, () => {
      const nodes = parsePylymark(`This is ==marked== text.`);
      expect(nodes).toMatchInlineSnapshot(`
        [
          {
            "text": "This is ",
            "type": "text",
          },
          {
            "text": "marked",
            "type": "mark",
          },
          {
            "text": " text.",
            "type": "text",
          },
        ]
      `);
    });

    test(`parses basic token references correctly`, () => {
      const nodes = parsePylymark(
        `[bi- Bigfoot] [-ao barn] [-[e]n engine room] [3 basement] [表 express himself]`,
      );
      expect(nodes).toMatchInlineSnapshot(`
        [
          {
            "ref": "bi-",
            "text": "Bigfoot",
            "type": "token",
          },
          {
            "text": " ",
            "type": "text",
          },
          {
            "ref": "-ao",
            "text": "barn",
            "type": "token",
          },
          {
            "text": " ",
            "type": "text",
          },
          {
            "ref": "-[e]n",
            "text": "engine room",
            "type": "token",
          },
          {
            "text": " ",
            "type": "text",
          },
          {
            "ref": "3",
            "text": "basement",
            "type": "token",
          },
          {
            "text": " ",
            "type": "text",
          },
          {
            "ref": "表",
            "text": "express himself",
            "type": "token",
          },
        ]
      `);
    });

    test(`parses multiword token text correctly`, () => {
      const nodes = parsePylymark(`[表 express himself without speaking]`);
      expect(nodes).toMatchInlineSnapshot(`
        [
          {
            "ref": "表",
            "text": "express himself without speaking",
            "type": "token",
          },
        ]
      `);
    });

    test(`parses mixed PylyMark with token references`, () => {
      const nodes = parsePylymark(
        `**Bigfoot** hides in the [-ao barn] and tries to [表 express himself].`,
      );
      expect(nodes).toMatchInlineSnapshot(`
        [
          {
            "text": "Bigfoot",
            "type": "bold",
          },
          {
            "text": " hides in the ",
            "type": "text",
          },
          {
            "ref": "-ao",
            "text": "barn",
            "type": "token",
          },
          {
            "text": " and tries to ",
            "type": "text",
          },
          {
            "ref": "表",
            "text": "express himself",
            "type": "token",
          },
          {
            "text": ".",
            "type": "text",
          },
        ]
      `);
    });

    test(`preserves existing syntax regressions`, () => {
      const nodes = parsePylymark(
        `{好:good}{好:-good}**bold***italic*==marked==`,
      );
      expect(nodes).toMatchInlineSnapshot(`
        [
          {
            "hanziWord": "好:good",
            "showGloss": true,
            "type": "hanziWord",
          },
          {
            "hanziWord": "好:good",
            "showGloss": false,
            "type": "hanziWord",
          },
          {
            "text": "bold",
            "type": "bold",
          },
          {
            "text": "italic",
            "type": "italic",
          },
          {
            "text": "marked",
            "type": "mark",
          },
        ]
      `);
    });

    test(`keeps token adjacency and text-node merging behavior`, () => {
      expect(parsePylymark(`Before [表 express] after.`))
        .toMatchInlineSnapshot(`
        [
          {
            "text": "Before ",
            "type": "text",
          },
          {
            "ref": "表",
            "text": "express",
            "type": "token",
          },
          {
            "text": " after.",
            "type": "text",
          },
        ]
      `);

      expect(parsePylymark(`[bi- Bigfoot][-ao barn]`)).toMatchInlineSnapshot(`
        [
          {
            "ref": "bi-",
            "text": "Bigfoot",
            "type": "token",
          },
          {
            "ref": "-ao",
            "text": "barn",
            "type": "token",
          },
        ]
      `);
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

describe(`stripTokens suite`, () => {
  test(`strips token nodes and converts them to text nodes`, () => {
    const str = `Try [表 express himself] in the [-ao barn].`;
    const stripped = stringifyPylymark(stripTokens(parsePylymark(str)));
    expect(stripped).toBe(`Try express himself in the barn.`);
  });
});
