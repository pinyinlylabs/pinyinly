import type { HanziWord } from "#data/model.ts";
import { rPartOfSpeech } from "#data/rizzleSchema.js";
import type {
  DictionaryJson,
  HanziWordMeaning,
  hanziWordMeaningSchema,
} from "#dictionary.ts";
import { dictionaryJsonSchema } from "#dictionary.ts";
import { sortComparatorString } from "@pinyinly/lib/collections";
import { readFileWithSchema, writeJsonFileIfChanged } from "@pinyinly/lib/fs";
import type { z } from "zod/v4";
import { dictionaryFilePath } from "./paths.ts";

export const readDictionaryJson = async (): Promise<DictionaryJson> =>
  readFileWithSchema(dictionaryFilePath, dictionaryJsonSchema, new Map());

export async function writeDictionaryJson(dict: DictionaryJson) {
  await writeJsonFileIfChanged(
    dictionaryFilePath,
    unparseDictionaryJson(dict),
    1,
  );
}

export function upsertHanziWordMeaning(
  dict: DictionaryJson,
  hanziWord: HanziWord,
  patch: Partial<HanziWordMeaning>,
): void {
  if (patch.pinyin?.length === 0) {
    patch.pinyin = undefined;
  }

  const meaning = dict.get(hanziWord);
  if (meaning == null) {
    dict.set(hanziWord, patch as HanziWordMeaning);
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
            ...(meaning satisfies z.input<typeof hanziWordMeaningSchema>),
            pos:
              meaning.pos == null
                ? undefined
                : rPartOfSpeech().marshal(meaning.pos),
          },
        ];
      },
    )
    .sort(sortComparatorString((x) => x[0]));
}
