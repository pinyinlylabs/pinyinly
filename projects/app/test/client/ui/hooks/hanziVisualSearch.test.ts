// pyly-not-src-test
import { projectRoot } from "#bin/util/paths.ts";
import * as hanziVisualSearch from "#client/ui/hanziVisualSearch.ts";
import { readFileSync } from "@pinyinly/lib/fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const searchNearestByDotProduct = hanziVisualSearch.searchNearestByDotProduct;
const parseFlatIndex = (
  hanziVisualSearch as unknown as {
    parseFlatIndex: (
      buffer: ArrayBuffer,
      codepoints: readonly string[],
      allowedCharacters?: ReadonlySet<string>,
    ) => {
      count: number;
      dims: number;
      hanziChars: readonly string[];
      vectors: Float32Array;
    };
  }
).parseFlatIndex;

const ocrDir = resolve(projectRoot, `src/ocr`);

function loadIndex() {
  const binBytes = readFileSync(resolve(ocrDir, `vectors.bin`));
  const binBuffer = binBytes.buffer.slice(
    binBytes.byteOffset,
    binBytes.byteOffset + binBytes.byteLength,
  );
  const meta = JSON.parse(
    readFileSync(resolve(ocrDir, `vectorsMeta.json.bin`), `utf-8`),
  ) as { codepoints: string[] };

  return parseFlatIndex(binBuffer, meta.codepoints);
}

describe(`parseFlatIndex + searchNearestByDotProduct`, () => {
  test(`normalizes U+2F26 (⼦) into 子 for dictionary matching`, () => {
    const meta = JSON.parse(
      readFileSync(resolve(ocrDir, `vectorsMeta.json.bin`), `utf-8`),
    ) as { codepoints: string[] };
    expect(meta.codepoints).toContain(`U+2F26`);

    const index = loadIndex();
    expect(index.hanziChars).toContain(`子`);
  });

  test(`allowed set containing 子 keeps 子 embeddings and self-query ranks 子 first`, () => {
    const index = (() => {
      const binBytes = readFileSync(resolve(ocrDir, `vectors.bin`));
      const binBuffer = binBytes.buffer.slice(
        binBytes.byteOffset,
        binBytes.byteOffset + binBytes.byteLength,
      );
      const meta = JSON.parse(
        readFileSync(resolve(ocrDir, `vectorsMeta.json.bin`), `utf-8`),
      ) as { codepoints: string[] };
      return parseFlatIndex(binBuffer, meta.codepoints, new Set([`子`]));
    })();

    const ziIndex = index.hanziChars.indexOf(`子`);
    expect(ziIndex).toBeGreaterThanOrEqual(0);

    // Extract 子's stored embedding vector and use it as the query.
    // A character queried against its own embedding should always be the top match.
    const ziEmbedding = new Float32Array(
      index.vectors.buffer,
      ziIndex * index.dims * Float32Array.BYTES_PER_ELEMENT,
      index.dims,
    );

    const results = searchNearestByDotProduct({
      queryEmbedding: ziEmbedding,
      index,
      limit: 5,
    });

    expect(results[0]?.hanzi).toBe(`子`);
    expect(results[0]?.score).toBeGreaterThan(0);
  });
});
