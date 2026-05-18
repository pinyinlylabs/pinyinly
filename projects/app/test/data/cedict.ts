import type { PinyinNumericText, PinyinText } from "#data/model.js";
import { normalizePinyinText } from "#data/pinyin.ts";
import {
  arrayFilterUnique,
  mapArrayAdd,
  memoize0,
} from "@pinyinly/lib/collections";
import { readFile, writeUtf8FileIfChanged } from "@pinyinly/lib/fs";
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

export interface CedictV2EntryType {
  traditional: string;
  simplified: string;
  pinyin: PinyinNumericText;
  senses: {
    glosses: string[];
  }[];
}

export interface TransformedCedictV2SenseType {
  senseId: string;
  traditional: string;
  simplified: string;
  pinyinNumeric: PinyinNumericText;
  pinyin: PinyinText[];
  glosses: string[];
  classifiers?: string[];
  tags?: string[];
}

export interface ParseCedictV2LineOptionsType {
  lineNumber?: number;
  strict?: boolean;
  edits?: CedictV2EditsType;
}

export interface CedictV2EditRuleType {
  oldSense: string;
  newSense: string;
}

export interface CedictV2EntryEditsType {
  traditional: string;
  simplified: string;
  pinyin: PinyinNumericText;
  rules: CedictV2EditRuleType[];
}

export interface CedictV2EditsType {
  entriesByKey: Map<string, CedictV2EntryEditsType>;
}

const CEDICT_V2_LINE_REGEXP = /^(\S+)\s+(\S+)\s+\[\[(.+?)\]\]\s+\/(.*)\/$/u;

interface CedictSenseTagDefinitionType {
  tag: string;
  /** Raw regex string matching the tag marker in a gloss (e.g. `\\(idiom\\)`). */
  pattern: string;
  /**
   * Which position(s) in a gloss to scan for this tag marker.
   * Defaults to `'both'`.
   */
  position?: `start` | `end` | `both`;
}

/**
 * Registry of sense tag patterns. Add entries here to support new tag markers.
 * Patterns are matched at the start or end of individual gloss strings.
 */
const CEDICT_SENSE_TAG_DEFINITIONS: readonly CedictSenseTagDefinitionType[] = [
  { tag: `idiom`, pattern: `\\(idiom\\)` },
  { tag: `figurative`, pattern: `\\(fig\\.\\)` },
  { tag: `literary`, pattern: `lit\\.`, position: `start` },
];

const cedictSenseTagLookup: ReadonlyArray<{ tag: string; re: RegExp }> =
  CEDICT_SENSE_TAG_DEFINITIONS.map((d) => ({
    tag: d.tag,
    re: new RegExp(`^(?:${d.pattern})$`, `iu`),
  }));

const cedictSenseTagStartPatterns = CEDICT_SENSE_TAG_DEFINITIONS.filter(
  (d) => (d.position ?? `both`) !== `end`,
).map((d) => `(?:${d.pattern})`);

const cedictSenseTagEndPatterns = CEDICT_SENSE_TAG_DEFINITIONS.filter(
  (d) => (d.position ?? `both`) !== `start`,
).map((d) => `(?:${d.pattern})`);

// Global: finds all tag markers anywhere in a string
const cedictSenseTagGlobalRe = new RegExp(
  CEDICT_SENSE_TAG_DEFINITIONS.map((d) => `(?:${d.pattern})`).join(`|`),
  `igu`,
);

// Non-global: detects a tag marker at the start of a gloss
const cedictSenseTagAtStartRe = new RegExp(
  `^(?:${cedictSenseTagStartPatterns.join(`|`)})\\s*`,
  `iu`,
);

