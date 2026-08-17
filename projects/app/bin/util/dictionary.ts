import type { HanziWord } from "#data/model.ts";
import { rPartOfSpeech } from "#data/rizzleSchema.js";
import type { DictionaryJson, HanziWordMeaning } from "#dictionary.ts";
import { dictionaryJsonSchema } from "#dictionary.ts";
import { sortComparatorString } from "@pinyinly/lib/collections";
import { readFileWithSchema } from "@pinyinly/lib/fs";
import type { z } from "zod";
import { dictionaryFilePath } from "./paths.ts";
import { writeJsonFileIfChanged } from "@pinyinly/lib/jsonfmt";
import { nonNullable } from "@pinyinly/lib/invariant";

type MutableDictionaryJson = z.infer<typeof dictionaryJsonSchema>;

export const readDictionaryJson = async () =>
  readFileWithSchema(dictionaryFilePath, dictionaryJsonSchema, new Map());

export async function writeDictionaryJson(dict: DictionaryJson) {
  await writeJsonFileIfChanged(dictionaryFilePath, unparseDictionaryJson(dict));
}

export function upsertHanziWordMeaning(
  dict: MutableDictionaryJson,
  hanziWord: HanziWord,
  patch: Partial<HanziWordMeaning>,
): void {
  if (patch.pinyin?.length === 0) {
    patch.pinyin = undefined;
  }

  const meaning = dict.get(hanziWord);
  if (meaning == null) {
    dict.set(hanziWord, {
      ...patch,
      gloss: nonNullable(patch.gloss),
    });
  } else {
    dict.set(hanziWord, { ...meaning, ...patch });
  }

  // Test the validity of the dictionary.
  dictionaryJsonSchema.parse(unparseDictionaryJson(dict));
}

export function unparseDictionaryJson(
  dict: DictionaryJson,
): z.input<typeof dictionaryJsonSchema> {
  return [...dict.entries()]
    .map(
      ([hanziWord, meaning]): z.input<typeof dictionaryJsonSchema>[number] => {
        return [
          hanziWord,
          {
            pos:
              meaning.pos == null
                ? undefined
                : rPartOfSpeech().marshal(meaning.pos),
            gloss: [...meaning.gloss],
            pinyin:
              meaning.pinyin == null ? meaning.pinyin : [...meaning.pinyin],
            cedict: meaning.cedict,
            freq: meaning.freq,
            hsk: meaning.hsk,
          },
        ];
      },
    )
    .sort(sortComparatorString((x) => x[0]));
}
