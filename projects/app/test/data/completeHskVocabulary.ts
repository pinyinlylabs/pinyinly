import {
  hanziCharacterSchema,
  hanziTextSchema,
  pinyinTextSchema,
  PartOfSpeech,
} from "#data/model.ts";
import type { HanziWord } from "#data/model.ts";
import { memoize0 } from "@pinyinly/lib/collections";
import {
  fetchWithFsDbCache,
  makeFsDbCache,
  readFileSync,
} from "@pinyinly/lib/fs";
import { z } from "zod/v4";
import path from "node:path";

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
        z.literal(`newest-1`),
        z.literal(`newest-2`),
        z.literal(`newest-3`),
        z.literal(`newest-4`),
        z.literal(`newest-5`),
        z.literal(`newest-6`),
        z.literal(`newest-7`),
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

export type CompleteHskVocabularyPos = CompleteHskVocabularyItem[`pos`][number];

export interface DisambiguationHintMatch {
  meaning: string;
}

export interface DisambiguationHint {
  match: DisambiguationHintMatch;
  primaryGloss?: string;
  pos?: CompleteHskVocabularyPos;
}

export type DisambiguationHintBucket = Record<string, DisambiguationHint>;

export type DisambiguationHintsByHanzi = Partial<
  Record<string, DisambiguationHintBucket>
>;

const disambiguationHintSchema = z
  .object({
    match: z
      .object({
        meaning: z.string(),
      })
      .strict(),
    primaryGloss: z.string().optional(),
    pos: completeHskVocabularyItemSchema.shape.pos.element.optional(),
  })
  .strict();

const disambiguationHintsSchema = z.record(
  z.string(),
  z.record(z.string(), disambiguationHintSchema),
);

export const disambiguationHints = disambiguationHintsSchema.parse(
  JSON.parse(
    readFileSync(
      path.join(import.meta.dirname, `completeHskVocabulary.mapping.json`),
      `utf8`,
    ),
  ),
) as DisambiguationHintsByHanzi;

export function resolveDisambiguationHintForm(
  item: CompleteHskVocabularyItem,
  hanziWord: HanziWord,
  hint: DisambiguationHint,
): CompleteHskVocabularyItem[`forms`][number] {
  const { meaning } = hint.match;
  const matches = item.forms.filter((form) => form.meanings.includes(meaning));

  if (matches.length !== 1) {
    const candidateMeanings = item.forms.map((form) => form.meanings);

    throw new Error(
      `${hanziWord} disambiguation hint '${meaning}' matched ${matches.length} forms; candidate meanings: ${JSON.stringify(candidateMeanings)}`,
    );
  }

  return matches[0]!;
}

export function parsePos(posText: string): PartOfSpeech | undefined {
  switch (posText) {
    case `n`: {
      return PartOfSpeech.Noun;
    }
    case `v`: {
      return PartOfSpeech.Verb;
    }
    case `a`: {
      return PartOfSpeech.Adjective;
    }
    case `d`: {
      return PartOfSpeech.Adverb;
    }
    case `m`: {
      return PartOfSpeech.Numeral;
    }
    default: {
      return undefined;
    }
  }
}

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
