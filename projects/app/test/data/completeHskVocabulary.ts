import {
  hanziCharacterSchema,
  hanziTextSchema,
  pinyinTextSchema,
  PartOfSpeech,
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

export type DisambiguationHint = [
  hanzi: string,
  formIndex: number,
  meaningKey: string,
  primaryGloss?: string,
  pos?: PartOfSpeech,
];

export const disambiguationHints: DisambiguationHint[] = [
  [`老公`, 0, `husband`, `husband`],
  [`獲`, 0, `obtain`, `to obtain`],
  [`冲`, 1, `rush`, `to rush`],
  [`刺`, 1, `thorn`, `thorn`, PartOfSpeech.Noun],
  [`刺`, 1, `stab`, `to stab`, PartOfSpeech.Verb],
  [`诗`, 1, `poem`],
  [`大爷`, 1, `uncle`, `father's older brother`],
  [`尽快`, 0, `asap`, `ASAP`],
  [`粗`, 0, `coarse`, undefined, PartOfSpeech.Adjective],
  [`大方`, 1, `generous`],
  [`冰`, 0, `ice`],
  [`网络`, 1, `network`],
  [`土地`, 0, `land`],
  [`大陆`, 1, `mainland`],
  [`伙`, 1, `partner`, undefined, PartOfSpeech.Noun],
  [`局`, 1, `office`, undefined, PartOfSpeech.Noun],
  [`针`, 0, `needle`, `needle`, PartOfSpeech.Noun],
  [`却`, 1, `but`],
  [`辣`, 1, `spicy`, undefined, PartOfSpeech.Adjective],
  [`尺`, 1, `ruler`, `ruler`, PartOfSpeech.Noun],
  [`树林`, 1, `woods`],
  [`浅`, 1, `shallow`, undefined, PartOfSpeech.Adjective],
  [`孙子`, 1, `grandson`, undefined, PartOfSpeech.Noun],
  [`薄`, 1, `thin`],
  [`戴`, 1, `toWear`, `to wear`],
  [`盖`, 1, `lid`, `lid`, PartOfSpeech.Noun],
  [`盖`, 1, `cover`, `to cover`, PartOfSpeech.Verb],
  [`官`, 1, `official`],
  [`归`, 1, `toReturn`],
  [`季`, 1, `season`, undefined, PartOfSpeech.Noun],
  [`江`, 1, `river`],
  [`宽`, 1, `wide`],
  [`密`, 1, `dense`, undefined, PartOfSpeech.Adjective],
  [`闪`, 1, `toFlash`],
  [`帅`, 1, `handsome`, `handsome`, PartOfSpeech.Adjective],
  [`松`, 2, `loose`, undefined, PartOfSpeech.Adjective],
  [`咸`, 2, `salty`],
  [`项`, 1, `item`, `item`, PartOfSpeech.Noun],
  [`严`, 1, `strict`, undefined, PartOfSpeech.Adjective],
  [`摇`, 1, `toShake`],
  [`遇`, 1, `toMeet`],
  [`刷`, 0, `toBrush`, undefined, PartOfSpeech.Verb],
  [`挑`, 0, `toChoose`],
  [`倒车`, 0, `transfer`, undefined, PartOfSpeech.Verb],
  [`倒车`, 1, `reverse`, undefined, PartOfSpeech.Verb],
  [`圈`, 2, `circle`, undefined, PartOfSpeech.Noun],
  [`圈`, 2, `surround`, undefined, PartOfSpeech.Verb],
  [`降`, 0, `fall`],
  [`摸`, 0, `feel`],
  [`汇`, 0, `remit`, undefined, PartOfSpeech.Verb],
  [`汇报`, 0, `report`, undefined, PartOfSpeech.Verb],
  [`卷`, 0, `roll`, `to roll up`, PartOfSpeech.Verb],
  [`卷`, 1, `chapter`, `chapter`, PartOfSpeech.Noun],
  [`折`, 2, `break`, undefined, PartOfSpeech.Verb],
  [`扫`, 0, `sweep`],
  [`翻`, 0, `flip`],
  [`转动`, 1, `rotate`, `to rotate`, PartOfSpeech.Verb],
  [`了解`, 0, `understand`, undefined, PartOfSpeech.Verb],
  [`俩`, 0, `two`, `two`],
  [`伞`, 0, `umbrella`],
  [`晒`, 1, `dry`, `to sun`, PartOfSpeech.Verb],
  [`阳台`, 1, `balcony`],
  [`暗`, 1, `dark`, undefined, PartOfSpeech.Adjective],
  [`宝`, 1, `treasure`, `treasure`, PartOfSpeech.Noun],
  [`宝`, 1, `precious`, `precious`, PartOfSpeech.Adjective],
  [`湿`, 1, `wet`, undefined, PartOfSpeech.Adjective],
  [`恶心`, 1, `gross`, `disgusting`, PartOfSpeech.Adjective],
  [`闹`, 1, `noisy`, `noisy`, PartOfSpeech.Adjective],
  [`闹`, 1, `disturb`, `to make noise`, PartOfSpeech.Verb],
  [`获`, 0, `catch`],
  [`收获`, 1, `harvest`, undefined, PartOfSpeech.Verb],
  [`鲜`, 2, `fresh`, undefined, PartOfSpeech.Adjective],
  [`词汇`, 1, `vocabulary`],
  [`大众`, 1, `people`, undefined, PartOfSpeech.Noun],
  [`妻子`, 1, `wife`],
  [`延长`, 1, `prolong`, undefined, PartOfSpeech.Verb],
  [`资源`, 1, `resources`],
  [`人家`, 0, `family`, undefined, PartOfSpeech.Noun],
];

export function parseVendorPos(posText: string): PartOfSpeech | undefined {
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
