import { isHanziCharacter, mapIdsNodeLeafs, parseIds } from "#data/hanzi.js";
import { characterJsonSchema } from "#data/model.js";
import type { CharacterJson, HanziCharacter, HanziText } from "#data/model.js";
import { normalizeIndexRanges } from "#util/indexRanges.ts";
import { parseFigmaSvgStrokeData } from "#util/svgFont.ts";
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
  .option(`missing-only`, {
    type: `boolean`,
    default: false,
    describe: `import MakeMeAHanzi graphics only for missing, count-only, or median-missing characters`,
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
  const localDictionaryFile = path.join(
    import.meta.dirname,
    `../makemeahanzi-dictionary.txt`,
  );
  const rawJsonl = existsSync(localDictionaryFile)
    ? readFileSync(localDictionaryFile, `utf-8`)
    : await fetchWithFsDbCache(
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

const allCharacters = await glob(`${wikiDir}/*`).then((ps) => {
  const characters: HanziCharacter[] = ps
    .map((p) => path.basename(p))
    .filter((p): p is HanziCharacter => isHanziCharacter(p as HanziText));

  if (argv.missingOnly) {
    for (const character of graphicsDataByCharacter.keys()) {
      if (!isHanziCharacter(character as HanziText)) {
        continue;
      }
      const hanziCharacter = character as HanziCharacter;

      const dataFile = path.join(wikiDir, hanziCharacter, `character.json`);
      if (!existsSync(dataFile)) {
        continue;
      }

      const existingData = jsonCodec(characterJsonSchema).parse(
        readFileSync(dataFile, `utf-8`),
      );
      const strokes = existingData.svg.strokes;
      const medians = existingData.svg.medians;
      if (
        (typeof strokes === `number` ||
          medians == null ||
          medians.length !== strokes.length) &&
        !characters.includes(hanziCharacter)
      ) {
        characters.push(hanziCharacter);
      }
    }
  }

  if (argv.update != null) {
    for (const character of argv.update) {
      if (
        isHanziCharacter(character as HanziText) &&
        !characters.includes(character as HanziCharacter)
      ) {
        characters.push(character as HanziCharacter);
      }
    }
  }

  return characters;
});

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
  const svgData = parseFigmaSvgStrokeData(svgText);
  if (svgData == null) {
    return undefined;
  }

  if (svgData.medians == null) {
    debug(
      `local glyph %O has odd path count (%d), treating all paths as strokes`,
      character,
      svgData.strokes.length,
    );
  }
  return svgData;
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
  const existingData: CharacterJson = existsSync(dataFile)
    ? jsonCodec(characterJsonSchema).parse(readFileSync(dataFile, `utf-8`))
    : {
        hanzi: character,
        svg: { strokes: 0 },
      };

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

  if (typeof nextStrokes === `number`) {
    debug(`no usable stroke paths for %O, preserving stroke count`, character);
  }

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
    Array.isArray(nextStrokes) &&
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

  const dictionaryRecord = dictionaryDataByCharacter.get(character);
  const existingDecompositions =
    typeof nextData[`decompositions`] === `object` &&
    nextData[`decompositions`] != null
      ? (nextData[`decompositions`] as Record<string, string[]>)
      : {};

  if (
    Object.keys(existingDecompositions).length === 0 &&
    dictionaryRecord?.decomposition != null
  ) {
    try {
      if (dictionaryRecord.decomposition.includes(`？`)) {
        const unknownCount =
          dictionaryRecord.decomposition.split(`？`).length - 1;
        if (unknownCount === 1) {
          const unknownStrokeIndexes = dictionaryRecord.matches.flatMap(
            (matchPath, i) => (matchPath == null ? [`${i}`] : []),
          );
          const unknownStrokeCount = unknownStrokeIndexes.length;
          if (unknownStrokeCount > 0 && unknownStrokeCount <= 20) {
            const circleNumber = String.fromCodePoint(
              0x2460 + unknownStrokeCount - 1,
            );
            const decomposition = dictionaryRecord.decomposition.replace(
              `？`,
              circleNumber,
            );
            const leafStrokeSpecs: string[] = [];
            mapIdsNodeLeafs(
              parseIds(dictionaryRecord.decomposition),
              (leaf, path) => {
                const strokes =
                  leaf === `？`
                    ? normalizeIndexRanges(unknownStrokeIndexes.join(`,`))
                    : normalizeIndexRanges(
                        dictionaryRecord.matches
                          .flatMap((matchPath, i) =>
                            isEqual(matchPath, path) ? [`${i}`] : [],
                          )
                          .join(`,`),
                      );
                leafStrokeSpecs.push(strokes);
                return leaf;
              },
            );

            parseIds(decomposition);
            nextData[`decompositions`] = {
              ...existingDecompositions,
              [decomposition]: leafStrokeSpecs,
            };
            debug(`wrote partial decomposition for %O`, character);
          }
        }
      } else {
        const leafStrokeSpecs: string[] = [];
        mapIdsNodeLeafs(
          parseIds(dictionaryRecord.decomposition),
          (leaf, path) => {
            const strokes = normalizeIndexRanges(
              dictionaryRecord.matches
                .flatMap((matchPath, i) =>
                  isEqual(matchPath, path) ? [`${i}`] : [],
                )
                .join(`,`),
            );
            leafStrokeSpecs.push(strokes);
            return leaf;
          },
        );

        nextData[`decompositions`] = {
          ...existingDecompositions,
          [dictionaryRecord.decomposition]: leafStrokeSpecs,
        };
        debug(`wrote decomposition for %O`, character);
      }
    } catch (error) {
      debug(`could not parse decomposition for %O: %O`, character, error);
    }
  }

  if (await writeJsonFileIfChanged(dataFile, nextData)) {
    debug(`wrote character data for %O`, character);
  }
}
