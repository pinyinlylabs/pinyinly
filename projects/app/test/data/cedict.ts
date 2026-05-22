import type { HanziText, PinyinNumericText, PinyinText } from "#data/model.js";
import { normalizePinyinText } from "#data/pinyin.ts";
import { regExpEscape } from "#util/regExp.js";
import {
  arrayFilterUnique,
  mapArrayAdd,
  memoize0,
} from "@pinyinly/lib/collections";
import { readFile, writeUtf8FileIfChanged } from "@pinyinly/lib/fs";
import { invariant } from "@pinyinly/lib/invariant";
import path from "node:path";

// download from https://cc-cedict.org/editor/editor.php?handler=Download

export interface CedictIdParamsType {
  traditional: string;
  simplified: string;
  pinyin: PinyinNumericText;
  sense: string;
}

export interface CedictV2EntryType {
  traditional: string;
  simplified: string;
  pinyin: PinyinNumericText;
  senses: string[];
}

export interface TransformedCedictV2SenseType {
  senseId: string;
  traditional: string;
  simplified: string;
  pinyinNumeric: PinyinNumericText;
  pinyin: PinyinText[];
  glosses: string[];
  classifiers?: string[];
  labels?: string[];
}

export interface CedictSenseCandidateType {
  senseId: string;
  confidence: number;
}

export interface ParseCedictV2LineOptionsType {
  lineNumber?: number;
  strict?: boolean;
  edits?: CedictV2EditsType;
}

export type CedictV2EditRuleKind = `replace` | `merge` | `add`;

export interface CedictV2ReplaceEditRuleType {
  kind: `replace`;
  oldSense: string;
  newSense: string;
}

export interface CedictV2MergeEditRuleType {
  kind: `merge`;
  oldSenses: string[];
  mergedSense: string;
}

export interface CedictV2AddEditRuleType {
  kind: `add`;
  newSense: string;
}

export type CedictV2EditRuleType =
  | CedictV2ReplaceEditRuleType
  | CedictV2MergeEditRuleType
  | CedictV2AddEditRuleType;

export interface CedictV2EntryEditsType {
  traditional: string;
  simplified: string;
  pinyin: PinyinNumericText;
  rules: CedictV2EditRuleType[];
}

export interface CedictV2EditsType {
  entriesByKey: Map<string, CedictV2EntryEditsType>;
}

const CEDICT_V2_LINE_REGEXP = /^(\S+)\s+(\S+)\s+\[\[(.*?)\]\]\s+\/(.*)\/$/u;

