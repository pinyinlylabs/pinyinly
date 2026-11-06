import type {
  HanziCharacter,
  HanziText,
  HanziWord,
  Skill,
  SrsStateType,
} from "@/data/model";
import {
  characterCurriculumMeaningSchema,
  characterCurriculumMeaningExampleSchema,
  characterJsonSchema,
  hanziCharacterSchema,
} from "@/data/model";
import type { RankedHanziWord } from "@/data/skills";
import { getHanziWordRank, rankRules } from "@/data/skills";
import { loadCharactersJson, loadDictionary } from "@/dictionary";
import { devToolsSlowQuerySleepIfEnabled } from "@/util/devtools";
import { sortComparatorNumber } from "@pinyinly/lib/collections";
import { queryOptions, skipToken } from "@tanstack/react-query";
import { Platform } from "react-native";
import { z } from "zod";
import type { DeviceStoreEntity } from "./deviceStore";
import { buildDeviceStoreKey, deviceStoreGet } from "./deviceStore";
import { getTargetHanziWordsFromDictionary } from "./db";
import type { CollectionOutput, SkillStateCollection } from "./db";

/**
 * Keeps a useQuery/useQueries hook unconditional when its input is unavailable,
 * without fetching or supplying placeholder data. T must match the real query's
 * data type, including null if it can return null.
 *
 * @example
 * useQuery(hanzi == null
 *   ? skipQuery<HanziSvgData | null>()
 *   : hanziSvgPathsQuery(hanzi));
 *
 * Not for Suspense queries, which require a runnable query function.
 */
export function skipQuery<T>() {
  return queryOptions<T>({
    queryKey: [`skipQuery`],
    queryFn: skipToken,
  });
}

export const dictionaryQuery = queryOptions({
  queryKey: [`dictionary`],
  queryFn: async () => {
    await devToolsSlowQuerySleepIfEnabled();

    return loadDictionary();
  },
  networkMode: `offlineFirst`,
  retry: false,
  structuralSharing: false,
});

export const charactersJsonQuery = queryOptions({
  queryKey: [`charactersJson`],
  queryFn: async () => {
    await devToolsSlowQuerySleepIfEnabled();

    return loadCharactersJson();
  },
  networkMode: `offlineFirst`,
  retry: false,
  structuralSharing: false,
});

export function hanziWordsByRankData({
  skillStates,
  hanziWords,
}: {
  skillStates: CollectionOutput<SkillStateCollection>[];
  hanziWords: HanziWord[];
}): Map<number, RankedHanziWord[]> {
  const skillSrsStates = new Map<Skill, SrsStateType>(
    skillStates.map((item) => [item.skill, item.srs]),
  );
  const rankToHanziWords = new Map<number, RankedHanziWord[]>();

  for (const hanziWord of hanziWords) {
    const rankedHanziWord = getHanziWordRank({
      hanziWord,
      skillSrsStates,
      rankRules,
    });

    const rankNumber = rankedHanziWord.rank;
    const existing = rankToHanziWords.get(rankNumber);
    if (existing == null) {
      rankToHanziWords.set(rankNumber, [rankedHanziWord]);
    } else {
      existing.push(rankedHanziWord);
    }
  }

  for (const unsorted of rankToHanziWords.values()) {
    unsorted.sort(sortComparatorNumber((x) => x.completion));
  }
  return rankToHanziWords;
}

export async function getAllTargetHanziWords(): Promise<HanziWord[]> {
  const dictionary = await loadDictionary();
  return getTargetHanziWordsFromDictionary(dictionary);
}

export const fetchArrayBufferQuery = (uri: string | null) =>
  queryOptions({
    queryKey: [`fetchArrayBuffer`, uri],
    queryFn:
      uri == null
        ? skipToken
        : async ({ signal }) => {
            await devToolsSlowQuerySleepIfEnabled();
            return fetch(uri, { signal }).then(async (res) =>
              res.arrayBuffer(),
            );
          },
    staleTime: Infinity,
  });

const hanziSvgDataSchema = z
  .strictObject({
    strokes: z.array(z.string()),
    medians: z.array(z.string()).optional(),
    segments: z.record(z.string(), z.string()).optional(),
  })
  .describe(
    `SVG stroke and median data with optional precomputed segment paths.`,
  );

const wikiMdastRootSchema = z.looseObject({
  type: z.literal(`root`),
  children: z.array(z.unknown()),
});

