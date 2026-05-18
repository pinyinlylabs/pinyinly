import type { PinyinNumericText, PinyinText } from "#data/model.js";
import { normalizePinyinText } from "#data/pinyin.ts";
import { arrayFilterUnique, memoize0 } from "@pinyinly/lib/collections";
import { readFile } from "@pinyinly/lib/fs";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import path from "node:path";

// download from https://cc-cedict.org/editor/editor.php?handler=Download

export interface CedictIdParamsType {
  traditional: string;
  simplified: string;
  pinyin: PinyinNumericText;
  firstGloss: string;
  fingerprint: string;
}

export interface CedictV2SenseType {
  glosses: string[];
}

export interface CedictV2EntryType {
  traditional: string;
  simplified: string;
  pinyin: PinyinNumericText;
  senses: CedictV2SenseType[];
}

export interface TransformedCedictV2SenseType {
  senseId: string;
  traditional: string;
  simplified: string;
  pinyinNumeric: PinyinNumericText;
  pinyin: PinyinText[];
  glosses: string[];
}

export interface ParseCedictV2LineOptionsType {
  lineNumber?: number;
  strict?: boolean;
}

/**
 * Parses a single CC-CEDICT v2 line.
 *
 * Returns null for blank/comment lines.
 */
export function parseCedictV2Line(
  line: string,
  options: ParseCedictV2LineOptionsType = {},
): CedictV2EntryType | null {
  const strict = options.strict ?? true;
  const trimmed = line.trim();

  if (
    trimmed.length === 0 ||
    trimmed.startsWith(`#`) ||
    trimmed.startsWith(`%`)
  ) {
    return null;
  }

  const match = line.match(/^(\S+)\s+(\S+)\s+\[\[(.+?)\]\]\s+\/(.*)\/$/u);
  if (match == null) {
    if (!strict) {
      return null;
    }

    throw new Error(formatParseError(`invalid CC-CEDICT v2 line`, options));
  }

  const traditional = match[1];
  const simplified = match[2];
  const pinyin = match[3];
  const definitionBody = match[4];

  if (
    traditional == null ||
    simplified == null ||
    pinyin == null ||
    definitionBody == null
  ) {
    if (!strict) {
      return null;
    }

    throw new Error(formatParseError(`invalid CC-CEDICT v2 line`, options));
  }

  const senses = definitionBody
    .split(`/`)
    .map((sense) => sense.trim())
    .filter((sense) => sense.length > 0)
    .map((sense): CedictV2SenseType => {
      const glosses = sense
        .split(`;`)
        .map((gloss) => gloss.trim())
        .filter((gloss) => gloss.length > 0);

      return {
        glosses: glosses,
      };
    });

  if (senses.length === 0) {
    if (!strict) {
      return null;
    }

    throw new Error(formatParseError(`line has no senses`, options));
  }

  return {
    traditional,
    simplified,
    pinyin: pinyin as PinyinNumericText,
    senses,
  };
}

export function transformCedictV2Entry(
  entry: CedictV2EntryType,
): TransformedCedictV2SenseType[] {
  const alternativePinyin = new Set<string>();

  const transformedSenses = entry.senses.flatMap((sense): string[][] => {
    const transformedGlosses = sense.glosses.flatMap((gloss): string[] => {
      const alternativePinyinForGloss =
        extractAlsoPronunciationSensePinyin(gloss);
      if (alternativePinyinForGloss == null) {
        return [gloss];
      }

      for (const alternative of alternativePinyinForGloss) {
        alternativePinyin.add(alternative);
      }

      return [];
    });

    if (transformedGlosses.length === 0) {
      return [];
    }

    return [transformedGlosses];
  });

  const transformedPinyin = [
    normalizePinyinText(entry.pinyin),
    ...[...alternativePinyin].map((alternative) =>
      normalizePinyinText(alternative),
    ),
  ].filter(arrayFilterUnique());

  return transformedSenses.map((glosses) => ({
    senseId: buildCedictSenseId(
      entry.traditional,
      entry.simplified,
      entry.pinyin,
      glosses,
    ),
    traditional: entry.traditional,
    simplified: entry.simplified,
    pinyinNumeric: entry.pinyin,
    pinyin: transformedPinyin,
    glosses,
  }));
}

function extractAlsoPronunciationSensePinyin(sense: string): string[] | null {
  const match = sense.match(/^(?:\([^)]*\)\s*)*also pr\.\s*(?<tail>.+)$/iu);
  if (match == null) {
    return null;
  }

  const tail = match.groups?.[`tail`];
  if (tail == null) {
    return null;
  }

  const bracketMatches = [...tail.matchAll(/\[(?<pinyinNumeric>[^\]]+)\]/gu)];
  if (bracketMatches.length === 0) {
    return null;
  }

  const remainder = tail
    .replaceAll(/\[[^\]]+\]/gu, ` `)
    .replaceAll(/\b(?:or|and|etc\.?)\b/giu, ` `)
    .replaceAll(/[^a-z0-9\s]/giu, ` `)
    .trim();

  if (remainder.length > 0) {
    return null;
  }

  return bracketMatches
    .map((item) => item.groups?.[`pinyinNumeric`]?.trim())
    .filter((item): item is string => item != null && item.length > 0);
}

