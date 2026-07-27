import { isHanziCharacter, mapIdsNodeLeafs, parseIds } from "#data/hanzi.js";
import type { HanziText } from "#data/model.js";
import { normalizeIndexRanges } from "#util/indexRanges.ts";
import type { StrokeMedianPoint } from "#util/strokeMedians.ts";
import { buildSvgSegmentPaths } from "#util/strokeSegments.ts";
import {
  existsSync,
  fetchWithFsDbCache,
  glob,
  makeFsDbCache,
  mkdirSync,
  readFileSync,
} from "@pinyinly/lib/fs";
import { writeJsonFileIfChanged } from "@pinyinly/lib/jsonfmt";
import { invariant } from "@pinyinly/lib/invariant";
import makeDebug from "debug";
import isEqual from "lodash/isEqual.js";
import path from "node:path";
import yargs from "yargs";
import z from "zod";

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

const fsDbCache = makeFsDbCache(import.meta.filename, `fetch_cache`, debug);
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
  const rawJsonl = await fetchWithFsDbCache(
    `https://raw.githubusercontent.com/skishore/makemeahanzi/refs/heads/master/graphics.txt`,
    { fsDbCache },
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
  const rawJsonl = await fetchWithFsDbCache(
    `https://raw.githubusercontent.com/skishore/makemeahanzi/refs/heads/master/dictionary.txt`,
    { fsDbCache },
  );

  const data = jsonlSchema
    .parse(rawJsonl)
    .map((obj) => dictionaryRecordSchema.parse(obj));

  return new Map(data.map((entry) => [entry.character, entry]));
})();

const wikiDir = new URL(`../src/client/wiki/`, import.meta.url).pathname;

const allCharacters = await glob(`${wikiDir}/*`).then((ps) =>
  ps
    .map((p) => path.basename(p))
    .filter((p) => isHanziCharacter(p as HanziText)),
);

invariant(existsSync(wikiDir), `wiki directory does not exist: ${wikiDir}`);

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === `object` && value != null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readJsonRecord(filePath: string): Record<string, unknown> {
  try {
    const raw = JSON.parse(readFileSync(filePath, `utf-8`)) as unknown;
    return asRecord(raw);
  } catch {
    return {};
  }
}

function asStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === `string`)
    ? value
    : undefined;
}

function asStringMap(value: unknown): Record<string, string> | undefined {
  if (typeof value !== `object` || value == null || Array.isArray(value)) {
    return undefined;
  }

  const entries = Object.entries(value);
  if (
    entries.every(
      ([key, entryValue]) =>
        typeof key === `string` && typeof entryValue === `string`,
    )
  ) {
    return value as Record<string, string>;
  }

  return undefined;
}

function collectStrokeSpecTexts(
  value: unknown,
  result = new Set<string>(),
): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrokeSpecTexts(item, result);
    }
    return result;
  }

  if (typeof value !== `object` || value == null) {
    return result;
  }

  const record = value as Record<string, unknown>;
  if (typeof record[`strokes`] === `string`) {
    result.add(record[`strokes`]);
  }

  for (const nestedValue of Object.values(record)) {
    collectStrokeSpecTexts(nestedValue, result);
  }

  return result;
}

function medianPointsToSvgPath(points: readonly StrokeMedianPoint[]): string {
  return `M ` + points.map((point) => `${point[0]} ${point[1]}`).join(` L `);
}

for (const character of allCharacters) {
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

  const existingData = readJsonRecord(dataFile);
  const existingSvg = asRecord(existingData[`svg`]);

  if (graphicsRecord == null) {
    debug(`no graphics data for %O`, character);
  }

  const nextStrokes =
    graphicsRecord?.strokes ?? asStringArray(existingSvg[`strokes`]);

  const nextMedians =
    graphicsRecord == null
      ? asStringArray(existingSvg[`medians`])
      : graphicsRecord.medians.map((median) => medianPointsToSvgPath(median));

  const strokeSpecTexts = [
    ...collectStrokeSpecTexts(existingData[`decompositions`]),
    ...collectStrokeSpecTexts(asRecord(existingData[`mnemonic`])[`components`]),
  ];
  const generatedSegments =
    nextStrokes == null || nextMedians == null
      ? undefined
      : buildSvgSegmentPaths(nextStrokes, nextMedians, strokeSpecTexts);
  const existingSegments = asStringMap(existingSvg[`segments`]);
  const nextSegments =
    generatedSegments == null
      ? existingSegments
      : existingSegments == null
        ? generatedSegments
        : {
            ...existingSegments,
            ...generatedSegments,
          };

  const nextData: Record<string, unknown> = {
    ...existingData,
    hanzi: character,
  };

  if (nextStrokes == null) {
    debug(`missing svg.strokes for %O, leaving svg unchanged`, character);
  } else {
    nextData[`svg`] = {
      ...(nextMedians == null ? {} : { medians: nextMedians }),
      ...(nextSegments == null ? {} : { segments: nextSegments }),
      strokes: nextStrokes,
    };
  }

  {
    //
    // .mnemonic updates from dictionary.txt
    //
    const dictionaryRecord = dictionaryDataByCharacter.get(character);

    if (
      nextData[`mnemonic`] == true &&
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

        nextData[`mnemonic`] = newMnemonic;

        debug(`wrote mnemonic for %O`, character);
      }
    }
  }

  if (await writeJsonFileIfChanged(dataFile, nextData)) {
    debug(`wrote character data for %O`, character);
  }
}
