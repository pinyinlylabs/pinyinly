import {
  hanziCharacterSchema,
  hanziTextSchema,
  pinyinTextSchema,
  PartOfSpeech,
} from "#data/model.ts";
import type { HanziWord } from "#data/model.ts";
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

export type CompleteHskVocabularyPos = CompleteHskVocabularyItem[`pos`][number];

export type DisambiguationHint = [
  hanziWord: HanziWord,
  formMeaningText: string,
  primaryGloss?: string,
  pos?: CompleteHskVocabularyPos,
];

export const disambiguationHints: DisambiguationHint[] = [
  [`老公:husband`, `(coll.) husband`, `husband`],
  [`獲:obtain`, `to obtain`, `to obtain`],
  [`冲:rush`, `thoroughfare`, `to rush`],
  [`刺:thorn`, `thorn`, `thorn`, `n`],
  [`刺:stab`, `thorn`, `to stab`, `v`],
  [`诗:poem`, `poem`],
  [`大爷:uncle`, `(coll.) father's older brother`, `father's older brother`],
  [`尽快:asap`, `as quickly as possible; as soon as possible`, `ASAP`],
  [`粗:coarse`, `coarse`, undefined, `a`],
  [`大方:generous`, `generous`],
  [`冰:ice`, `ice`],
  [`网络:network`, `network (computing, telecommunications, transport etc)`],
  [`土地:land`, `land`],
  [`大陆:mainland`, `continent; mainland`],
  [`伙:partner`, `companion`, undefined, `n`],
  [`局:office`, `office`, undefined, `n`],
  [`针:needle`, `needle`, `needle`, `n`],
  [`却:but`, `but`],
  [`辣:spicy`, `hot (spicy)`, undefined, `a`],
  [`尺:ruler`, `a Chinese foot`, `ruler`, `n`],
  [`树林:woods`, `woods`],
  [`浅:shallow`, `shallow`, undefined, `a`],
  [`孙子:grandson`, `grandson`, undefined, `n`],
  [`薄:thin`, `thin`],
  [`戴:toWear`, `to put on or wear (glasses, hat, gloves etc)`, `to wear`],
  [`盖:lid`, `lid`, `lid`, `n`],
  [`盖:cover`, `lid`, `to cover`, `v`],
  [`官:official`, `government official`],
  [`归:toReturn`, `to return`],
  [`季:season`, `season`, undefined, `n`],
  [`江:river`, `river`],
  [`宽:wide`, `wide`],
  [`密:dense`, `secret`, undefined, `a`],
  [`闪:toFlash`, `to dodge`],
  [`帅:handsome`, `(bound form) commander-in-chief`, `handsome`, `a`],
  [`松:loose`, `loose`, undefined, `a`],
  [`咸:salty`, `salted`],
  [`项:item`, `back of neck`, `item`, `n`],
  [`严:strict`, `tight (closely sealed)`, undefined, `a`],
  [`摇:toShake`, `to shake`],
  [`遇:toMeet`, `to meet`],
  [`刷:toBrush`, `to brush`, undefined, `v`],
  [`挑:toChoose`, `to carry on a shoulder pole`],
  [`倒车:transfer`, `to change buses, trains etc`, undefined, `v`],
  [`倒车:reverse`, `to reverse (a vehicle)`, undefined, `v`],
  [`圈:circle`, `circle; ring; loop`, undefined, `n`],
  [`圈:surround`, `circle; ring; loop`, undefined, `v`],
  [`降:fall`, `to drop`],
  [`摸:feel`, `to feel with the hand`],
  [`汇:remit`, `to remit`, undefined, `v`],
  [`汇报:report`, `to collect information and report back`, undefined, `v`],
  [`卷:roll`, `roll`, `to roll up`, `v`],
  [`卷:chapter`, `scroll`, `chapter`, `n`],
  [`折:break`, `to break`, undefined, `v`],
  [`扫:sweep`, `to sweep`],
  [`翻:flip`, `to turn over`],
  [`转动:rotate`, `to rotate (about an axis)`, `to rotate`, `v`],
  [`了解:understand`, `to understand`, undefined, `v`],
  [`俩:two`, `two (colloquial equivalent of 两个)`, `two`],
  [`伞:umbrella`, `umbrella`],
  [`晒:dry`, `(of the sun) to shine on`, `to sun`, `v`],
  [`阳台:balcony`, `balcony`],
  [`暗:dark`, `dark`, undefined, `a`],
  [`宝:treasure`, `jewel`, `treasure`, `n`],
  [`宝:precious`, `jewel`, `precious`, `a`],
  [`湿:wet`, `moist`, undefined, `a`],
  [`恶心:gross`, `nausea`, `disgusting`, `a`],
  [`闹:noisy`, `noisy`, `noisy`, `a`],
  [`闹:disturb`, `noisy`, `to make noise`, `v`],
  [`获:catch`, `(literary) to catch; to capture`],
  [`收获:harvest`, `to harvest`, undefined, `v`],
  [`鲜:fresh`, `fresh`, undefined, `a`],
  [`词汇:vocabulary`, `vocabulary`],
  [`大众:people`, `the masses`, undefined, `n`],
  [`妻子:wife`, `wife`],
  [`延长:prolong`, `to prolong`, undefined, `v`],
  [`资源:resources`, `natural resource (such as water or minerals)`],
  [`人家:family`, `household`, undefined, `n`],
];

export function resolveDisambiguationHintForm(
  item: CompleteHskVocabularyItem,
  hint: DisambiguationHint,
): CompleteHskVocabularyItem[`forms`][number] {
  const [hanziWord, formMeaningText] = hint;
  const matches = item.forms.filter((form) =>
    form.meanings.includes(formMeaningText),
  );

  if (matches.length !== 1) {
    const candidateMeanings = item.forms.map((form) => form.meanings);

    throw new Error(
      `${hanziWord} disambiguation hint '${formMeaningText}' matched ${matches.length} forms; candidate meanings: ${JSON.stringify(candidateMeanings)}`,
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
