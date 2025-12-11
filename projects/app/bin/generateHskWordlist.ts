import { hanziCharacterSchema, hanziTextSchema } from "#data/model.js";
import makeDebug from "debug";
import yargs from "yargs";
import z from "zod/v4";
import { makeDbCache } from "./util/cache.js";
import { fetchWithCache } from "./util/fetch.js";

const debug = makeDebug(`pyly`);

const argv = await yargs(process.argv.slice(2))
  .usage(`$0 [args]`)
  .option(`debug`, {
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

export const hskItemSchema = z
  .object({
    simplified: hanziTextSchema,
    radical: hanziCharacterSchema,
    level: z.array(
      z.union([
        z.literal(`old-1`),
        z.literal(`old-2`),
        z.literal(`old-3`),
        z.literal(`old-4`),
        z.literal(`old-5`),
        z.literal(`old-6`),
        z.literal(`new-1`),
        z.literal(`new-2`),
        z.literal(`new-3`),
        z.literal(`new-4`),
        z.literal(`new-5`),
        z.literal(`new-6`),
        z.literal(`new-7+`),
      ]),
    ),
    frequency: z.number(),
    pos: z.array(
      z
        .string()
        .transform((val) =>
          // Fixes a case where `Rg` is in the data.
          val.toLowerCase(),
        )
        .pipe(
          z.union([
            z.literal(`a`), //	adjective
            z.literal(`ad`), //	adjective as adverbial
            z.literal(`ag`), //	adjective morpheme
            z.literal(`an`), //	adjective with nominal function
            z.literal(`b`), //	non-predicate adjective
            z.literal(`c`), //	conjunction
            z.literal(`cc`), //	???
            z.literal(`d`), //	adverb
            z.literal(`dg`), //	adverb morpheme
            z.literal(`e`), //	interjection
            z.literal(`f`), //	directional locality
            z.literal(`g`), //	morpheme
            z.literal(`h`), //	prefix
            z.literal(`i`), //	idiom
            z.literal(`j`), //	abbreviation
            z.literal(`k`), //	suffix
            z.literal(`l`), //	fixed expression
            z.literal(`m`), //	numeral
            z.literal(`mg`), //	numeric morpheme
            z.literal(`mq`), // ???
            z.literal(`n`), //	common noun
            z.literal(`ng`), //	noun morpheme
            z.literal(`nr`), //	personal name
            z.literal(`ns`), //	place name
            z.literal(`nt`), //	organization name
            z.literal(`nx`), //	nominal character string
            z.literal(`nz`), //	other proper noun
            z.literal(`o`), //	onomatopoeia
            z.literal(`p`), //	preposition
            z.literal(`q`), //	classifier
            z.literal(`qt`), //	???
            z.literal(`qv`), //	???
            z.literal(`r`), //	pronoun
            z.literal(`rg`), //	pronoun morpheme
            z.literal(`s`), //	space word
            z.literal(`t`), //	time word
            z.literal(`tg`), //	time word morpheme
            z.literal(`u`), //	auxiliary
            z.literal(`v`), //	verb
            z.literal(`vd`), //	verb as adverbial
            z.literal(`vg`), //	verb morpheme
            z.literal(`vn`), //	verb with nominal function
            z.literal(`w`), //	symbol and non-sentential punctuation
            z.literal(`x`), //	unclassified items
            z.literal(`y`), //	modal particle
            z.literal(`z`), //	descriptive
          ]),
        ),
    ),
    forms: z.array(
      z
        .object({
          traditional: hanziTextSchema,
          transcriptions: z
            .object({
              pinyin: z.string(),
              numeric: z.string(),
              wadegiles: z.string(),
              bopomofo: z.string(),
              romatzyh: z.string(),
            })
            .strict(),
          meanings: z.array(z.string()),
          classifiers: z.array(z.string()),
        })
        .strict(),
    ),
  })
  .strict();

export type HskItem = z.infer<typeof hskItemSchema>;

const fullHskList = await (async () => {
  const rawJson = await fetchWithCache(
    `https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/refs/heads/main/complete.json`,
    { dbCache },
  );

  const data = z.array(hskItemSchema).parse(JSON.parse(rawJson));

  return data;
})();

// console.log(`item 8277 =`, fullHskList[8277]);

console.log(`Loaded ${fullHskList.length} items`);