const domainLabels = [
  `ACG`,
  `accounting`,
  `acoustics`,
  `acrobatics`,
  `aerospace`,
  `agriculture`,
  `anatomy`,
  `angling`,
  `animals`,
  `archaeology`,
  `archeology`,
  `archery`,
  `architecture`,
  `astronautics`,
  `astronomy`,
  `athletics`,
  `automotive`,
  `aviation`,
  `ballet`,
  `banking`,
  `baseball`,
  `basketball`,
  `basketwork`,
  `BDSM`,
  `beer`,
  `biochemistry`,
  `biogeography`,
  `biology`,
  `biotechnology`,
  `bird`,
  `botany`,
  `boxing`,
  `brand`,
  `broadcasting`,
  `Buddhism`,
  `Buddhist`,
  `business`,
  `calligraphy`,
  `Cant.`,
  `Cantonese`,
  `cartography`,
  `Catholicism`,
  `chemical`,
  `chemistry`,
  `Chinese`,
  `Christianity`,
  `cinema`,
  `cinematography`,
  `commerce`,
  `communications`,
  `computer`,
  `computing`,
  `Confucianism`,
  `constellation`,
  `cookery`,
  `cooking`,
  `cosmetics`,
  `cryptography`,
  `cuisine`,
  `currency`,
  `Daoism`,
  `dating`,
  `deferential`,
  `dentistry`,
  `dinosaur`,
  `divination`,
  `diving`,
  `ecology`,
  `economics`,
  `education`,
  `electricity`,
  `electromagnetism`,
  `electronics`,
  `embryology`,
  `engineering`,
  `entomology`,
  `epidemiology`,
  `expletive`,
  `fandom`,
  `fashion`,
  `fencing`,
  `filmmaking`,
  `finance`,
  `fitness`,
  `flying`,
  `food`,
  `football`,
  `forestry`,
  `gaming`,
  `genetic`,
  `genetics`,
  `geography`,
  `geology`,
  `geometry`,
  `geopolitics`,
  `geotectonics`,
  `golf`,
  `government`,
  `grammar`,
  `gymnastics`,
  `hairstyle`,
  `historical`,
  `HK`,
  `Hong Kong`,
  `horticulture`,
  `humor`,
  `humorous`,
  `hydrology`,
  `ichthyology`,
  `immunology`,
  `information`,
  `Internet slang`,
  `Islam`,
  `Japan`,
  `journalism`,
  `law`,
  `lexicography`,
  `linguistics`,
  `logistics`,
  `mahjong`,
  `Malaysia`,
  `mammology`,
  `manufacturing`,
  `Maoism`,
  `marketing`,
  `math`,
  `math.`,
  `mathematical`,
  `measurement`,
  `mechanics`,
  `med`,
  `med.`,
  `medical`,
  `medicine`,
  `metallurgy`,
  `metalwork`,
  `meteorology`,
  `microbiology`,
  `military`,
  `mineralogy`,
  `mining`,
  `Mohism`,
  `music`,
  `mycology`,
  `mythology`,
  `neologism`,
  `neuroscience`,
  `obstetrics`,
  `oceanography`,
  `opera`,
  `optics`,
  `ornithology`,
  `orthodontics`,
  `orthography`,
  `painting`,
  `perfumery`,
  `petrochemistry`,
  `pharm.`,
  `pharmacology`,
  `philately`,
  `philosophy`,
  `phonetic`,
  `phonetics`,
  `phonology`,
  `photography`,
  `physics`,
  `physiognomy`,
  `physiology`,
  `political`,
  `politically`,
  `politics`,
  `PRC`,
  `printing`,
  `psychological`,
  `psychology`,
  `publishing`,
  `radiography`,
  `religion`,
  `religious`,
  `retail`,
  `retailer`,
  `retailing`,
  `rocketry`,
  `science`,
  `seafood`,
  `seismology`,
  `semantics`,
  `Shanghainese`,
  `Shinto`,
  `Singapore`,
  `soccer`,
  `software`,
  `sports`,
  `sport`,
  `stationery`,
  `statistics`,
  `surname`,
  `surveying`,
  `Taiwan`,
  `Taoism`,
  `TCM`,
  `technology`,
  `telecommunications`,
  `telephony`,
  `textiles`,
  `theater`,
  `thermodynamics`,
  `time`,
  `transportation`,
  `Tw`,
  `typesetting`,
  `typography`,
  `vulgar`,
  `watchmaking`,
  `weaving`,
  `zoology`,
];

const genericLabels = [
  `abbr.`,
  `adj.`,
  `adjective`,
  `ancient`,
  `arch.`,
  `archaic`,
  `article`,
  `attributive`,
  `bound form`,
  `classical`,
  `classifier`,
  `coll.`,
  `colloquial`,
  `color`,
  `conjunction`,
  `contemporary`,
  `courteous`,
  `dated`,
  `derog.`,
  `derogatory`,
  `dialect`,
  `directional complement`,
  `disparaging`,
  `euphemism`,
  `fig.`,
  `figuratively`,
  `formal`,
  `grammatical`,
  `greeting`,
  `honorific`,
  `idiom`,
  `imperative`,
  `informal`,
  `insult`,
  `intensifier`,
  `interj`,
  `interj.`,
  `interjection`,
  `intransitive`,
  `jocular`,
  `jokingly`,
  `lit.`,
  `literary`,
  `loanword`,
  `maxim`,
  `metaphorical`,
  `metonym`,
  `modern`,
  `name`,
  `noun suffix`,
  `offensive`,
  `old`,
  `onom.`,
  `orig.`,
  `originally`,
  `pejorative`,
  `polite`,
  `prefix`,
  `pronoun`,
  `proverb`,
  `punctuation`,
  `rare`,
  `reduplicated`,
  `respectful`,
  `rhetorical`,
  `rude`,
  `saying`,
  `slang`,
  `specifier`,
  `suffix`,
  `technical`,
  `verb`,
];