export const wikiPayloadSchema = z
  .strictObject({
    mdast: wikiMdastRootSchema.optional(),
    curriculumMeanings: z.array(characterCurriculumMeaningSchema).optional(),
    visuallySimilar: z.array(hanziCharacterSchema).optional(),
    curriculumMeaningExamples: z
      .array(characterCurriculumMeaningExampleSchema)
      .optional(),
  })
  .refine(
    ({
      mdast,
      curriculumMeanings,
      visuallySimilar,
      curriculumMeaningExamples,
    }) =>
      mdast != null ||
      (curriculumMeanings != null && curriculumMeanings.length > 0) ||
      (visuallySimilar != null && visuallySimilar.length > 0) ||
      (curriculumMeaningExamples != null &&
        curriculumMeaningExamples.length > 0),
  );

export type WikiMdastRoot = z.infer<typeof wikiMdastRootSchema>;
export type WikiPayload = z.infer<typeof wikiPayloadSchema>;
export type HanziSvgData = z.infer<typeof hanziSvgDataSchema>;

export const hanziSvgPathsQueryWeb = (hanzi: HanziCharacter) =>
  queryOptions<HanziSvgData | null>({
    queryKey: [`hanziSvgPaths`, hanzi] as const,
    queryFn: async ({ signal }): Promise<HanziSvgData | null> => {
      const response = await fetch(
        `/raw/svgs/${encodeURIComponent(hanzi)}.json`,
        { signal },
      );
      if (!response.ok) {
        return null;
      }

      const json = (await response.json()) as unknown;
      const result = hanziSvgDataSchema.safeParse(json);
      return result.success ? result.data : null;
    },
    staleTime: Infinity,
  });

export const hanziSvgPathsQueryNative = (hanzi: HanziCharacter) =>
  queryOptions<HanziSvgData | null>({
    queryKey: [`hanziSvgPaths`, hanzi] as const,
    queryFn: async (): Promise<HanziSvgData | null> => {
      return null;
    },
    staleTime: Infinity,
  });

export const hanziSvgPathsQuery = Platform.select({
  web: hanziSvgPathsQueryWeb,
  default: hanziSvgPathsQueryNative,
});

export const wikiPayloadQueryWeb = (hanzi: HanziText) =>
  queryOptions<WikiPayload | null>({
    queryKey: [`wikiPayload`, hanzi] as const,
    queryFn: async ({ signal }): Promise<WikiPayload | null> => {
      const response = await fetch(
        `/raw/wiki/${encodeURIComponent(hanzi)}.json`,
        { signal },
      );
      if (!response.ok) {
        return null;
      }

      const json = (await response.json()) as unknown;
      const result = wikiPayloadSchema.safeParse(json);
      return result.success ? result.data : null;
    },
    staleTime: Infinity,
  });

export const wikiPayloadQueryNative = (hanzi: HanziText) =>
  queryOptions<WikiPayload | null>({
    queryKey: [`wikiPayload`, hanzi] as const,
    queryFn: async (): Promise<WikiPayload | null> => {
      return null;
    },
    staleTime: Infinity,
  });

export const wikiPayloadQuery = Platform.select({
  web: wikiPayloadQueryWeb,
  default: wikiPayloadQueryNative,
});

const characterDecompositionDataSchema = characterJsonSchema.pick({
  decompositions: true,
  mnemonic: true,
});

export type CharacterDecompositionData = z.infer<
  typeof characterDecompositionDataSchema
>;

export const fetchAudioBufferQuery = (
  uri: string | null,
  audioContext: AudioContext | null,
) =>
  queryOptions({
    queryKey: [
      `fetchAudioBuffer`,
      audioContext == null ? `audioContext == null` : `audioContext != null`,
      uri,
    ] as const,
    queryFn:
      uri == null || audioContext == null
        ? (skipToken as never)
        : async (): Promise<AudioBuffer> => {
            await devToolsSlowQuerySleepIfEnabled();
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();
            return audioContext.decodeAudioData(arrayBuffer);
          },
    staleTime: Infinity,
    structuralSharing: false,
    throwOnError: true,
  });

export const deviceStoreQuery = <T extends DeviceStoreEntity>(key: T) =>
  queryOptions({
    queryKey: [`deviceStore`, buildDeviceStoreKey(key)],
    queryFn: async () => {
      await devToolsSlowQuerySleepIfEnabled();
      return deviceStoreGet(key);
    },
    networkMode: `offlineFirst`,
    retry: false,
    structuralSharing: false,
    throwOnError: true,
  });