// Non-global: detects a tag marker at the end of a gloss
const cedictSenseTagAtEndRe = new RegExp(
  `\\s*(?:${cedictSenseTagEndPatterns.join(`|`)})$`,
  `iu`,
);

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

  const match = line.match(CEDICT_V2_LINE_REGEXP);
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

  let senses = definitionBody
    .split(`/`)
    .map((sense) => sense.trim())
    .filter((sense) => sense.length > 0);

  const entryEdits = options.edits?.entriesByKey.get(
    buildCedictV2EditEntryKey(traditional, simplified, pinyin),
  );
  if (entryEdits != null) {
    senses = applyCedictEntryEdits(senses, entryEdits, options);
  }

  const parsedSenses = senses.map((sense) => {
    const glosses = sense
      .split(`;`)
      .map((gloss) => gloss.trim())
      .filter((gloss) => gloss.length > 0);

    return {
      glosses: glosses,
    };
  });

  if (parsedSenses.length === 0) {
    if (!strict) {
      return null;
    }

    throw new Error(formatParseError(`line has no senses`, options));
  }

  return {
    traditional,
    simplified,
    pinyin: pinyin as PinyinNumericText,
    senses: parsedSenses,
  };
}

export function parseCedictV2EditsText(text: string): CedictV2EditsType {
  const lines = text.split(/\r?\n/u);
  const entriesByKey = new Map<string, CedictV2EntryEditsType>();
  let i = 0;

  while (i < lines.length) {
    const currentLine = lines[i];
    const lineNumber = i + 1;
    const trimmed = currentLine?.trim() ?? ``;

    if (trimmed.length === 0) {
      i += 1;
      continue;
    }

    const header = parseCedictV2EditHeader(trimmed, lineNumber);
    i += 1;

    const rules: CedictV2EditRuleType[] = [];

    while (i < lines.length) {
      const ruleLine = lines[i];
      const ruleLineNumber = i + 1;
      const ruleTrimmed = ruleLine?.trim() ?? ``;

      if (ruleTrimmed.length === 0) {
        i += 1;
        break;
      }

      rules.push(parseCedictV2EditRule(ruleTrimmed, ruleLineNumber));
      i += 1;
    }

    if (rules.length === 0) {
      throw new Error(
        formatCedictEditsParseError(`edit block has no rules`, lineNumber),
      );
    }

    const key = buildCedictV2EditEntryKey(
      header.traditional,
      header.simplified,
      header.pinyin,
    );

    if (entriesByKey.has(key)) {
      throw new Error(
        formatCedictEditsParseError(
          `duplicate edit block for ${header.traditional} ${header.simplified} [[${header.pinyin}]]`,
          lineNumber,
        ),
      );
    }

    entriesByKey.set(key, {
      traditional: header.traditional,
      simplified: header.simplified,
      pinyin: header.pinyin,
      rules,
    });
  }

  return {
    entriesByKey,
  };
}

export function applyCedictV2EditsToText(
  text: string,
  options: ParseCedictV2LineOptionsType = {},
): string {
  const strict = options.strict ?? true;

  return text
    .split(/\r?\n/u)
    .map((line, i) => {
      const lineNumber = i + 1;
      const parsedLine = parseCedictV2Line(line, {
        strict,
        lineNumber,
        edits: options.edits,
      });

      if (parsedLine == null) {
        return line;
      }

      return serializeCedictV2Entry(parsedLine);
    })
    .join(`\n`);
}

function serializeCedictV2Entry(entry: CedictV2EntryType): string {
  const senses = entry.senses.map((sense) =>
    sense.glosses.map((gloss) => normalizeTagsInGloss(gloss.trim())).join(`; `),
  );

  return `${entry.traditional} ${entry.simplified} [[${entry.pinyin}]] /${senses.join(`/`)}/`;
}

