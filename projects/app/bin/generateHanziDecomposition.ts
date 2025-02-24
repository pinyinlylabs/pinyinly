import { invariant } from "@haohaohow/lib/invariant";
import makeDebug from "debug";
import assert from "node:assert/strict";
import { join } from "node:path";
import yargs from "yargs";
import {
  allHanziCharacters,
  IdsNode,
  loadHanziDecomposition,
  parseIds,
  unicodeShortIdentifier,
  walkIdsNode,
} from "../src/dictionary/dictionary.js";
import {
  deepReadonly,
  mergeMaps,
  sortComparatorString,
} from "../src/util/collections.js";
import { jsonStringifyIndentOneLevel } from "../src/util/json.js";
import { makeDbCache } from "./util/cache.js";
import { fetchWithCache } from "./util/fetch.js";
import { writeUtf8FileIfChanged } from "./util/fs.js";

const debug = makeDebug(`hhh`);

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

const enum SourceTag {
  AdobeJapan16 = `A`,
  China = `G`,
  HongKong = `H`,
  Japan = `J`,
  Korea = `K`,
  Macau = `M`,
  Obsolete = `O`,
  Singapore = `S`,
  Taiwan = `T`,
  Vietnam = `V`,
  Unicode = `U`,
  VirtualShape = `X`,
}

interface Decomposition {
  readonly idsNode: IdsNode;
  readonly ids: string;
  readonly tags: ReadonlySet<string>;
}

function parseIdsTxt(txt: string): ReadonlyMap<string, Decomposition[]> {
  const result = new Map<string, Decomposition[]>();

  const emptySet = deepReadonly(new Set<string>());

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

    assert.match(unicodeShortIdentifier, /^U\+/);

    // Convert the U+ identifier to a Unicode character
    const codePoint = parseInt(unicodeShortIdentifier.replace(`U+`, ``), 16);
    const characterFromCodePoint = String.fromCodePoint(codePoint);

    assert.equal(character, characterFromCodePoint);

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
        assert.match(tags, /[AGHJKMOSTUVX]+/);
      }
      const parsed = parseIds(ids);
      parsedDecompositions.push({
        ids,
        idsNode: parsed,
        tags: tags != null ? new Set(tags.split(``)) : emptySet,
      });
    }

    const seenTags = new Set<string>();
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

const allCharacters = await allHanziCharacters();

const existingData = await loadHanziDecomposition();

const decompositionQueue = new Set(allCharacters);

const charactersWithoutDecomposition = new Set<string>();

const charactersWithAmbiguousDecomposition = new Set<[string, string[]]>();

for (const character of decompositionQueue) {
  // If we're only updating specific characters, skip the rest.
  if (argv.update != null && !argv.update.includes(character)) {
    continue;
  }

  const decompositions = allDecompositions.get(character);
  if (decompositions == null) {
    charactersWithoutDecomposition.add(character);
    continue;
  }

  let bestDecompositions: Decomposition[] = [];
  let bestDecompositionScore = -Infinity;

  for (const decomposition of decompositions) {
    let score = decomposition.tags.has(SourceTag.China) ? 100 : 0;
    for (const leaf of walkIdsNode(decomposition.idsNode)) {
      switch (leaf.type) {
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
  const existing = existingData.get(character);

  if (decompositions.length > 1) {
    debug(
      `%O has multiple decompositions: %s`,
      character,
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
    if (existing != null) {
      debug(
        `the best decomposition for ${character} (${unicodeShortIdentifier(character)}) is ambiguous, using existing`,
      );
      continue;
    } else {
      charactersWithAmbiguousDecomposition.add([
        character,
        bestDecompositions.map(({ ids }) => ids),
      ]);
    }
  } else {
    const bestDecomposition = bestDecompositions[0];
    invariant(bestDecomposition != null);

    updates.set(character, bestDecomposition.ids);
  }

  for (const decomposition of bestDecompositions) {
    for (const leaf of walkIdsNode(decomposition.idsNode)) {
      if (leaf.type === `LeafCharacter`) {
        decompositionQueue.add(leaf.character);
      }
    }
  }
}

if (charactersWithAmbiguousDecomposition.size > 0) {
  debug(
    `ambiguous decomposition for %O`,
    [...charactersWithAmbiguousDecomposition].sort(),
  );
}

debug(
  `characters without decomposition: %O`,
  [...charactersWithoutDecomposition].sort(),
);

debug(`gathered ${updates.size} updates to save`);

if (argv[`force-write`] || updates.size > 0) {
  const updatedData = [...mergeMaps(existingData, updates).entries()]
    // Sort the map for minimal diffs in PR
    .sort(sortComparatorString(([key]) => key));

  await writeUtf8FileIfChanged(
    join(
      import.meta.dirname,
      `../src/dictionary/hanziDecomposition.asset.json`,
    ),
    jsonStringifyIndentOneLevel(updatedData),
  );
}
