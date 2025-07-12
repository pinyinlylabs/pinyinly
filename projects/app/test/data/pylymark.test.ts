import { parsePylymark, stringifyPylymark } from "#data/pylymark.ts";

import { describe, expect, test } from "vitest";

describe(`${parsePylymark.name} suite`, () => {
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

  test(`parses single smart quotes correctly`, () => {
    const nodes = parsePylymark(`It's a 'quote'.`);
    expect(nodes).toEqual([
      {
        text: `It’s a ‘quote’.`,
        type: `text`,
      },
    ]);
  });

  test(`parses double smart quotes correctly`, () => {
    const nodes = parsePylymark(`He said "hello".`);
    expect(nodes).toEqual([
      {
        text: `He said “hello”.`,
        type: `text`,
      },
    ]);
  });
});

describe(`${stringifyPylymark.name} suite`, () => {
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
});