export function transformCedictV2Entry(
  entry: CedictV2EntryType,
): TransformedCedictV2SenseType[] {
  const standaloneAlternativePinyin = new Set<string>();
  const standaloneClassifiers = new Set<string>();

  const transformedSenses = entry.senses.flatMap((sense) => {
    const inlineAlternativePinyin = new Set<string>();
    const inlineClassifiers = new Set<string>();
    const senseTags: string[] = [];
    const originalGlosses: string[] = [];
    const cleanedGlosses: string[] = [];

    for (const gloss of sense.glosses) {
      let cleanedGloss = gloss;

      const inlineClassifierExtraction =
        extractInlineClassifierAndCleanGloss(cleanedGloss);
      if (inlineClassifierExtraction != null) {
        for (const classifier of inlineClassifierExtraction.classifiers) {
          inlineClassifiers.add(classifier);
        }
        cleanedGloss = inlineClassifierExtraction.cleanedGloss;
      }

      // First try inline extraction (e.g., "outside (also pr. [wai4 mian5] for this sense)")
      const inlineExtraction =
        extractInlineAlsoPronunciationAndCleanGloss(cleanedGloss);
      if (inlineExtraction != null) {
        for (const alternative of inlineExtraction.alternativePinyin) {
          inlineAlternativePinyin.add(alternative);
        }
        cleanedGloss = inlineExtraction.cleanedGloss;
      }

      const tagExtraction = extractSenseTagsFromGloss(cleanedGloss);
      if (tagExtraction != null) {
        for (const tag of tagExtraction.tags) {
          if (!senseTags.includes(tag)) {
            senseTags.push(tag);
          }
        }
        cleanedGloss = tagExtraction.cleanedGloss;
      }

      if (cleanedGloss.length === 0) {
        continue;
      }

      const classifiersForGloss = extractClassifierSenseRefs(cleanedGloss);
      if (classifiersForGloss != null) {
        for (const classifier of classifiersForGloss) {
          standaloneClassifiers.add(classifier);
        }
        continue;
      }

      // Then try standalone extraction (e.g., "also pr. [san1 jin1]" as entire sense)
      const alternativePinyinForGloss =
        extractAlsoPronunciationSensePinyin(cleanedGloss);
      if (alternativePinyinForGloss != null) {
        for (const alternative of alternativePinyinForGloss) {
          standaloneAlternativePinyin.add(alternative);
        }
        continue;
      }

      originalGlosses.push(gloss);
      cleanedGlosses.push(cleanedGloss);
    }

    if (cleanedGlosses.length === 0) {
      return [];
    }

    return [
      {
        original: originalGlosses,
        cleaned: cleanedGlosses,
        inlineAlternativePinyin: [...inlineAlternativePinyin],
        inlineClassifiers: [...inlineClassifiers],
        senseTags,
      },
    ];
  });

  return transformedSenses.map((glossPair) => {
    const transformedPinyin = [
      normalizePinyinText(entry.pinyin),
      ...[...standaloneAlternativePinyin].map((alternative) =>
        normalizePinyinText(alternative),
      ),
      ...glossPair.inlineAlternativePinyin.map((alternative) =>
        normalizePinyinText(alternative),
      ),
    ].filter(arrayFilterUnique());

    const transformedClassifiers = [
      ...standaloneClassifiers,
      ...glossPair.inlineClassifiers,
    ].filter(arrayFilterUnique());

    return {
      senseId: buildCedictSenseId(
        entry.traditional,
        entry.simplified,
        entry.pinyin,
        glossPair.original,
      ),
      traditional: entry.traditional,
      simplified: entry.simplified,
      pinyinNumeric: entry.pinyin,
      pinyin: transformedPinyin,
      glosses: glossPair.cleaned,
      ...(transformedClassifiers.length === 0
        ? {}
        : { classifiers: transformedClassifiers }),
      ...(glossPair.senseTags.length === 0
        ? {}
        : { tags: glossPair.senseTags }),
    };
  });
}

function getTagNameForMarker(marker: string): string | null {
  const trimmed = marker.trim();
  for (const { tag, re } of cedictSenseTagLookup) {
    if (re.test(trimmed)) {
      return tag;
    }
  }
  return null;
}

/**
 * Detects registered tag markers at the start or end of a gloss.
 * Returns the semantic tag names (in text order) and the cleaned gloss with
 * markers removed. Returns null when no tags are found.
 */
