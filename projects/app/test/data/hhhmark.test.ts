import { parseHhhmark } from "#data/hhhmark.ts";

import assert from "node:assert/strict";
import test from "node:test";

await test(`${parseHhhmark.name} suite`, async () => {
  await test(`parses plain text correctly`, async () => {
    const nodes = parseHhhmark(`This is a plain text.`);
    assert.deepEqual(nodes, [
      {
        text: `This is a plain text.`,
        type: `text`,
      },
    ]);
  });

  await test(`parses HanziWord references correctly`, async () => {
    const nodes = parseHhhmark(`See also {好:good}.`);
    assert.deepEqual(nodes, [
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

  await test(`parses HanziWord references with omitted gloss`, async () => {
    const nodes = parseHhhmark(`See also {好:-good}.`);
    assert.deepEqual(nodes, [
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

  await test(`parses bold text correctly`, async () => {
    const nodes = parseHhhmark(`This is **bold** text.`);
    assert.deepEqual(nodes, [
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

  await test(`parses italic text correctly`, async () => {
    const nodes = parseHhhmark(`This is *italic* text.`);
    assert.deepEqual(nodes, [
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

  await test(`parses single smart quotes correctly`, async () => {
    const nodes = parseHhhmark(`It's a 'quote'.`);
    assert.deepEqual(nodes, [
      {
        text: `It’s a ‘quote’.`,
        type: `text`,
      },
    ]);
  });

  await test(`parses double smart quotes correctly`, async () => {
    const nodes = parseHhhmark(`He said "hello".`);
    assert.deepEqual(nodes, [
      {
        text: `He said “hello”.`,
        type: `text`,
      },
    ]);
  });
});
