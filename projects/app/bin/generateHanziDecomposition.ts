import type { IdsNode } from "#data/hanzi.js";
import { parseIds, walkIdsNode } from "#data/hanzi.js";
import {
  allHanziGraphemes,
  loadHanziDecomposition,
} from "#dictionary/dictionary.js";
import { unicodeShortIdentifier } from "#util/unicode.js";
import {
  deepReadonly,
  mergeMaps,
  sortComparatorString,
} from "@pinyinly/lib/collections";
import { writeUtf8FileIfChanged } from "@pinyinly/lib/fs";
import { invariant } from "@pinyinly/lib/invariant";
import { jsonStringifyShallowIndent } from "@pinyinly/lib/json";
import makeDebug from "debug";
import path from "node:path";
import { expect } from "vitest";
import yargs from "yargs";
import z from "zod/v4";
import { makeDbCache } from "./util/cache.js";
import { fetchWithCache } from "./util/fetch.js";

const debug = makeDebug(`pyly`);

const argv = await yargs(process.argv.slice(2))
  .usage(`$0 [args]`)
  .option(`update`, {
    type: `string`,
    describe: `characters to explicitly update`,
    coerce: (x: string) => x.split(`,`).filter((x) => x !== ``),
  })
  .option(`debug`, {
    type: `boolean`,
    default: false,
  })
  .option(`force-write`, {
    type: `boolean`,
    default: false,
  })
  .version(false)
  .strict()
  .parseAsync();

if (argv.debug) {
  makeDebug.enable(`${debug.namespace},${debug.namespace}:*`);
}

const sourceTagSchema = z.enum({
  AdobeJapan16: `A`,
  China: `G`,
  HongKong: `H`,
  Japan: `J`,
  Korea: `K`,
  Macau: `M`,
  Obsolete: `O`,
  Singapore: `S`,
  Taiwan: `T`,
  Vietnam: `V`,
  Unicode: `U`,
  VirtualShape: `X`,
});

const SourceTag = sourceTagSchema.enum;
type SourceTag = z.infer<typeof sourceTagSchema>;

interface Decomposition {
  readonly idsNode: IdsNode;
  readonly ids: string;
  readonly tags: ReadonlySet<SourceTag>;
}

function parseIdsTxt(txt: string): ReadonlyMap<string, Decomposition[]> {
  const result = new Map<string, Decomposition[]>();

  const emptySet = deepReadonly(new Set<never>());

  for (const line of txt.split(`\n`)) {
    debug(`parsing line: %O`, line);

    if (line.startsWith(`#`) || line === ``) {
      continue;
    }

    const [unicodeShortIdentifier, character, ...decompositions] =
      line.split(`\t`);

    invariant(unicodeShortIdentifier != null);
    invariant(character != null);
    invariant(decompositions.length > 0);

    expect(unicodeShortIdentifier).toMatch(/^U\+/);

    // Convert the U+ identifier to a Unicode character
    const codePoint = Number.parseInt(
      unicodeShortIdentifier.replace(`U+`, ``),
      16,
    );
    const characterFromCodePoint = String.fromCodePoint(codePoint);

    expect(character).toEqual(characterFromCodePoint);

    const parsedDecompositions = [];

    for (const decomposition of decompositions) {
      const result = /^(?<ids>.+?)(\[(?<tags>.+?)\])?$/.exec(decomposition);
      invariant(
        result?.groups != null,
        `unknown decomposition syntax: ${decomposition}`,
      );
      const { ids, tags } = result.groups;
      invariant(ids != null);
      if (tags != null) {
        expect(tags).toMatch(/[AGHJKMOSTUVX]+/);
      }
      const parsed = parseIds(ids);
      parsedDecompositions.push({
        ids,
        idsNode: parsed,
        tags:
          tags == null
            ? emptySet
            : new Set(tags.split(``).map((t) => sourceTagSchema.parse(t))),
      });
    }

    const seenTags = new Set<SourceTag>();
    for (const { tags } of parsedDecompositions) {
      for (const tag of tags) {
        if (seenTags.has(tag)) {
          debug(`duplicate tag ${tag}`);
        }
        seenTags.add(tag);
      }
    }

    invariant(!result.has(character));
    result.set(character, parsedDecompositions);
  }

  return result;
}

const dbCache = makeDbCache(import.meta.filename, `fetch_cache`, debug);