function extractSenseTagsFromGloss(
  gloss: string,
): { tags: string[]; cleanedGloss: string } | null {
  const tags: string[] = [];
  let cleaned = gloss;

  const startMatch = cleaned.match(cedictSenseTagAtStartRe);
  if (startMatch != null) {
    const tag = getTagNameForMarker(startMatch[0]);
    if (tag != null) {
      tags.push(tag);
      cleaned = cleaned.slice(startMatch[0].length).trim();
    }
  }

  const endMatch = cleaned.match(cedictSenseTagAtEndRe);
  if (endMatch != null) {
    const tag = getTagNameForMarker(endMatch[0]);
    if (tag != null) {
      tags.push(tag);
      cleaned = cleaned.slice(0, cleaned.length - endMatch[0].length).trim();
    }
  }

  return tags.length === 0 ? null : { tags, cleanedGloss: cleaned };
}

/**
 * Normalizes tag markers in a gloss for output in the .out file.
 * Collects all tag markers anywhere in the gloss (in text order), removes
 * them, and prepends them to the cleaned text.
 */
function normalizeTagsInGloss(gloss: string): string {
  const markers: string[] = [];
  const cleaned = gloss
    .replace(cedictSenseTagGlobalRe, (match) => {
      markers.push(match);
      return ``;
    })
    .replaceAll(/\s{2,}/gu, ` `)
    .trim();

  if (markers.length === 0) {
    return gloss;
  }

  return cleaned.length === 0
    ? markers.join(` `)
    : `${markers.join(` `)} ${cleaned}`;
}

function extractInlineClassifierAndCleanGloss(
  gloss: string,
): { cleanedGloss: string; classifiers: string[] } | null {
  const matches = [...gloss.matchAll(/\(\s*CL:\s*(?<refs>[^)]+)\)\s*/giu)];
  if (matches.length === 0) {
    return null;
  }

  const classifiers = matches.flatMap((match) =>
    parseCedictClassifierRefs(match.groups?.[`refs`]),
  );
  if (classifiers.length === 0) {
    return null;
  }

  const cleanedGloss = gloss
    .replaceAll(/\(\s*CL:\s*[^)]+\)\s*/giu, ` `)
    .replaceAll(/\s+/gu, ` `)
    .replaceAll(/\s+([,.;:!?])/gu, `$1`)
    .trim();

  return {
    cleanedGloss,
    classifiers,
  };
}

function extractClassifierSenseRefs(sense: string): string[] | null {
  const directMatch = sense.match(/^\s*CL:\s*(?<refs>.+?)\s*$/iu);
  if (directMatch != null) {
    const refs = parseCedictClassifierRefs(directMatch.groups?.[`refs`]);
    if (refs.length > 0) {
      return refs;
    }
  }

  const wrappedMatch = sense.match(/^\s*\(\s*CL:\s*(?<refs>[^)]+)\s*\)\s*$/iu);
  if (wrappedMatch == null) {
    return null;
  }

  const refs = parseCedictClassifierRefs(wrappedMatch.groups?.[`refs`]);
  return refs.length === 0 ? null : refs;
}

function parseCedictClassifierRefs(rawRefs: string | undefined): string[] {
  if (rawRefs == null) {
    return [];
  }

  return rawRefs
    .split(`,`)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .filter((item) => {
      const match = item.match(/^(?<word>[^,\s]+?)\[(?<pinyin>[^\]]+)\]$/u);
      if (match == null) {
        return false;
      }

      const word = match.groups?.[`word`];
      if (word == null || word.length === 0) {
        return false;
      }

      return word.split(`|`).every((part) => part.length > 0);
    });
}

