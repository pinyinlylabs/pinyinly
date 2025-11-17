import { allHanziGraphemes } from "#dictionary/dictionary.js";
import { memoize0 } from "@pinyinly/lib/collections";
import { existsSync, updateJsonFileKey } from "@pinyinly/lib/fs";
import { invariant } from "@pinyinly/lib/invariant";
import makeDebug from "debug";
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

const graphicsData = memoize0(async () => {
  const rawJsonl = await fetchWithCache(
    `https://raw.githubusercontent.com/skishore/makemeahanzi/refs/heads/master/graphics.txt`,
    { dbCache },
  );

  const data = rawJsonl
    .split(`\n`)
    .filter((line) => line != ``)
    .map((line) => graphicsRecordSchema.parse(JSON.parse(line)));

  return {
    lookupChar: (char: string) => {
      for (const entry of data) {
        if (entry.character === char) {
          return entry;
        }
      }
    },
  };
});

export const graphicsRecordSchema = z
  .object({
    character: z.string(),
    strokes: z.array(z.string()),
    medians: z.array(z.array(z.tuple([z.number(), z.number()]))),
  })
  .strict();

export type GraphicsRecord = z.infer<typeof graphicsRecordSchema>;

const allGraphemes = await allHanziGraphemes();

const wikiDir = new URL(`../src/client/wiki/`, import.meta.url).pathname;

invariant(existsSync(wikiDir), `wiki directory does not exist: ${wikiDir}`);

for (const grapheme of allGraphemes) {
  // If we're only updating specific characters, skip the rest.
  if (argv.update != null && !argv.update.includes(grapheme)) {
    continue;
  }

  const graphics = await graphicsData();
  const record = graphics.lookupChar(grapheme);
  if (record == null) {
    debug(`no graphics data for %O`, grapheme);
    continue;
  }

  const graphemeWikiDir = path.join(wikiDir, grapheme);
  invariant(
    existsSync(graphemeWikiDir),
    `directory does not exist: ${graphemeWikiDir}`,
  );
  const dataFile = path.join(graphemeWikiDir, `grapheme.json`);
  await updateJsonFileKey(dataFile, `strokes`, record.strokes, 1);
}
