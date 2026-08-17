import { isHanziCharacter, mapIdsNodeLeafs, parseIds } from "#data/hanzi.js";
import { wikiCharacterDataSchema } from "#data/model.js";
import type { HanziText } from "#data/model.js";
import { normalizeIndexRanges } from "#util/indexRanges.ts";
import {
  parseSvgPaths,
  transformArphicSpaceSvgPath,
  transformFigmaSvgPathsToArphicTtfSpace,
} from "#util/svgFont.ts";
import type { StrokeMedianPoint } from "#util/strokeSpecSvgProcessor.js";
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
import { jsonCodec } from "@pinyinly/lib/zod";
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
const arphicUkaiGlyphsDir = new URL(
  `../src/assets/fonts/ArphicUkai/glyphs/`,
  import.meta.url,
).pathname;

const allCharacters = await glob(`${wikiDir}/*`).then((ps) =>
  ps
    .map((p) => path.basename(p))
    .filter((p): p is HanziText => isHanziCharacter(p as HanziText)),
);

invariant(existsSync(wikiDir), `wiki directory does not exist: ${wikiDir}`);

function medianPointsToSvgPath(points: readonly StrokeMedianPoint[]): string {
  return `M ` + points.map((point) => `${point[0]} ${point[1]}`).join(` L `);
}

function getLocalGlyphSvgData(character: HanziText):
  | {
      strokes: string[];
      medians?: string[];
    }
  | undefined {
  const glyphFile = path.join(arphicUkaiGlyphsDir, `${character}.svg`);
  if (!existsSync(glyphFile)) {
    return undefined;
  }

  const svgText = readFileSync(glyphFile, `utf-8`);
  const rawPaths = parseSvgPaths(svgText);
  if (rawPaths.length === 0) {
    return undefined;
  }

  if (rawPaths.length % 2 === 0) {
    return transformFigmaSvgPathsToArphicTtfSpace(rawPaths);
  }

  debug(
    `local glyph %O has odd path count (%d), treating all paths as strokes`,
    character,
    rawPaths.length,
  );

  return {
    strokes: rawPaths.map((path) => transformArphicSpaceSvgPath(path.d)),
  };
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
  const existingData = jsonCodec(wikiCharacterDataSchema).parse(
    readFileSync(dataFile, `utf-8`),
  );

  const existingSvg = existingData.svg;

  if (graphicsRecord == null) {
    debug(`no graphics data for %O`, character);
  }

  const localGlyphSvgData = getLocalGlyphSvgData(character);
  let strokeSource: `local-glyph` | `makemeahanzi` | `existing`;
  if (localGlyphSvgData == null) {
    if (graphicsRecord == null) {
      strokeSource = `existing`;
    } else {
      strokeSource = `makemeahanzi`;
    }
  } else {
    strokeSource = `local-glyph`;
  }

  const nextStrokes =
    localGlyphSvgData?.strokes ??
    graphicsRecord?.strokes ??
    existingSvg.strokes;

  invariant(
    typeof nextStrokes !== `number`,
    `expected strokes to NOT be a number for %O`,
    character,
  );

  const nextMedians =
    strokeSource === `local-glyph`
      ? (localGlyphSvgData?.medians ?? existingSvg.medians)
      : graphicsRecord == null
        ? existingSvg.medians
        : graphicsRecord.medians.map((median) => medianPointsToSvgPath(median));

  debug(`svg source for %O: %s`, character, strokeSource);
  if (
    strokeSource === `local-glyph` &&
    nextMedians != null &&
    nextMedians.length !== nextStrokes.length
  ) {
    debug(
      `local glyph stroke/median length mismatch for %O: %d strokes vs %d medians`,
      character,
      nextStrokes.length,
      nextMedians.length,
    );
  }

  const nextData: Record<string, unknown> = {
    ...existingData,
    hanzi: character,
  };

  nextData[`svg`] = {
    ...existingSvg,
    ...(nextMedians == null ? {} : { medians: nextMedians }),
    strokes: nextStrokes,
  };

  if (Math.random() < 0) {
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