const labelAliases: Record<string, string> = {
  [`adj.`]: `adjective`,
  [`arch.`]: `archaic`,
  [`Cant.`]: `Cantonese`,
  [`derog.`]: `derogatory`,
  [`humorous`]: `humor`,
  [`Hong Kong`]: `HK`,
  [`math`]: `math.`,
  [`mathematical`]: `math.`,
  [`med`]: `medical`,
  [`med.`]: `medical`,
  [`medicine`]: `medical`,
  [`originally`]: `orig.`,
  [`pharm.`]: `pharmacology`,
  [`political`]: `politics`,
  [`politically`]: `politics`,
  [`religious`]: `religion`,
  [`sports`]: `sport`,
  [`interj`]: `interj.`,
  [`interjection`]: `interj.`,
  [`literary`]: `lit.`,
  [`colloquial`]: `coll.`,
  [`figuratively`]: `fig.`,
};

const genericAbbrLabels = genericLabels.filter((t) => t.endsWith(`.`));

const labelPatterns =
  `(?:` +
  // domains in parentheses, e.g. "(sports)"
  `\\((?<domain>${domainLabels.map((d) => regExpEscape(d)).join(`|`)})\\)|` +
  // labels in parentheses, e.g. "(sports)", "(coll.)", "(idiom)"
  `\\((?<label>${genericLabels.map((t) => regExpEscape(t)).join(`|`)})\\)|` +
  // abbr labels, e.g. onom., coll., fig.
  `(?<label>${genericAbbrLabels.map((t) => regExpEscape(t)).join(`|`)})` +
  `)`;

const labelsAtStartRe = new RegExp(`^(?:${labelPatterns})\\s*`, `u`);
const labelsAtEndRe = new RegExp(`\\s*(?:${labelPatterns})$`, `u`);

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