function extractInlineAlsoPronunciationAndCleanGloss(
  gloss: string,
): { cleanedGloss: string; alternativePinyin: string[] } | null {
  // Match inline patterns like "(also pr. [wai4 mian5] for this sense)"
  // This captures one or more "[pinyinNumeric]" blocks within parentheses with "also pr."
  const match = gloss.match(
    /\s*\((?:[^[\]]*?\s+)?(?:also|alternatively)\s+pr\.(?:\s+[^[\]]*)?(?:\s*\[[^\]]+\])+[^)]*\)\s*/iu,
  );
  if (match == null) {
    return null;
  }

  const inlinePattern = match[0];
  const bracketMatches = [
    ...inlinePattern.matchAll(/\[(?<pinyinNumeric>[^\]]+)\]/gu),
  ];
  if (bracketMatches.length === 0) {
    return null;
  }

  const alternativePinyin = bracketMatches
    .map((item) => item.groups?.[`pinyinNumeric`]?.trim())
    .filter((item): item is string => item != null && item.length > 0);

  if (alternativePinyin.length === 0) {
    return null;
  }

  const cleanedGloss = gloss.replace(inlinePattern, ``).trim();

  // Only return if we actually removed something and have content left
  if (cleanedGloss.length === 0) {
    return null; // It was a standalone pattern, not inline
  }

  return {
    cleanedGloss,
    alternativePinyin,
  };
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
      edits: options.edits,
    });

    return parsedLine == null ? [] : [parsedLine];
  });
}

export const loadCedictV2 = memoize0(async (): Promise<CedictV2EntryType[]> => {
  const filename = `cedict_ts-2.u8`;

  const dataText = await readFile(
    path.join(import.meta.dirname, filename),
    `utf8`,
  );

  const editsText = await readFile(
    path.join(import.meta.dirname, `${filename}.edits`),
    `utf8`,
  );

  const edits = parseCedictV2EditsText(editsText);

  const outputText = applyCedictV2EditsToText(dataText, {
    strict: true,
    edits,
  });
  await writeUtf8FileIfChanged(
    path.join(import.meta.dirname, `${filename}.out`),
    outputText,
  );

  return parseCedictV2Text(outputText, { strict: true });
});

export async function findCedictEntryById(
  cedictId: string,
): Promise<CedictV2EntryType | null> {
  if (cedictId.length === 0) {
    return null;
  }

  const indexes = await getCedictLookupIndexes();

  const cedictIdParams = parseCedictId(cedictId);
  if (cedictIdParams == null) {
    return null;
  }

  const candidates = findCedictEntryCandidatesByParams(indexes, cedictIdParams);

  if (candidates.length === 1) {
    return candidates[0] ?? null;
  }

  const matchedCandidates = candidates.filter((entry) =>
    transformCedictV2Entry(entry).some((sense) => sense.senseId === cedictId),
  );

  if (matchedCandidates.length > 0) {
    return matchedCandidates.at(-1) ?? null;
  }

  return null;
}

export async function findCedictSenseById(
  cedictSenseId: string,
): Promise<TransformedCedictV2SenseType | null> {
  if (cedictSenseId.length === 0) {
    return null;
  }

  const cedictIdParams = parseCedictId(cedictSenseId);
  if (cedictIdParams == null) {
    return null;
  }

  const indexes = await getCedictLookupIndexes();
  const candidates = findCedictEntryCandidatesByParams(indexes, cedictIdParams);

  let resolvedSense: TransformedCedictV2SenseType | null = null;
  for (const entry of candidates) {
    const matchedSense = transformCedictV2Entry(entry).find(
      (sense) => sense.senseId === cedictSenseId,
    );
    if (matchedSense == null) {
      continue;
    }

    resolvedSense = matchedSense;
  }

  return resolvedSense;
}

export async function findCedictSenseIdCandidatesById(
  cedictSenseId: string,
): Promise<string[]> {
  if (cedictSenseId.length === 0) {
    return [];
  }

  const cedictIdParams = parseCedictId(cedictSenseId);
  if (cedictIdParams == null) {
    return [];
  }

  const indexes = await getCedictLookupIndexes();
  const candidates = findCedictEntryCandidatesByParams(indexes, cedictIdParams);

  return candidates.flatMap((entry) =>
    transformCedictV2Entry(entry).map((sense) => sense.senseId),
  );
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

  const entriesByTraditional = new Map<string, CedictV2EntryType[]>();

  for (const entry of entries) {
    mapArrayAdd(entriesByTraditional, entry.traditional, entry);
  }

  return {
    entriesByTraditional,
  };
});

