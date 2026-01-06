import {
  hanziCharacterSchema,
  hanziTextSchema,
  pinyinTextSchema,
} from "#data/model.ts";
import { memoize0 } from "@pinyinly/lib/collections";
import { fetchWithFsDbCache, makeFsDbCache } from "@pinyinly/lib/fs";
import { z } from "zod/v4";

const fsDbCache = makeFsDbCache(import.meta.filename);

export const completeHskVocabularyItemSchema = z
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
        z.literal(`new-7`),
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
              pinyin: pinyinTextSchema,
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

export type CompleteHskVocabularyItem = z.infer<
  typeof completeHskVocabularyItemSchema
>;

export const loadCompleteHskVocabulary = memoize0(async () => {
  const rawJson = await fetchWithFsDbCache(
    `https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/refs/heads/main/complete.json`,
    { fsDbCache },
  );

  const data = z
    .array(completeHskVocabularyItemSchema)
    .parse(JSON.parse(rawJson));

  return data;
});