export function parseCedictV2EditsText(text: string): CedictV2EditsType {
  const lines = text.split(/\r?\n/u);
  const entriesByKey = new Map<string, CedictV2EntryEditsType>();
  let i = 0;

  while (i < lines.length) {
    const currentLine = lines[i];
    const lineNumber = i + 1;
    const trimmed = currentLine?.trim() ?? ``;

    if (trimmed.length === 0 || trimmed.startsWith(`#`)) {
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

      if (ruleTrimmed.startsWith(`#`)) {
        i += 1;
        continue;
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

const loadCedictV2Edits = memoize0(async (): Promise<CedictV2EditsType> => {
  const filename = `cedict_ts-2.u8`;
  const editsText = await readFile(
    path.join(import.meta.dirname, `${filename}.edits`),
    `utf8`,
  );

  return parseCedictV2EditsText(editsText);
});

export async function findCedictMigratedSenseId(
  senseId: string,
): Promise<string | null> {
  if (senseId.length === 0) {
    return null;
  }

  const cedictIdParams = parseCedictSenseId(senseId);
  if (cedictIdParams == null) {
    return null;
  }

  const parsedSenseId = parseCedictV2Line(senseId);
  if (parsedSenseId == null) {
    return null;
  }

  const originalGlosses = parseCedictV2Sense(cedictIdParams.sense)
    .glosses.map((gloss) => normalizeGlossForComparison(gloss.cleanedGloss))
    .filter((gloss) => gloss.length > 0)
    .filter(arrayFilterUnique());
  if (originalGlosses.length === 0) {
    return null;
  }

  const originalGlossesSet = new Set(originalGlosses);

  const indexes = await getCedictLookupIndexes();
  const entries = findCedictEntryCandidatesByParams(indexes, cedictIdParams);
  const migratedSenseCandidates: string[] = [];

  for (const entry of entries) {
    for (const candidateSense of transformCedictV2Entry(entry)) {
      if (!new Set(candidateSense.glosses).isSupersetOf(originalGlossesSet)) {
        continue;
      }

      migratedSenseCandidates.push(candidateSense.senseId);
    }
  }

  if (migratedSenseCandidates.length !== 1) {
    return null;
  }

  return migratedSenseCandidates[0]!;
}

export function applyCedictV2EditsToText(
  text: string,
  options: ParseCedictV2LineOptionsType = {},
): string {
  const strict = options.strict ?? true;
  const matchedEntryKeys = new Set<string>();

  const outputLines = text.split(/\r?\n/u).map((line, i) => {
    const lineNumber = i + 1;
    const parsedLine = parseCedictV2Line(line, {
      strict,
      lineNumber,
      edits: options.edits,
    });

    if (parsedLine == null) {
      return line;
    }

    const key = buildCedictV2EditEntryKey(
      parsedLine.traditional,
      parsedLine.simplified,
      parsedLine.pinyin,
    );
    if (options.edits?.entriesByKey.has(key) === true) {
      matchedEntryKeys.add(key);
    }

    return serializeCedictV2Entry(parsedLine);
  });

  for (const [key, entryEdits] of options.edits?.entriesByKey ?? []) {
    if (matchedEntryKeys.has(key)) {
      continue;
    }

    const createdSenses = applyCedictEntryEdits([], entryEdits, options);
    if (createdSenses.length === 0) {
      continue;
    }

    outputLines.push(
      serializeCedictV2Entry({
        traditional: entryEdits.traditional,
        simplified: entryEdits.simplified,
        pinyin: entryEdits.pinyin,
        senses: createdSenses,
      }),
    );
  }

  return outputLines.join(`\n`);
}

function serializeCedictV2Entry(entry: CedictV2EntryType): string {
  const senses = entry.senses
    .map((sense) => serializeCedictV2Sense(parseCedictV2Sense(sense)))
    .filter((sense): sense is string => sense != null && sense.length > 0);

  return `${entry.traditional} ${entry.simplified} [[${entry.pinyin}]] /${senses.join(`/`)}/`;
}

interface ParsedCedictSenseGlossType {
  originalGloss: string;
  cleanedGloss: string;
}

interface ParsedCedictSenseType {
  labels: string[];
  glosses: ParsedCedictSenseGlossType[];
  inlineClassifiers: string[];
  inlineAlternativePinyin: string[];
  standaloneClassifiers: string[];
}

export function parseCedictV2Sense(
  sense: CedictV2EntryType[`senses`][number],
): ParsedCedictSenseType {
  const labels: string[] = [];
  const glosses: ParsedCedictSenseGlossType[] = [];
  const inlineClassifiers: string[] = [];
  const inlineAlternativePinyin: string[] = [];
  const standaloneClassifiers: string[] = [];

  for (const gloss of sense
    .split(`;`)
    .map((gloss) => gloss.trim())
    .filter((gloss) => gloss.length > 0)) {
    let cleanedGloss = gloss;

    const labelExtraction = extractSenseLabelsFromGloss(cleanedGloss);
    if (labelExtraction != null) {
      for (const label of labelExtraction.labels) {
        if (!labels.includes(label)) {
          labels.push(label);
        }
      }
      cleanedGloss = labelExtraction.cleanedGloss;
    }

    const inlineClassifierExtraction =
      extractInlineClassifierAndCleanGloss(cleanedGloss);
    if (inlineClassifierExtraction != null) {
      for (const classifier of inlineClassifierExtraction.classifiers) {
        if (!inlineClassifiers.includes(classifier)) {
          inlineClassifiers.push(classifier);
        }
      }
      cleanedGloss = inlineClassifierExtraction.cleanedGloss;
    }

    const inlineAlternativePinyinExtraction =
      extractInlineAlsoPronunciationAndCleanGloss(cleanedGloss);
    if (inlineAlternativePinyinExtraction != null) {
      for (const alternative of inlineAlternativePinyinExtraction.alternativePinyin) {
        if (!inlineAlternativePinyin.includes(alternative)) {
          inlineAlternativePinyin.push(alternative);
        }
      }
      cleanedGloss = inlineAlternativePinyinExtraction.cleanedGloss;
    }

    const classifiersForGloss = extractClassifierSenseRefs(cleanedGloss);
    if (classifiersForGloss != null) {
      for (const classifier of classifiersForGloss) {
        if (!standaloneClassifiers.includes(classifier)) {
          standaloneClassifiers.push(classifier);
        }
      }
      continue;
    }

    if (cleanedGloss.length === 0) {
      continue;
    }

    glosses.push({
      originalGloss: gloss,
      cleanedGloss,
    });
  }

  return {
    labels: labels,
    glosses,
    inlineClassifiers,
    inlineAlternativePinyin,
    standaloneClassifiers,
  };
}

export function serializeCedictV2Sense(
  parsedSense: ParsedCedictSenseType,
): string | null {
  const labelsPrefix = parsedSense.labels
    .map((label) => `{${label}}`)
    .join(` `);

  if (parsedSense.glosses.length === 0) {
    return labelsPrefix.length === 0 ? null : labelsPrefix;
  }

  const serializedGlosses = parsedSense.glosses.map((x) => x.cleanedGloss);
  if (labelsPrefix.length > 0) {
    const firstGloss = serializedGlosses[0];
    if (firstGloss != null) {
      serializedGlosses[0] = `${labelsPrefix} ${firstGloss}`;
    }
  }

  return serializedGlosses.join(`; `);
}

export function transformCedictV2Entry(
  entry: CedictV2EntryType,
): TransformedCedictV2SenseType[] {
  const standaloneAlternativePinyin = new Set<string>();
  const standaloneClassifiers = new Set<string>();

  const transformedSenses = entry.senses.flatMap((sense) => {
    const parsedSense = parseCedictV2Sense(sense);
    for (const classifier of parsedSense.standaloneClassifiers) {
      standaloneClassifiers.add(classifier);
    }
    const inlineAlternativePinyin = new Set<string>(
      parsedSense.inlineAlternativePinyin,
    );
    const inlineClassifiers = new Set<string>(parsedSense.inlineClassifiers);
    const senseTags: string[] = [...parsedSense.labels];
    const originalGlosses: string[] = [];
    const cleanedGlosses: string[] = [];

    for (const parsedGloss of parsedSense.glosses) {
      const cleanedGloss = parsedGloss.cleanedGloss;

      if (cleanedGloss.length === 0) {
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

      originalGlosses.push(parsedGloss.originalGloss);
      cleanedGlosses.push(cleanedGloss);
    }

    if (cleanedGlosses.length === 0) {
      return [];
    }

    return [
      {
        sense,
        original: originalGlosses,
        cleaned: cleanedGlosses,
        inlineAlternativePinyin: [...inlineAlternativePinyin],
        inlineClassifiers: [...inlineClassifiers],
        senseLabels: senseTags,
      },
    ];
  });

  return transformedSenses.map((transformedSense) => {
    const transformedPinyin = [
      normalizePinyinText(entry.pinyin),
      ...[...standaloneAlternativePinyin].map((alternative) =>
        normalizePinyinText(alternative),
      ),
      ...transformedSense.inlineAlternativePinyin.map((alternative) =>
        normalizePinyinText(alternative),
      ),
    ].filter(arrayFilterUnique());

    const transformedClassifiers = [
      ...standaloneClassifiers,
      ...transformedSense.inlineClassifiers,
    ].filter(arrayFilterUnique());

    return {
      senseId: buildCedictSenseId(
        entry.traditional,
        entry.simplified,
        entry.pinyin,
        transformedSense.sense,
      ),
      traditional: entry.traditional,
      simplified: entry.simplified,
      pinyinNumeric: entry.pinyin,
      pinyin: transformedPinyin,
      glosses: transformedSense.cleaned,
      ...(transformedClassifiers.length === 0
        ? {}
        : { classifiers: transformedClassifiers }),
      ...(transformedSense.senseLabels.length === 0
        ? {}
        : { labels: transformedSense.senseLabels }),
    };
  });
}

/**
 * Detects registered labels at the start or end of a gloss. Returns the
 * semantic labels (in text order) and the cleaned gloss with markers removed.
 * Returns null when no labels are found.
 */
function extractSenseLabelsFromGloss(
  gloss: string,
): { labels: string[]; cleanedGloss: string } | null {
  const labels: string[] = [];
  let cleaned = gloss;

  for (;;) {
    const startMatch = cleaned.match(labelsAtStartRe);
    if (startMatch == null) {
      break;
    }

    let label;

    if (startMatch.groups?.[`label`] != null) {
      label = startMatch.groups[`label`];
      label = labelAliases[label] ?? label;
    }

    if (startMatch.groups?.[`domain`] != null) {
      label = startMatch.groups[`domain`];
      label = labelAliases[label] ?? label;
      label = `D:${label}`;
    }

    invariant(
      label != null,
      `label was null, startMatch = '%s', cleaned = '%s'`,
      startMatch,
      cleaned,
    );

    if (!labels.includes(label)) {
      labels.push(label);
    }

    cleaned = cleaned.slice(startMatch[0].length).trim();
  }

  for (;;) {
    const endMatch = cleaned.match(labelsAtEndRe);
    if (endMatch == null) {
      break;
    }
    let label;
    if (endMatch.groups?.[`label`] != null) {
      label = endMatch.groups[`label`];
      label = labelAliases[label] ?? label;
    }

    if (endMatch.groups?.[`domain`] != null) {
      label = endMatch.groups[`domain`];
      label = labelAliases[label] ?? label;
      label = `D:${label}`;
    }

    invariant(
      label != null,
      `label was null, endMatch = '%s', cleaned = '%s'`,
      endMatch,
      cleaned,
    );

    if (!labels.includes(label)) {
      labels.push(label);
    }

    cleaned = cleaned.slice(0, cleaned.length - endMatch[0].length).trim();
  }

  return labels.length === 0 ? null : { labels: labels, cleanedGloss: cleaned };
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

  const edits = await loadCedictV2Edits();

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

  const cedictIdParams = parseCedictSenseId(cedictId);
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

  const cedictIdParams = parseCedictSenseId(cedictSenseId);
  if (cedictIdParams == null) {
    return null;
  }

  const indexes = await getCedictLookupIndexes();
  const candidates = findCedictEntryCandidatesByParams(indexes, cedictIdParams);

  for (const entry of candidates) {
    const matchedSense = transformCedictV2Entry(entry).find(
      (sense) => sense.senseId === cedictSenseId,
    );
    if (matchedSense != null) {
      return matchedSense;
    }
  }

  return null;
}

export async function findCedictSenseIdCandidatesById(
  cedictSenseId: string,
): Promise<string[]> {
  if (cedictSenseId.length === 0) {
    return [];
  }

  const cedictIdParams = parseCedictSenseId(cedictSenseId);
  if (cedictIdParams == null) {
    return [];
  }

  const indexes = await getCedictLookupIndexes();
  const candidates = findCedictEntryCandidatesByParams(indexes, cedictIdParams);

  return candidates.flatMap((entry) =>
    transformCedictV2Entry(entry).map((sense) => sense.senseId),
  );
}

export async function findCedictSensesForHanziWordMeaning(
  hanzi: HanziText,
  pinyin: readonly PinyinText[] | null | undefined,
  glosses: readonly string[],
  opts?: { indexes?: Awaited<ReturnType<typeof getCedictLookupIndexes>> },
): Promise<CedictSenseCandidateType[]> {
  const normalizedHanzi = hanzi.normalize(`NFKC`);
  if (normalizedHanzi.length === 0) {
    return [];
  }

  const indexes = opts?.indexes ?? (await getCedictLookupIndexes());
  const candidates = new Map<string, CedictV2EntryType>();

  for (const entry of indexes.entriesBySimplified.get(normalizedHanzi) ?? []) {
    candidates.set(
      buildCedictV2EditEntryKey(
        entry.traditional,
        entry.simplified,
        entry.pinyin,
      ),
      entry,
    );
  }

  if (candidates.size === 0) {
    return [];
  }

  const normalizedInputPinyin = (pinyin ?? [])
    .map((x) => normalizePinyinText(x))
    .filter(arrayFilterUnique());
  const primaryInputPinyin = normalizedInputPinyin[0] ?? null;
  const inputPinyinSet = new Set(normalizedInputPinyin);

  const normalizedInputGlosses = glosses
    .map((x) => normalizeGlossForComparison(x))
    .filter((x) => x.length > 0)
    .filter(arrayFilterUnique());
  const primaryInputGloss = normalizedInputGlosses[0] ?? null;
  const inputGlossSet = new Set(normalizedInputGlosses);

  const scoredCandidates: CedictSenseCandidateType[] = [];

  for (const entry of candidates.values()) {
    for (const sense of transformCedictV2Entry(entry)) {
      const normalizedSenseGlosses = sense.glosses
        .map((x) => normalizeGlossForComparison(x))
        .filter((x) => x.length > 0)
        .filter(arrayFilterUnique());

      const normalizedSensePinyin = sense.pinyin
        .map((x) => normalizePinyinText(x))
        .filter(arrayFilterUnique());
      const primarySensePinyin = normalizedSensePinyin[0] ?? null;

      let confidence = 0;

      if (
        sense.simplified.normalize(`NFKC`) === normalizedHanzi ||
        sense.traditional.normalize(`NFKC`) === normalizedHanzi
      ) {
        confidence += 0.2;
      }

      if (primaryInputPinyin != null && primarySensePinyin != null) {
        if (primaryInputPinyin === primarySensePinyin) {
          confidence += 0.3;
        } else if (normalizedSensePinyin.some((x) => inputPinyinSet.has(x))) {
          confidence += 0.2;
        }
      } else if (
        normalizedInputPinyin.length > 0 &&
        normalizedSensePinyin.some((x) => inputPinyinSet.has(x))
      ) {
        confidence += 0.2;
      }

      if (primaryInputGloss != null) {
        if (normalizedSenseGlosses.includes(primaryInputGloss)) {
          confidence += 0.2;
        } else if (normalizedSenseGlosses.some((x) => inputGlossSet.has(x))) {
          confidence += 0.1;
        }
      }

      const glossSimilarity = computeGlossesSimilarity(
        normalizedInputGlosses,
        normalizedSenseGlosses,
      );
      confidence += glossSimilarity * 0.3;

      scoredCandidates.push({
        senseId: sense.senseId,
        confidence: clampConfidence(confidence),
      });
    }
  }

  return scoredCandidates.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }

    return a.senseId.localeCompare(b.senseId);
  });
}

export function buildCedictSenseId(
  traditional: string,
  simplified: string,
  pinyinNumeric: string,
  sense: string,
): string {
  const traditionalNormalized = traditional.normalize(`NFKC`);
  const simplifiedNormalized = simplified.normalize(`NFKC`);
  const pinyinNumericNormalized = pinyinNumeric.normalize(`NFKC`);

  invariant(
    pinyinNumericNormalized.includes(`|`) === false,
    `pinyin ${pinyinNumericNormalized} cannot contain | character`,
  );

  return `${traditionalNormalized} ${simplifiedNormalized} [[${pinyinNumericNormalized}]] /${sense}/`;
}

const getCedictLookupIndexes = memoize0(async () => {
  const entries = await loadCedictV2();

  const entriesBySimplified = new Map<string, CedictV2EntryType[]>();

  for (const entry of entries) {
    mapArrayAdd(entriesBySimplified, entry.simplified, entry);
  }

  return {
    entriesBySimplified,
  };
});

function normalizeGlossForComparison(gloss: string): string {
  return gloss.toLowerCase().replaceAll(/\s+/gu, ` `).trim();
}

export function computeGlossesSimilarity(
  glosses1: string[],
  glosses2: string[],
): number {
  const normalized1 = glosses1
    .map((x) => normalizeGlossForComparison(x))
    .filter((x) => x.length > 0)
    .filter(arrayFilterUnique());
  const normalized2 = glosses2
    .map((x) => normalizeGlossForComparison(x))
    .filter((x) => x.length > 0)
    .filter(arrayFilterUnique());

  if (normalized1.length === 0 && normalized2.length === 0) {
    return 1;
  }

  if (normalized1.length === 0 || normalized2.length === 0) {
    return 0;
  }

  const glossSet1 = new Set(normalized1);
  const glossSet2 = new Set(normalized2);

  const exactOverlapCount = [...glossSet1].filter((x) =>
    glossSet2.has(x),
  ).length;
  const exactUnionCount = new Set([...glossSet1, ...glossSet2]).size;
  const exactGlossScore =
    exactUnionCount === 0 ? 0 : exactOverlapCount / exactUnionCount;

  const tokenSet1 = new Set(
    normalized1.flatMap((x) => [...tokenizeGlossForComparison(x)]),
  );
  const tokenSet2 = new Set(
    normalized2.flatMap((x) => [...tokenizeGlossForComparison(x)]),
  );
  const tokenScore = tokenOverlapRatio(tokenSet1, tokenSet2);

  const weightedScore = exactGlossScore * 0.6 + tokenScore * 0.4;
  return clampConfidence(weightedScore);
}

function tokenizeGlossForComparison(gloss: string): Set<string> {
  return new Set(gloss.match(/[\p{L}\p{N}]+/gu) ?? []);
}

function tokenOverlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersectionCount = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersectionCount += 1;
    }
  }

  return intersectionCount / Math.max(a.size, b.size);
}