export function parseCedictV2Text(
  text: string,
  options: ParseCedictV2LineOptionsType = {},
): CedictV2EntryType[] {
  return text.split(/\r?\n/u).flatMap((line, i) => {
    const lineNumber = i + 1;
    const parsedLine = parseCedictV2Line(line, {
      strict: options.strict,
      lineNumber,
    });

    return parsedLine == null ? [] : [parsedLine];
  });
}

export const loadCedictV2 = memoize0(async (): Promise<CedictV2EntryType[]> => {
  const text = await readFile(
    path.join(import.meta.dirname, `cedict_ts-2.u8`),
    `utf8`,
  );
  return parseCedictV2Text(text, { strict: true });
});

export async function findCedictEntryById(
  cedictId: string,
): Promise<CedictV2EntryType | null> {
  if (cedictId.length === 0) {
    return null;
  }

  const indexes = await getCedictLookupIndexes();

  const bySenseId = indexes.entriesBySenseId.get(cedictId);
  if (bySenseId != null) {
    return bySenseId;
  }

  const cedictIdParams = parseCedictId(cedictId);
  if (cedictIdParams == null) {
    return null;
  }

  const candidates =
    indexes.entriesByTraditional.get(cedictIdParams.traditional) ?? [];
  const fullyMatchedCandidates = candidates.filter(
    (entry) =>
      entry.simplified === cedictIdParams.simplified &&
      entry.pinyin === cedictIdParams.pinyin,
  );

  if (fullyMatchedCandidates.length === 1) {
    return fullyMatchedCandidates[0] ?? null;
  }

  return null;
}

export async function findCedictSenseById(
  cedictSenseId: string,
): Promise<TransformedCedictV2SenseType | null> {
  if (cedictSenseId.length === 0) {
    return null;
  }

  const indexes = await getCedictLookupIndexes();
  return indexes.sensesBySenseId.get(cedictSenseId) ?? null;
}

export function buildCedictSenseId(
  traditional: string,
  simplified: string,
  pinyinNumeric: string,
  glosses: string[],
): string {
  const traditionalNormalized = traditional.normalize(`NFKC`);
  const simplifiedNormalized = simplified.normalize(`NFKC`);
  const pinyinNumericNormalized = pinyinNumeric.normalize(`NFKC`);
  const firstGloss = nonNullable(glosses[0]);
  const fingerprint = hashString(glosses.join(`;`));

  invariant(
    pinyinNumericNormalized.includes(`|`) === false,
    `pinyin ${pinyinNumericNormalized} cannot contain | character`,
  );

  return `${traditionalNormalized}|${simplifiedNormalized}|${pinyinNumericNormalized}|${firstGloss}|${fingerprint}`;
}

const getCedictLookupIndexes = memoize0(async () => {
  const entries = await loadCedictV2();

  const entriesBySenseId = new Map<string, CedictV2EntryType>();
  const sensesBySenseId = new Map<string, TransformedCedictV2SenseType>();
  const entriesByTraditional = new Map<string, CedictV2EntryType[]>();

  for (const entry of entries) {
    const transformedSenses = transformCedictV2Entry(entry);
    for (const sense of transformedSenses) {
      entriesBySenseId.set(sense.senseId, entry);
      sensesBySenseId.set(sense.senseId, sense);
    }

    const existingByTraditional = entriesByTraditional.get(entry.traditional);
    if (existingByTraditional == null) {
      entriesByTraditional.set(entry.traditional, [entry]);
    } else {
      existingByTraditional.push(entry);
    }
  }

  return {
    entriesBySenseId,
    sensesBySenseId,
    entriesByTraditional,
  };
});

export function parseCedictId(cedictId: string): CedictIdParamsType | null {
  const match = cedictId.match(
    /^(?<traditional>.+?)\|(?<simplified>.+?)\|(?<pinyin>.+?)\|(?<firstGloss>.+?)\|(?<fingerprint>[a-z0-9]+)$/u,
  );
  if (match == null) {
    return null;
  }

  const traditional = match.groups?.[`traditional`];
  const simplified = match.groups?.[`simplified`];
  const pinyin = match.groups?.[`pinyin`];
  const firstGloss = match.groups?.[`firstGloss`];
  const fingerprint = match.groups?.[`fingerprint`];

  if (
    traditional == null ||
    traditional.length === 0 ||
    simplified == null ||
    simplified.length === 0 ||
    pinyin == null ||
    pinyin.length === 0 ||
    firstGloss == null ||
    firstGloss.length === 0 ||
    fingerprint == null ||
    fingerprint.length === 0
  ) {
    return null;
  }

  return {
    traditional,
    simplified,
    pinyin: pinyin as PinyinNumericText,
    firstGloss,
    fingerprint,
  };
}

// FNV-1a, returned as a compact base36 suffix.
function hashString(value: string): string {
  let hash = 2166136261;

  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).padStart(7, `0`).slice(0, 7);
}

function formatParseError(
  message: string,
  options: ParseCedictV2LineOptionsType,
): string {
  if (options.lineNumber == null) {
    return message;
  }

  return `${message} (line ${options.lineNumber})`;
}
