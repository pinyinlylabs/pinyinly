import {
  isHanziGrapheme,
  mapIdsNodeLeafs,
  parseIds,
  wikiGraphemeDataSchema,
} from "#data/hanzi.js";
import type { HanziText } from "#data/model.js";
import { normalizeIndexRanges } from "#util/indexRanges.ts";
import {
  existsSync,
  glob,
  mkdirSync,
  readFileSync,
  updateJsonFileKey,
  writeFileSync,
} from "@pinyinly/lib/fs";
import { invariant } from "@pinyinly/lib/invariant";
import makeDebug from "debug";
import isEqual from "lodash/isEqual.js";
import path from "node:path";
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

const dbCache = makeDbCache(import.meta.filename, `fetch_cache`, debug);
const jsonlSchema = z.string().transform((str) =>
  str
    .split(`\n`)
    .filter((line) => line !== ``)
    .map((line) => JSON.parse(line) as unknown),
);

export const dictionaryRecordSchema = z
  .object({
    character: z.string(),
    definition: z.string().optional(),
    decomposition: z.string(),
    radical: z.string(),
    etymology: z.unknown().optional(),
    matches: z.array(z.array(z.number()).nullable()),
    pinyin: z.array(z.string()),
  })
  .strict();

export type DictionaryRecord = z.infer<typeof dictionaryRecordSchema>;

export const graphicsRecordSchema = z
  .object({
    character: z.string(),
    strokes: z.array(z.string()),
    medians: z.array(z.array(z.tuple([z.number(), z.number()]))),
  })
  .strict();

export type GraphicsRecord = z.infer<typeof graphicsRecordSchema>;

const graphicsDataByCharacter = await (async () => {
  const rawJsonl = await fetchWithCache(
    `https://raw.githubusercontent.com/skishore/makemeahanzi/refs/heads/master/graphics.txt`,
    { dbCache },
  );

  const data = jsonlSchema
    .parse(rawJsonl)
    .map((obj) => graphicsRecordSchema.parse(obj));

  const result = new Map(data.map((entry) => [entry.character, entry]));

  // Has the wrong strokes data as of 2025-11-26
  result.delete(`戶`);

  return result;
})();

const dictionaryDataByCharacter = await (async () => {
  const rawJsonl = await fetchWithCache(
    `https://raw.githubusercontent.com/skishore/makemeahanzi/refs/heads/master/dictionary.txt`,
    { dbCache },
  );

  const data = jsonlSchema
    .parse(rawJsonl)
    .map((obj) => dictionaryRecordSchema.parse(obj));

  return new Map(data.map((entry) => [entry.character, entry]));
})();

const wikiDir = new URL(`../src/client/wiki/`, import.meta.url).pathname;

const allGraphemes = await glob(`${wikiDir}/*`).then((ps) =>
  ps
    .map((p) => path.basename(p))
    .filter((p) => isHanziGrapheme(p as HanziText)),
);

invariant(existsSync(wikiDir), `wiki directory does not exist: ${wikiDir}`);

for (const character of allGraphemes) {
  // If we're only updating specific characters, skip the rest.
  if (argv.update != null && !argv.update.includes(character)) {
    continue;
  }

  const graphicsRecord = graphicsDataByCharacter.get(character);

  const characterWikiDir = path.join(wikiDir, character);
  if (!existsSync(characterWikiDir)) {
    mkdirSync(characterWikiDir);
  }

  const dataFile = path.join(characterWikiDir, `character.json`);
  const mdxFile = path.join(characterWikiDir, `meaning.mdx`);
  const indentLevels = 2;

  if (await updateJsonFileKey(dataFile, `hanzi`, character, indentLevels)) {
    debug(`wrote hanzi for %O`, character);
  }

  if (graphicsRecord == null) {
    debug(`no graphics data for %O`, character);
  } else {
    if (
      await updateJsonFileKey(
        dataFile,
        `strokes`,
        graphicsRecord.strokes,
        indentLevels,
      )
    ) {
      debug(`wrote strokes for %O`, character);
    }
  }

  {
    //
    // .mnemonic updates from dictionary.txt
    //
    let existing;
    try {
      existing = wikiGraphemeDataSchema.parse(
        JSON.parse(readFileSync(dataFile, `utf-8`)),
      );
    } catch (error) {
      debug(`failed to read existing data for %O: %O`, character, error);
    }

    const dictionaryRecord = dictionaryDataByCharacter.get(character);

    if (
      existing?.mnemonic == null &&
      dictionaryRecord?.decomposition != null &&
      dictionaryRecord.decomposition !== `？`
    ) {
      debug(`no mnemonic for %O`, character);
      if (dictionaryRecord.decomposition.split(`？`).length > 2) {
        debug(`more than one ？, skipping`);
      } else {
        const newMnemonic = {
          components: mapIdsNodeLeafs(
            parseIds(dictionaryRecord.decomposition),
            (character, path) => {
              const matchesPath = character === `？` ? null : path;
              const strokes = normalizeIndexRanges(
                dictionaryRecord.matches
                  .flatMap((p, i) => (isEqual(p, matchesPath) ? [`${i}`] : []))
                  .join(`,`),
              );

              return {
                ...(character === `？` ? {} : { hanzi: character }),
                strokes,
              };
            },
          ),
        };

        await updateJsonFileKey(
          dataFile,
          `mnemonic`,
          newMnemonic,
          indentLevels,
        );

        debug(`wrote mnemonic for %O`, character);
      }
    }
  }

  {
    // Make sure there's a meaning.mdx file
    if (!existsSync(mdxFile)) {
      writeFileSync(
        mdxFile,
        `import data from "./character.json";

<WikiHanziGraphemeDecomposition graphemeData={data} />
`,
      );
      debug(`wrote meaning.mdx for %O`, character);
    }
  }
}