function clampConfidence(confidence: number): number {
  if (confidence <= 0) {
    return 0;
  }

  if (confidence >= 1) {
    return 1;
  }

  return Number(confidence.toFixed(4));
}

function findCedictEntryCandidatesByParams(
  indexes: { entriesBySimplified: Map<string, CedictV2EntryType[]> },
  cedictIdParams: Pick<CedictIdParamsType, `simplified`> &
    Partial<Pick<CedictIdParamsType, `traditional` | `pinyin`>>,
): CedictV2EntryType[] {
  const candidates =
    indexes.entriesBySimplified.get(cedictIdParams.simplified) ?? [];

  return candidates.filter((entry) => {
    if (
      cedictIdParams.traditional != null &&
      entry.traditional !== cedictIdParams.traditional
    ) {
      return false;
    }

    if (
      cedictIdParams.pinyin != null &&
      entry.pinyin !== cedictIdParams.pinyin
    ) {
      return false;
    }

    return true;
  });
}

export function parseCedictSenseId(
  cedictSenseId: string,
): CedictIdParamsType | null {
  const match = cedictSenseId.match(
    /^(?<traditional>.+?) (?<simplified>.+?) \[\[(?<pinyin>.*?)\]\] \/(?<sense>.+?)\/$/u,
  );
  if (match == null) {
    return null;
  }

  const traditional = match.groups?.[`traditional`];
  const simplified = match.groups?.[`simplified`];
  const pinyin = match.groups?.[`pinyin`];
  const sense = match.groups?.[`sense`];

  if (
    traditional == null ||
    traditional.length === 0 ||
    simplified == null ||
    simplified.length === 0 ||
    pinyin == null ||
    sense == null ||
    sense.length === 0
  ) {
    return null;
  }

  return {
    traditional,
    simplified,
    pinyin: pinyin as PinyinNumericText,
    sense,
  };
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
  const match = line.match(/^(\S+)\s+(\S+)\s+\[\[(.*?)\]\]$/u);
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
  const addMatch = line.match(/^\+\s*\/(?<newSense>[^/]*)\/$/u);
  if (addMatch != null) {
    const newSense = addMatch.groups?.[`newSense`]?.trim();
    if (newSense == null || newSense.length === 0) {
      throw new Error(
        formatCedictEditsParseError(`invalid edits rule line`, lineNumber),
      );
    }

    return {
      kind: `add`,
      newSense,
    };
  }

  if (line.includes(`+=`)) {
    const mergeSenseMatches = [...line.matchAll(/\/(?<sense>[^/]*)\//gu)];
    const mergeSeparators = line.replaceAll(/\/[^/]*\//gu, ``);

    if (
      mergeSenseMatches.length < 2 ||
      mergeSeparators.match(/^\s*(?:\+=\s*)+$/u) == null
    ) {
      throw new Error(
        formatCedictEditsParseError(`invalid edits rule line`, lineNumber),
      );
    }

    const oldSenses = mergeSenseMatches
      .map((item) => item.groups?.[`sense`]?.trim())
      .filter((sense): sense is string => sense != null && sense.length > 0);

    if (oldSenses.length !== mergeSenseMatches.length) {
      throw new Error(
        formatCedictEditsParseError(`invalid edits rule line`, lineNumber),
      );
    }

    return {
      kind: `merge`,
      oldSenses,
      mergedSense: oldSenses.join(`; `),
    };
  }

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
      kind: `replace`,
      oldSense,
      newSense: ``,
    };
  }

  const replacementContent = replacement.slice(1, -1).trim();
  return {
    kind: `replace`,
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
    if (rule.kind === `add`) {
      nextSenses.push(rule.newSense);
      continue;
    }

    if (rule.kind === `merge`) {
      const matchIndexes: number[] = [];
      let shouldSkipRule = false;

      for (const oldSense of rule.oldSenses) {
        const matchingIndexes = nextSenses
          .map((sense, index) => (sense === oldSense ? index : -1))
          .filter((index) => index >= 0);

        if (matchingIndexes.length === 0) {
          if (options.strict ?? true) {
            throw new Error(
              formatParseError(
                `edits rule did not match sense: ${oldSense}`,
                options,
              ),
            );
          }

          shouldSkipRule = true;
          break;
        }

        if (matchingIndexes.length > 1) {
          throw new Error(
            formatParseError(
              `edits rule matched multiple senses: ${oldSense}`,
              options,
            ),
          );
        }

        const [matchingIndex] = matchingIndexes;
        if (matchingIndex != null) {
          matchIndexes.push(matchingIndex);
        }
      }

      if (shouldSkipRule) {
        continue;
      }

      if (matchIndexes.length === 0) {
        continue;
      }

      const insertIndex = Math.min(...matchIndexes);
      const uniqueMatchIndexes = [...new Set(matchIndexes)].sort(
        (a, b) => b - a,
      );
      for (const index of uniqueMatchIndexes) {
        nextSenses.splice(index, 1);
      }

      nextSenses.splice(insertIndex, 0, rule.mergedSense);
      continue;
    }

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
