import { normalizePinyinText } from "#data/pinyin.ts";
import { memoize0 } from "@pinyinly/lib/collections";
import { readFile } from "@pinyinly/lib/fs";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import path from "node:path";

// download from https://cc-cedict.org/editor/editor.php?handler=Download

export interface CedictIdParamsType {
  traditional: string;
  simplified: string;
  pinyinRaw: string;
  firstGloss: string;
  fingerprint: string;
}

export interface CedictV2SenseType {
  senseId: string;
  glosses: string[];
}

export interface CedictV2EntryType {
  traditional: string;
  simplified: string;
  pinyinRaw: string;
  pinyin: string;
  senses: CedictV2SenseType[];
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
  const pinyinRaw = match[3];
  const definitionBody = match[4];

  if (
    traditional == null ||
    simplified == null ||
    pinyinRaw == null ||
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

      const senseId = buildCedictSenseId(
        traditional,
        simplified,
        pinyinRaw,
        glosses,
      );

      return {
        senseId,
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
    pinyinRaw,
    pinyin: normalizePinyinText(pinyinRaw),
    senses,
  };
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
      entry.pinyinRaw === cedictIdParams.pinyinRaw,
  );

  if (fullyMatchedCandidates.length === 1) {
    return fullyMatchedCandidates[0] ?? null;
  }

  return null;
}

export async function findCedictSenseById(
  cedictSenseId: string,
): Promise<CedictV2SenseType | null> {
  if (cedictSenseId.length === 0) {
    return null;
  }

  const indexes = await getCedictLookupIndexes();
  return indexes.sensesBySenseId.get(cedictSenseId) ?? null;
}

export function buildCedictSenseId(
  traditional: string,
  simplified: string,
  pinyinRaw: string,
  glosses: string[],
): string {
  const traditionalNormalized = traditional.normalize(`NFKC`);
  const simplifiedNormalized = simplified.normalize(`NFKC`);
  const pinyinRawNormalized = pinyinRaw.normalize(`NFKC`);
  const firstGloss = nonNullable(glosses[0]);
  const fingerprint = hashString(glosses.join(`;`));

  invariant(
    pinyinRawNormalized.includes(`|`) === false,
    `pinyin ${pinyinRawNormalized} cannot contain | character`,
  );

  return `${traditionalNormalized}|${simplifiedNormalized}|${pinyinRawNormalized}|${firstGloss}|${fingerprint}`;
}

const getCedictLookupIndexes = memoize0(async () => {
  const entries = await loadCedictV2();

  const entriesBySenseId = new Map<string, CedictV2EntryType>();
  const sensesBySenseId = new Map<string, CedictV2SenseType>();
  const entriesByTraditional = new Map<string, CedictV2EntryType[]>();

  for (const entry of entries) {
    for (const sense of entry.senses) {
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
    /^(?<traditional>.+?)\|(?<simplified>.+?)\|(?<pinyinRaw>.+?)\|(?<firstGloss>.+?)\|(?<fingerprint>[a-z0-9]+)$/u,
  );
  if (match == null) {
    return null;
  }

  const traditional = match.groups?.[`traditional`];
  const simplified = match.groups?.[`simplified`];
  const pinyinRaw = match.groups?.[`pinyinRaw`];
  const firstGloss = match.groups?.[`firstGloss`];
  const fingerprint = match.groups?.[`fingerprint`];

  if (
    traditional == null ||
    traditional.length === 0 ||
    simplified == null ||
    simplified.length === 0 ||
    pinyinRaw == null ||
    pinyinRaw.length === 0 ||
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
    pinyinRaw,
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