const updates = new Map<string, string>();

const rawJson = await fetchWithCache(
  `https://raw.githubusercontent.com/cjkvi/cjkvi-ids/refs/heads/master/ids.txt`,
  // ids-ext-cdef doesn't have radicals
  // `https://raw.githubusercontent.com/cjkvi/cjkvi-ids/refs/heads/master/ids-ext-cdef.txt`,
  { dbCache },
);
const allDecompositions = parseIdsTxt(rawJson);

const allGraphemes = await allHanziGraphemes();

const existingData = await loadHanziDecomposition();

const decompositionQueue = new Set(allGraphemes);

const graphemesWithoutDecomposition = new Set<string>();

const graphemesWithAmbiguousDecomposition = new Set<[string, string[]]>();

for (const grapheme of decompositionQueue) {
  // If we're only updating specific characters, skip the rest.
  if (argv.update != null && !argv.update.includes(grapheme)) {
    continue;
  }

  const decompositions = allDecompositions.get(grapheme);
  if (decompositions == null) {
    graphemesWithoutDecomposition.add(grapheme);
    continue;
  }

  let bestDecompositions: Decomposition[] = [];
  let bestDecompositionScore = -Infinity;

  for (const decomposition of decompositions) {
    let score = decomposition.tags.has(SourceTag.China) ? 100 : 0;
    for (const leaf of walkIdsNode(decomposition.idsNode)) {
      switch (leaf.operator) {
        case `LeafCharacter`: {
          score -= allDecompositions.has(leaf.character) ? 1 : 3;
          break;
        }
        case `LeafUnknownCharacter`: {
          score -= 10;
          break;
        }
      }
    }

    if (score > bestDecompositionScore) {
      bestDecompositions = [decomposition];
      bestDecompositionScore = score;
    } else if (score === bestDecompositionScore) {
      bestDecompositions.push(decomposition);
    }
  }

  invariant(bestDecompositions.length > 0);
  const bestDecompositionScoreConflict = bestDecompositions.length > 1;
  const existing = existingData.get(grapheme);

  if (decompositions.length > 1) {
    debug(
      `%O has multiple decompositions: %s`,
      grapheme,
      decompositions
        .map((d, i, arr) =>
          `${bestDecompositions.includes(d) ? (bestDecompositionScoreConflict ? (existing === d.ids ? `🟠${bestDecompositionScore}` : `🔴${bestDecompositionScore}`) : `✅`) : ``}${d.ids}${d.tags.size > 0 ? `[${[...d.tags].sort().join(``)}]` : ``}`.padEnd(
            i === arr.length - 1 ? 0 : 15,
          ),
        )
        .join(`\t\t`),
    );
  }

  // If there's an existing character to use, fall back to it.
  if (bestDecompositionScoreConflict) {
    if (existing == null) {
      graphemesWithAmbiguousDecomposition.add([
        grapheme,
        bestDecompositions.map(({ ids }) => ids),
      ]);
    } else {
      debug(
        `the best decomposition for ${grapheme} (${unicodeShortIdentifier(grapheme)}) is ambiguous, using existing`,
      );
      continue;
    }
  } else {
    const bestDecomposition = bestDecompositions[0];
    invariant(bestDecomposition != null);

    updates.set(grapheme, bestDecomposition.ids);
  }

  for (const decomposition of bestDecompositions) {
    for (const leaf of walkIdsNode(decomposition.idsNode)) {
      if (leaf.operator === `LeafCharacter`) {
        decompositionQueue.add(leaf.character);
      }
    }
  }
}

if (graphemesWithAmbiguousDecomposition.size > 0) {
  debug(
    `ambiguous decomposition for %O`,
    [...graphemesWithAmbiguousDecomposition].sort(),
  );
}

debug(
  `characters without decomposition: %O`,
  [...graphemesWithoutDecomposition].sort(),
);

debug(`gathered ${updates.size} updates to save`);

if (argv[`force-write`] || updates.size > 0) {
  const updatedData = [...mergeMaps(existingData, updates).entries()]
    // Sort the map for minimal diffs in PR
    .sort(sortComparatorString(([key]) => key));

  await writeUtf8FileIfChanged(
    path.join(
      import.meta.dirname,
      `../src/dictionary/hanziDecomposition.asset.json`,
    ),
    jsonStringifyShallowIndent(updatedData),
  );
}