function findCedictEntryCandidatesByParams(
  indexes: { entriesByTraditional: Map<string, CedictV2EntryType[]> },
  cedictIdParams: CedictIdParamsType,
): CedictV2EntryType[] {
  const candidates =
    indexes.entriesByTraditional.get(cedictIdParams.traditional) ?? [];

  return candidates.filter(
    (entry) =>
      entry.simplified === cedictIdParams.simplified &&
      entry.pinyin === cedictIdParams.pinyin,
  );
}

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

function buildCedictV2EditEntryKey(
  traditional: string,
  simplified: string,
  pinyin: string,
): string {
  return `${traditional.normalize(`NFKC`)}|${simplified.normalize(`NFKC`)}|${pinyin.normalize(`NFKC`)}`;
}

function parseCedictV2EditHeader(
  line: string,
  lineNumber: number,
): { traditional: string; simplified: string; pinyin: PinyinNumericText } {
  const match = line.match(/^(\S+)\s+(\S+)\s+\[\[(.+?)\]\]$/u);
  if (match == null) {
    throw new Error(
      formatCedictEditsParseError(`invalid edits header line`, lineNumber),
    );
  }

  const traditional = match[1];
  const simplified = match[2];
  const pinyin = match[3];
  if (traditional == null || simplified == null || pinyin == null) {
    throw new Error(
      formatCedictEditsParseError(`invalid edits header line`, lineNumber),
    );
  }

  return {
    traditional,
    simplified,
    pinyin: pinyin as PinyinNumericText,
  };
}

function parseCedictV2EditRule(
  line: string,
  lineNumber: number,
): CedictV2EditRuleType {
  const match = line.match(
    /^\/(?<oldSense>[^/]*)\/\s+(?<replacement>\/\/|\/.*\/)$/u,
  );
  if (match == null) {
    throw new Error(
      formatCedictEditsParseError(`invalid edits rule line`, lineNumber),
    );
  }

  const oldSense = match.groups?.[`oldSense`]?.trim();
  const replacement = match.groups?.[`replacement`];
  if (oldSense == null || replacement == null || oldSense.length === 0) {
    throw new Error(
      formatCedictEditsParseError(`invalid edits rule line`, lineNumber),
    );
  }

  if (replacement === `//`) {
    return {
      oldSense,
      newSense: ``,
    };
  }

  const replacementContent = replacement.slice(1, -1).trim();
  return {
    oldSense,
    newSense: replacementContent,
  };
}

function applyCedictEntryEdits(
  senses: string[],
  entryEdits: CedictV2EntryEditsType,
  options: ParseCedictV2LineOptionsType,
): string[] {
  const nextSenses = [...senses];

  for (const rule of entryEdits.rules) {
    const matchIndexes = nextSenses
      .map((sense, index) => (sense === rule.oldSense ? index : -1))
      .filter((index) => index >= 0);

    if (matchIndexes.length === 0) {
      if (options.strict ?? true) {
        throw new Error(
          formatParseError(
            `edits rule did not match sense: ${rule.oldSense}`,
            options,
          ),
        );
      }

      continue;
    }

    if (matchIndexes.length > 1) {
      throw new Error(
        formatParseError(
          `edits rule matched multiple senses: ${rule.oldSense}`,
          options,
        ),
      );
    }

    const [matchIndex] = matchIndexes;
    if (matchIndex == null) {
      continue;
    }

    if (rule.newSense.length === 0) {
      nextSenses.splice(matchIndex, 1);
      continue;
    }

    const replacementSenses = rule.newSense
      .split(`/`)
      .map((sense) => sense.trim())
      .filter((sense) => sense.length > 0);

    if (replacementSenses.length === 0) {
      nextSenses.splice(matchIndex, 1);
      continue;
    }

    nextSenses.splice(matchIndex, 1, ...replacementSenses);
  }

  return nextSenses;
}

function formatCedictEditsParseError(
  message: string,
  lineNumber: number,
): string {
  return `${message} (line ${lineNumber})`;
}
