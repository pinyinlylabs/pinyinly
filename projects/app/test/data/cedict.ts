import { pinyinTextSchema } from "#data/model.js";
import type { PinyinNumericText, PinyinText } from "#data/model.js";
import { normalizePinyinText } from "#data/pinyin.ts";
import { nanoid } from "#util/nanoid.ts";
import { renderPromptTemplate } from "#util/prompts.js";
import { regExpEscape } from "#util/regExp.js";
import {
  arrayFilterUnique,
  memoize0,
  mergeSortComparators,
  sortComparatorString,
} from "@pinyinly/lib/collections";
import { readFile } from "@pinyinly/lib/fs";
import { invariant } from "@pinyinly/lib/invariant";
import path from "node:path";
import type { ZodString } from "zod/v4";
import { z } from "zod/v4";
import shuffle from "lodash/shuffle";
import type { ChatPrompt, ChatPromptMessage } from "#server/lib/ai.js";
import { requestOpenAiChatJson } from "#server/lib/ai.js";
import type { OpenAI } from "openai";
import { loadHsk2026 } from "./hsk";
import type { Hsk2026Type } from "./hsk";

export interface CedictSenseIdParamsType {
  traditional: string;
  simplified: string;
  pinyin: PinyinNumericText;
  id: string;
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
  variantOf?: string[];
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

export interface CedictV2SenseIdRuleType {
  id: string;
  sense: string;
  mergedIds: string[];
}

export interface CedictV2EntrySenseIdsType {
  traditional: string;
  simplified: string;
  pinyin: PinyinNumericText;
  rules: CedictV2SenseIdRuleType[];
}

export interface CedictV2SenseIdsType {
  entriesById: Map<string, CedictV2EntrySenseIdsType>;
}

export interface BuildCedictV2SenseIdsTextOptionsType {
  createId?: () => string;
}

export interface CedictV2SenseIdsTextStatsType {
  newIds: string[];
  mergedIds: string[];
  deletedIds: string[];
}

export interface BuildCedictV2SenseIdsTextResultType {
  text: string;
  stats: CedictV2SenseIdsTextStatsType;
}

export type CedictSenseSamplingRowType = [
  entryId: string,
  glosses: string,
  samples: string,
];

export interface CedictSenseSamplingEntryType {
  /**
   * CE-DICT entry key in the same format as {@link buildCedictV2EntryId}.
   * Example: `服侍 服侍 [[fu2shi5]]`
   */
  entryId: string;
  /**
   * Flat list of unique gloss strings for the entry. Assignment indexes point
   * into this array.
   * Example: [`also written 伏侍`, `see also 服事[fu2shi4]`]
   */
  glosses: string[];
  /**
   * Sampled sense groupings for this entry.
   *
   * Shape: `samples -> senses -> glossIndexes`.
   * Each number is a zero-based index into {@link glosses}, preserving the
   * gloss order inside each sampled sense.
   * Example: `[[[0, 1], [1, 0]], [[0], [1]]]`
   * Serialized form example: `/1;2/2;1/ /1/2/`
   */
  assignments: number[][][];
}

export interface BuildCedictSenseSamplingOptionsType {
  sampleCount: number;
  signal?: AbortSignal;
}

export interface ClusterCedictSenseSamplingEntryOptionsType {
  threshold?: number;
}

export interface ClusterCedictSenseSamplingEntryResultType {
  entryId: string;
  glosses: string[];
  clusters: string[][];
  reviewGlosses: ClusterGlossReviewType[];
}

export interface CedictEntriesByHskLevelType {
  hsk1: CedictV2EntryType[];
  hsk2: CedictV2EntryType[];
  hsk3: CedictV2EntryType[];
  hsk4: CedictV2EntryType[];
  hsk5: CedictV2EntryType[];
  hsk6: CedictV2EntryType[];
  hsk7: CedictV2EntryType[];
}

const CEDICT_V2_SENSE_ID_LENGTH = 5;
const createCedictV2SenseId = () =>
  nanoid().slice(0, CEDICT_V2_SENSE_ID_LENGTH);

const CEDICT_V2_LINE_REGEXP = /^(\S+)\s+(\S+)\s+\[\[(.*?)\]\]\s+(\/.*\/)$/u;

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
  `color`,
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
  // unparenthesized surname label before proper names, e.g. "surname Du"
  `(?<label>surname)(?=\\s+[A-Z])|` +
  // unparenthesized "old" label before "variant of"
  `(?<label>old)(?=\\s+variant of\\s+)|` +
  // standalone abbr. label (not something that can be parsed into a label).
  `(?<label>abbr\\.)(?!\\s+(for|of|to)\\s+)|` +
  `\\((?<label>abbr\\.)\\)(?!\\s+(for|of|to)\\s+)|` +
  // abbreviated labels, e.g. onom., coll., fig.
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

  let senses = splitCedictV2Definition(definitionBody);

  const entryEdits = options.edits?.entriesByKey.get(
    buildCedictV2EntryId({
      traditional,
      simplified,
      pinyin: pinyin as PinyinNumericText,
    }),
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
  const entriesById = new Map<string, CedictV2EntryEditsType>();
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

    const entryId = buildCedictV2EntryId(header);

    if (entriesById.has(entryId)) {
      throw new Error(
        formatCedictEditsParseError(
          `duplicate edit block for ${entryId}`,
          lineNumber,
        ),
      );
    }

    entriesById.set(entryId, {
      traditional: header.traditional,
      simplified: header.simplified,
      pinyin: header.pinyin,
      rules,
    });
  }

  return {
    entriesByKey: entriesById,
  };
}

export function parseCedictV2IdsText(text: string): CedictV2SenseIdsType {
  const lines = text.split(/\r?\n/u);
  const entriesByKey = new Map<string, CedictV2EntrySenseIdsType>();
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

    const rules: CedictV2SenseIdRuleType[] = [];
    const seenIds = new Set<string>();
    const seenSenses = new Set<string>();
    const mergedIdToPrimaryId = new Map<string, string>();

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

      const parsedRule = parseCedictV2SenseIdRule(ruleTrimmed, ruleLineNumber);
      if (seenIds.has(parsedRule.id)) {
        throw new Error(
          formatCedictIdsParseError(
            `duplicate ID in ids block: ${parsedRule.id}`,
            ruleLineNumber,
          ),
        );
      }

      if (seenSenses.has(parsedRule.sense)) {
        throw new Error(
          formatCedictIdsParseError(
            `duplicate sense in ids block: ${parsedRule.sense}`,
            ruleLineNumber,
          ),
        );
      }

      if (mergedIdToPrimaryId.has(parsedRule.id)) {
        throw new Error(
          formatCedictIdsParseError(
            `primary ID also listed as merged ID in ids block: ${parsedRule.id}`,
            ruleLineNumber,
          ),
        );
      }

      for (const mergedId of parsedRule.mergedIds) {
        if (seenIds.has(mergedId)) {
          throw new Error(
            formatCedictIdsParseError(
              `merged ID conflicts with primary ID in ids block: ${mergedId}`,
              ruleLineNumber,
            ),
          );
        }

        const existingMergedOwner = mergedIdToPrimaryId.get(mergedId);
        if (existingMergedOwner != null) {
          throw new Error(
            formatCedictIdsParseError(
              `duplicate merged ID in ids block: ${mergedId}`,
              ruleLineNumber,
            ),
          );
        }

        mergedIdToPrimaryId.set(mergedId, parsedRule.id);
      }

      seenIds.add(parsedRule.id);
      seenSenses.add(parsedRule.sense);
      rules.push(parsedRule);
      i += 1;
    }

    if (rules.length === 0) {
      throw new Error(
        formatCedictIdsParseError(`ids block has no rules`, lineNumber),
      );
    }

    const entryId = buildCedictV2EntryId(header);

    if (entriesByKey.has(entryId)) {
      throw new Error(
        formatCedictIdsParseError(
          `duplicate ids block for ${entryId}`,
          lineNumber,
        ),
      );
    }

    entriesByKey.set(entryId, {
      traditional: header.traditional,
      simplified: header.simplified,
      pinyin: header.pinyin,
      rules,
    });
  }

  return {
    entriesById: entriesByKey,
  };
}

export function buildCedictV2SenseIdsText(
  entries: readonly CedictV2EntryType[],
  existingIds: CedictV2SenseIdsType,
  options: BuildCedictV2SenseIdsTextOptionsType = {},
): BuildCedictV2SenseIdsTextResultType {
  const createId = options.createId ?? createCedictV2SenseId;
  const usedIdsBySimplified = new Map<string, Set<string>>();
  const matchedExistingEntryKeys = new Set<string>();
  const newIds: string[] = [];
  const mergedIds: string[] = [];
  const deletedIds: string[] = [];

  for (const entrySenseIds of existingIds.entriesById.values()) {
    const simplifiedKey = entrySenseIds.simplified.normalize(`NFKC`);
    const usedIds = usedIdsBySimplified.get(simplifiedKey) ?? new Set<string>();
    for (const rule of entrySenseIds.rules) {
      usedIds.add(rule.id);
    }
    usedIdsBySimplified.set(simplifiedKey, usedIds);
  }

  const outputBlocks: string[] = [];

  for (const entry of entries) {
    const entryId = buildCedictV2EntryId(entry);

    const existingEntry = existingIds.entriesById.get(entryId);
    if (existingEntry != null) {
      matchedExistingEntryKeys.add(entryId);
    }

    const senses = serializeCedictV2EntrySenses(entry.senses);
    if (senses.length === 0) {
      deletedIds.push(...(existingEntry?.rules.map((rule) => rule.id) ?? []));
      continue;
    }

    const existingRules = existingEntry?.rules ?? [];
    const consumedExistingIndexes = new Set<number>();

    const simplifiedKey = entry.simplified.normalize(`NFKC`);
    const usedIds = usedIdsBySimplified.get(simplifiedKey) ?? new Set();
    usedIdsBySimplified.set(simplifiedKey, usedIds);

    const outputRules: Array<{
      id: string;
      sense: string;
      mergedIds: string[];
    }> = [];

    for (const sense of senses) {
      const exactRuleIndex = existingRules.findIndex(
        (rule, i) => !consumedExistingIndexes.has(i) && rule.sense === sense,
      );

      if (exactRuleIndex >= 0) {
        consumedExistingIndexes.add(exactRuleIndex);
        const exactRule = existingRules[exactRuleIndex]!;
        outputRules.push({
          id: exactRule.id,
          sense,
          mergedIds: [...exactRule.mergedIds],
        });
        continue;
      }

      const availableExistingRules = existingRules
        .map((rule, i) => ({ rule, i }))
        .filter(({ i }) => !consumedExistingIndexes.has(i));
      const migrationIndex = migrateSense(
        sense,
        availableExistingRules.map(({ rule }) => rule.sense),
      );

      if (migrationIndex >= 0) {
        const migratedRule = availableExistingRules[migrationIndex];
        if (migratedRule != null) {
          consumedExistingIndexes.add(migratedRule.i);
          outputRules.push({
            id: migratedRule.rule.id,
            sense,
            mergedIds: [...migratedRule.rule.mergedIds],
          });
          continue;
        }
      }

      const generatedId = generateUniqueCedictSenseId({ createId, usedIds });
      newIds.push(generatedId);
      outputRules.push({
        id: generatedId,
        sense,
        mergedIds: [],
      });
    }

    const mergedExistingIndexes = new Set<number>();
    for (const [existingIndex, existingRule] of existingRules.entries()) {
      if (consumedExistingIndexes.has(existingIndex)) {
        continue;
      }

      const targetOutputIndex = outputRules.findIndex(
        (outputRule) =>
          migrateSense(outputRule.sense, [existingRule.sense]) >= 0,
      );
      if (targetOutputIndex < 0) {
        continue;
      }

      const targetRule = outputRules[targetOutputIndex];
      if (targetRule == null) {
        continue;
      }

      targetRule.mergedIds.push(existingRule.id, ...existingRule.mergedIds);
      mergedExistingIndexes.add(existingIndex);
      if (!mergedIds.includes(existingRule.id)) {
        mergedIds.push(existingRule.id);
      }
    }

    const activePrimaryIds = new Set(outputRules.map((rule) => rule.id));
    const mergedIdOwnerById = new Map<string, string>();
    for (const outputRule of outputRules) {
      const nextMergedIds: string[] = [];

      for (const mergedId of outputRule.mergedIds) {
        if (mergedId === outputRule.id || activePrimaryIds.has(mergedId)) {
          continue;
        }

        const mergedIdOwner = mergedIdOwnerById.get(mergedId);
        if (mergedIdOwner != null && mergedIdOwner !== outputRule.id) {
          throw new Error(
            `duplicate merged ID across output rules for ${entryId}: ${mergedId}`,
          );
        }

        if (nextMergedIds.includes(mergedId)) {
          continue;
        }

        mergedIdOwnerById.set(mergedId, outputRule.id);
        nextMergedIds.push(mergedId);
      }

      outputRule.mergedIds = nextMergedIds;
    }

    deletedIds.push(
      ...existingRules
        .filter(
          (_, i) =>
            !consumedExistingIndexes.has(i) && !mergedExistingIndexes.has(i),
        )
        .map((rule) => rule.id),
    );

    outputRules.sort(
      mergeSortComparators(
        sortComparatorString((x) => x.id),
        sortComparatorString((x) => x.sense),
      ),
    );

    const header = buildCedictV2EntryId(entry);
    const ruleLines = outputRules.map((rule) => {
      const mergedIdsSegment =
        rule.mergedIds.length > 0 ? `←${rule.mergedIds.join(`,`)}` : ``;
      return `${rule.id}${mergedIdsSegment} /${rule.sense}/`;
    });

    outputBlocks.push([header, ...ruleLines].join(`\n`));
  }

  for (const [key, existingEntry] of existingIds.entriesById) {
    if (matchedExistingEntryKeys.has(key)) {
      continue;
    }

    deletedIds.push(...existingEntry.rules.map((rule) => rule.id));
  }

  return {
    text: outputBlocks.join(`\n\n`) + `\n`,
    stats: {
      newIds,
      mergedIds,
      deletedIds,
    },
  };
}

export const loadCedictV2Edits = memoize0(
  async (): Promise<CedictV2EditsType> => {
    const editsText = await readFile(cedictEditsPath, `utf8`);
    return parseCedictV2EditsText(editsText);
  },
);

export const loadCedictV2Ids = memoize0(
  async (): Promise<CedictV2SenseIdsType> => {
    const idsText = await readFile(cedictIdsPath, `utf8`);
    return parseCedictV2IdsText(idsText);
  },
);

export const loadCedictSenseSampling = memoize0(
  async (): Promise<CedictSenseSamplingEntryType[]> => {
    const text = await readFile(cedictSenseSamplingPath, `utf8`);
    return parseCedictSenseSamplingText(text);
  },
);

export async function groupCedictEntriesByHskLevel(
  entries: readonly CedictV2EntryType[],
  options?: { hsk2026?: Hsk2026Type },
): Promise<CedictEntriesByHskLevelType> {
  const hsk2026 = options?.hsk2026 ?? (await loadHsk2026());

  const grouped: CedictEntriesByHskLevelType = {
    hsk1: [],
    hsk2: [],
    hsk3: [],
    hsk4: [],
    hsk5: [],
    hsk6: [],
    hsk7: [],
  };

  const level1 = new Set(hsk2026.level1);
  const level2 = new Set(hsk2026.level2);
  const level3 = new Set(hsk2026.level3);
  const level4 = new Set(hsk2026.level4);
  const level5 = new Set(hsk2026.level5);
  const level6 = new Set(hsk2026.level6);
  const level7 = new Set(hsk2026.level7);

  for (const entry of entries) {
    if (level1.has(entry.simplified)) {
      grouped.hsk1.push(entry);
    }
    if (level2.has(entry.simplified)) {
      grouped.hsk2.push(entry);
    }
    if (level3.has(entry.simplified)) {
      grouped.hsk3.push(entry);
    }
    if (level4.has(entry.simplified)) {
      grouped.hsk4.push(entry);
    }
    if (level5.has(entry.simplified)) {
      grouped.hsk5.push(entry);
    }
    if (level6.has(entry.simplified)) {
      grouped.hsk6.push(entry);
    }
    if (level7.has(entry.simplified)) {
      grouped.hsk7.push(entry);
    }
  }

  return grouped;
}

export function buildCedictV2EntryId(
  entry: Pick<CedictV2EntryType, `traditional` | `simplified` | `pinyin`>,
): string {
  return `${entry.traditional} ${entry.simplified} [[${entry.pinyin}]]`;
}

export function buildSenseGroupingEntryFromCedictEntry(
  entry: CedictV2EntryType,
): SenseGroupingEntryType {
  return {
    traditional: entry.traditional,
    simplified: entry.simplified,
    pinyin: normalizePinyinText(entry.pinyin),
    definition: serializeCedictV2EntrySenses(entry.senses).map((sense) =>
      splitCedictV2Sense(sense),
    ),
  };
}

export function buildSenseSamplingAssignments(
  glosses: readonly string[],
  definition: SenseGroupingEntryType[`definition`],
): number[][] {
  const glossIndexByValue = new Map(
    glosses.map((gloss, index) => [gloss, index]),
  );

  return definition.map((senseGlosses, senseIndex) => {
    if (senseGlosses.length === 0) {
      throw new Error(
        `invalid sampled grouping: sense ${senseIndex} cannot be empty`,
      );
    }

    return senseGlosses.map((gloss) => {
      const clusterIndex = glossIndexByValue.get(gloss);
      if (clusterIndex == null) {
        throw new Error(
          `missing gloss ${JSON.stringify(gloss)} while encoding sampled grouping (available glosses: ${JSON.stringify(glosses)})`,
        );
      }

      return clusterIndex;
    });
  });
}

export function buildDefinitionFromSenseSamplingAssignments(
  glosses: readonly string[],
  assignments: readonly number[][],
): string[][] {
  return assignments.map((senseAssignments, senseIndex) => {
    invariant(
      senseAssignments.length > 0,
      `invalid assignment width: sense %s cannot be empty. assignments=%s`,
      senseIndex,
      assignments,
    );

    return senseAssignments.map((glossIndex, glossPosition) => {
      if (
        !Number.isInteger(glossIndex) ||
        glossIndex < 0 ||
        glossIndex >= glosses.length
      ) {
        throw new Error(
          `invalid assignment value at sense ${senseIndex}, gloss ${glossPosition}: ${glossIndex}`,
        );
      }

      return glosses[glossIndex]!;
    });
  });
}

async function sampleSenseGroupingDefinitions(
  entry: SenseGroupingEntryType,
  sampleCount: number,
  signal?: AbortSignal,
): Promise<SenseGroupingEntryType[`definition`][]> {
  const samplePrompts = Array.from({ length: sampleCount }, () =>
    buildCedictEntryGlossGroupingRandomisedPrompt(entry),
  );

  const samples = await Promise.all(
    samplePrompts.map(async (prompt) =>
      requestOpenAiChatJson(prompt, { signal }),
    ),
  );

  return samples.map((sample) => sample.data.definition);
}

export async function buildCedictSenseSampling(
  entries: readonly CedictV2EntryType[],
  targetEntryIds: readonly string[],
  existingData: CedictSenseSamplingEntryType[],
  options: BuildCedictSenseSamplingOptionsType,
): Promise<CedictSenseSamplingEntryType[]> {
  const sourceEntriesById = new Map(
    entries.map((entry) => [buildCedictV2EntryId(entry), entry]),
  );

  const nextEntries = existingData.map((entry) => ({
    entryId: entry.entryId,
    glosses: [...entry.glosses],
    assignments: entry.assignments.map((sample) =>
      sample.map((sense) => [...sense]),
    ),
  }));
  const nextEntriesById = new Map(
    nextEntries.map((entry) => [entry.entryId, entry]),
  );

  for (const entryId of targetEntryIds) {
    const sourceEntry = sourceEntriesById.get(entryId);
    if (sourceEntry == null) {
      throw new Error(`missing target CE-DICT entry: ${entryId}`);
    }

    const groupingEntry = buildSenseGroupingEntryFromCedictEntry(sourceEntry);
    const partition = partitionSenseGroupingDefinition(
      groupingEntry.definition,
    );
    const glosses = partition.groupableGlosses;
    if (glosses.length <= 1) {
      continue;
    }

    const existing = nextEntriesById.get(entryId);
    if (existing != null) {
      const expectedGlosses = glosses.join(`\u0000`);
      const actualGlosses = existing.glosses.join(`\u0000`);
      if (expectedGlosses === actualGlosses) {
        // Existing cache entries are user-editable, so preserve their current
        // sample set instead of auto-filling up to the requested target.
        continue;
      }

      existing.glosses = [...glosses];
      existing.assignments = [];
    }

    const currentEntry = existing ?? {
      entryId,
      glosses: [...glosses],
      assignments: [],
    };

    const missingSampleCount = Math.max(
      0,
      options.sampleCount - currentEntry.assignments.length,
    );
    if (missingSampleCount === 0) {
      if (existing == null) {
        nextEntries.push(currentEntry);
        nextEntriesById.set(entryId, currentEntry);
      }

      continue;
    }

    const sampledDefinitions = await sampleSenseGroupingDefinitions(
      {
        ...groupingEntry,
        definition: partition.groupableDefinition,
      },
      missingSampleCount,
      options.signal,
    );

    for (const sampledDefinition of sampledDefinitions) {
      currentEntry.assignments.push(
        buildSenseSamplingAssignments(glosses, sampledDefinition),
      );
    }

    if (existing == null) {
      nextEntries.push(currentEntry);
      nextEntriesById.set(entryId, currentEntry);
    }
  }

  return nextEntries;
}

export function clusterCedictSenseSamplingEntry(
  entry: CedictSenseSamplingEntryType,
  options: ClusterCedictSenseSamplingEntryOptionsType = {},
): ClusterCedictSenseSamplingEntryResultType {
  const samples = entry.assignments.map((assignments) =>
    buildDefinitionFromSenseSamplingAssignments(entry.glosses, assignments),
  );

  const affinityMatrix = buildSenseGroupingAffinityMatrix(samples);
  const orderMatrix = buildSenseGlossOrderMatrix(samples);
  const clustered = clusterGlossesFromAffinityMatrix(affinityMatrix, {
    threshold: options.threshold,
  });
  const clusters = clustered.clusters.map((cluster) => {
    const compareGlosses = createGlossOrderSortComparator(orderMatrix, {
      fallbackOrder: entry.glosses,
      scopeItems: cluster,
    });
    return [...cluster].sort(compareGlosses);
  });

  return {
    entryId: entry.entryId,
    glosses: [...entry.glosses],
    clusters,
    reviewGlosses: clustered.reviewGlosses,
  };
}

export function buildCedictV2GroupedSensesFromSampling(
  entries: readonly CedictV2EntryType[],
  sampling: readonly CedictSenseSamplingEntryType[],
  options: ClusterCedictSenseSamplingEntryOptionsType = {},
): readonly CedictV2EntryType[] {
  const groupedSensesByEntryKey = new Map<string, readonly string[]>();

  for (const entry of sampling) {
    if (entry.assignments.length === 0) {
      continue;
    }

    const clustered = clusterCedictSenseSamplingEntry(entry, options);
    const groupedSenses = serializeCedictV2EntrySenses(
      clustered.clusters.map((glosses) => glosses.join(`; `)),
    );

    if (groupedSenses.length === 0) {
      continue;
    }

    groupedSensesByEntryKey.set(entry.entryId, groupedSenses);
  }

  return entries.map((entry) => {
    const groupedSenses = groupedSensesByEntryKey.get(
      buildCedictV2EntryId(entry),
    );
    if (groupedSenses == null) {
      return entry;
    }

    const groupingEntry = buildSenseGroupingEntryFromCedictEntry(entry);
    const partition = partitionSenseGroupingDefinition(
      groupingEntry.definition,
    );
    const groupedGlosses = new Set(
      groupedSenses.flatMap((sense) => splitCedictV2Sense(sense)),
    );
    const excludedSenses = serializeCedictV2EntrySenses(
      partition.excludedDefinition
        .map((glosses) => glosses.filter((gloss) => !groupedGlosses.has(gloss)))
        .filter((glosses) => glosses.length > 0)
        .map((glosses) => glosses.join(`; `)),
    );
    const nextSenses = [...groupedSenses, ...excludedSenses];
    if (nextSenses.length === 0) {
      return entry;
    }

    return {
      ...entry,
      senses: nextSenses,
    };
  });
}

export function migrateSense(sense: string, oldSenses: string[]): number {
  if (sense.length === 0 || oldSenses.length === 0) {
    return -1;
  }

  const newGlosses = extractMigrationComparableGlosses(sense);
  if (newGlosses.length === 0) {
    return -1;
  }

  const newGlossSet = new Set(newGlosses);

  let bestIndex = -1;
  let bestTier = -1;
  let bestScore = -1;

  for (const [i, oldSense] of oldSenses.entries()) {
    if (oldSense.length === 0) {
      continue;
    }

    const oldGlosses = extractMigrationComparableGlosses(oldSense);
    if (oldGlosses.length === 0) {
      continue;
    }

    const oldGlossSet = new Set(oldGlosses);
    const isExactMatch =
      newGlossSet.size === oldGlossSet.size &&
      [...newGlossSet].every((gloss) => oldGlossSet.has(gloss));
    const isMergeCompatible = newGlossSet.isSupersetOf(oldGlossSet);
    const isSplitCompatible = oldGlossSet.isSupersetOf(newGlossSet);

    if (!isExactMatch && !isMergeCompatible && !isSplitCompatible) {
      continue;
    }

    const tier = isExactMatch ? 2 : isMergeCompatible ? 1 : 0;
    const score = computeGlossesSimilarity(newGlosses, oldGlosses);

    if (
      tier > bestTier ||
      // For exact matches, prefer the strongest semantic match.
      (tier === bestTier && tier === 2 && score > bestScore) ||
      // For merge/split migration, keep first-index stability.
      (tier === bestTier && tier !== 2 && (bestIndex < 0 || i < bestIndex)) ||
      (tier === bestTier &&
        tier === 2 &&
        score === bestScore &&
        (bestIndex < 0 || i < bestIndex))
    ) {
      bestIndex = i;
      bestTier = tier;
      bestScore = score;
    }
  }

  return bestIndex;
}

export function applyCedictV2EditsToText(
  entries: readonly CedictV2EntryType[],
  options: ParseCedictV2LineOptionsType = {},
): CedictV2EntryType[] {
  const matchedEntryKeys = new Set<string>();

  const outputEntries = entries
    .map((entry) => {
      const key = buildCedictV2EntryId(entry);
      const entryEdits = options.edits?.entriesByKey.get(key);
      if (entryEdits != null) {
        matchedEntryKeys.add(key);
      }

      const nextEntry: CedictV2EntryType =
        entryEdits == null
          ? entry
          : {
              ...entry,
              senses: applyCedictEntryEdits(entry.senses, entryEdits, options),
            };

      return nextEntry.senses.length > 0 ? nextEntry : null;
    })
    .filter((x) => x != null);

  for (const [key, entryEdits] of options.edits?.entriesByKey ?? []) {
    if (matchedEntryKeys.has(key)) {
      continue;
    }

    const createdSenses = applyCedictEntryEdits([], entryEdits, options);
    if (createdSenses.length === 0) {
      continue;
    }

    outputEntries.push({
      traditional: entryEdits.traditional,
      simplified: entryEdits.simplified,
      pinyin: entryEdits.pinyin,
      senses: createdSenses,
    });
  }

  return outputEntries;
}

export function applyCedictV2UnicodeNormalization(
  entries: readonly CedictV2EntryType[],
): CedictV2EntryType[] {
  const mergedByKey = new Map<string, CedictV2EntryType>();
  const outputEntries: CedictV2EntryType[] = [];

  for (const entry of entries) {
    const normalizedEntry: CedictV2EntryType = {
      traditional: entry.traditional.normalize(`NFKC`),
      simplified: entry.simplified.normalize(`NFKC`),
      pinyin: entry.pinyin,
      senses: entry.senses,
    };

    const key = buildCedictV2EntryId(normalizedEntry);
    const existingEntry = mergedByKey.get(key);

    if (existingEntry == null) {
      const createdEntry = {
        ...normalizedEntry,
        senses: [...normalizedEntry.senses],
      };
      mergedByKey.set(key, createdEntry);
      outputEntries.push(createdEntry);
      continue;
    }

    existingEntry.senses = [...existingEntry.senses, ...normalizedEntry.senses]
      .filter((sense) => sense.length > 0)
      .filter(arrayFilterUnique());
  }

  return outputEntries;
}

export function serializeCedictV2Entries(
  entries: readonly CedictV2EntryType[],
  opts?: { debug?: boolean },
): string {
  return entries.map((entry) => serializeCedictV2Entry(entry, opts)).join(`\n`);
}

export function serializeCedictV2EntrySenses(
  senses: CedictV2EntryType[`senses`],
  opts?: { debug?: boolean },
): string[] {
  return senses
    .map((sense) => serializeCedictV2Sense(parseCedictV2Sense(sense), opts))
    .filter((sense): sense is string => sense != null && sense.length > 0);
}

export function serializeCedictV2Entry(
  entry: CedictV2EntryType,
  opts?: { debug?: boolean },
): string | null {
  const senses = serializeCedictV2EntrySenses(entry.senses, opts);

  invariant(
    senses.length > 0,
    `entry has no valid senses: ${buildCedictV2EntryId(
      entry,
    )} ${JSON.stringify(entry.senses)}`,
  );

  return `${buildCedictV2EntryId(entry)} /${senses.join(`/`)}/`;
}

/**
 * Split a sense into glosses, e.g. "a; b; c" into ["a", "b", "c"], while
 * trimming  whitespace and filtering out empty glosses.
 */
export function splitCedictV2Sense(sense: string): string[] {
  return sense
    .split(`;`)
    .map((gloss) => gloss.trim())
    .filter((gloss) => gloss.length > 0);
}

/**
 * Split a definition into senses, e.g. /a/b/ into ["a", "b"], while trimming
 * whitespace and filtering out empty senses.
 */
export function splitCedictV2Definition(definition: string): string[] {
  return definition
    .split(`/`)
    .map((sense) => sense.trim())
    .filter((sense) => sense.length > 0);
}

function splitCedictSamplingGlosses(glossesText: string): string[] {
  return glossesText
    .split(`;`)
    .map((gloss) => gloss.trim())
    .filter((gloss) => gloss.length > 0);
}

function encodeCedictSenseSamplingAssignments(
  assignments: number[][][],
): string {
  return assignments
    .map((sampleAssignments) => {
      if (sampleAssignments.length === 0) {
        return `//`;
      }

      return `/${sampleAssignments
        .map((senseAssignments) => {
          if (senseAssignments.length === 0) {
            throw new Error(
              `invalid sense sampling sample: senses cannot be empty`,
            );
          }

          return senseAssignments.map((index) => index + 1).join(`;`);
        })
        .join(`/`)}/`;
    })
    .join(` `);
}

function decodeCedictSenseSamplingAssignments(
  text: string,
  glosses: readonly string[],
): number[][][] {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  if (trimmed.startsWith(`/`)) {
    return trimmed.split(/\s+/u).map((sampleText, sampleIndex) => {
      const value = sampleText.trim();
      if (!value.startsWith(`/`) || !value.endsWith(`/`)) {
        throw new Error(
          `invalid sense sampling sample at index ${sampleIndex}: expected slash-delimited senses`,
        );
      }

      const sensesText = value.slice(1, -1);
      if (sensesText.length === 0) {
        return [];
      }

      return sensesText.split(`/`).map((senseText, senseIndex) => {
        const glossIndexesText = senseText.trim();
        if (glossIndexesText.length === 0) {
          throw new Error(
            `invalid sense sampling sample at index ${sampleIndex}, sense ${senseIndex}: expected semicolon-separated gloss indexes`,
          );
        }

        const glossIndexes = glossIndexesText
          .split(`;`)
          .map((glossIndexText, glossIndex) => {
            const parsed = Number(glossIndexText.trim());
            if (!Number.isInteger(parsed) || parsed <= 0) {
              throw new Error(
                `invalid sense sampling gloss index at sample ${sampleIndex}, sense ${senseIndex}, gloss ${glossIndex}: ${JSON.stringify(glossIndexText)}`,
              );
            }

            return parsed - 1;
          });

        if (glossIndexes.length === 0) {
          throw new Error(
            `invalid sense sampling sample at index ${sampleIndex}, sense ${senseIndex}: expected at least one gloss index`,
          );
        }

        return glossIndexes;
      });
    });
  }

  return trimmed.split(`;`).map((sampleText, sampleIndex) => {
    const value = sampleText.trim();
    if (value.length === 0) {
      throw new Error(
        `invalid sense sampling sample at index ${sampleIndex}: expected comma-separated indexes`,
      );
    }

    const assignments = value.split(`,`).map((clusterIndexText, glossIndex) => {
      const parsed = Number(clusterIndexText.trim());
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(
          `invalid sense sampling cluster index at sample ${sampleIndex}, gloss ${glossIndex}: ${JSON.stringify(clusterIndexText)}`,
        );
      }

      return parsed;
    });

    if (assignments.length !== glosses.length) {
      throw new Error(
        `invalid sense sampling sample width at index ${sampleIndex}: expected ${glosses.length} indexes, got ${assignments.length}`,
      );
    }

    const groupedByCluster = new Map<number, number[]>();
    for (const [glossIndex, clusterIndex] of assignments.entries()) {
      const grouped = groupedByCluster.get(clusterIndex) ?? [];
      grouped.push(glossIndex);
      groupedByCluster.set(clusterIndex, grouped);
    }

    return [...groupedByCluster.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, glossIndexes]) => glossIndexes);
  });
}

export function encodeCedictSenseSamplingRow(
  entry: CedictSenseSamplingEntryType,
): CedictSenseSamplingRowType {
  return [
    entry.entryId,
    entry.glosses.join(`; `),
    encodeCedictSenseSamplingAssignments(entry.assignments),
  ];
}

export function decodeCedictSenseSamplingRow(
  row: CedictSenseSamplingRowType,
): CedictSenseSamplingEntryType {
  const [entryId, glossesText, samplesText] = row;
  const glosses = splitCedictSamplingGlosses(glossesText);
  if (entryId.trim().length === 0) {
    throw new Error(`invalid sense sampling row: entry id cannot be empty`);
  }

  if (glosses.length === 0) {
    throw new Error(
      `invalid sense sampling row for ${entryId}: glosses cannot be empty`,
    );
  }

  const assignments = decodeCedictSenseSamplingAssignments(
    samplesText,
    glosses,
  );

  return {
    entryId,
    glosses,
    assignments,
  };
}

export function parseCedictSenseSamplingText(
  text: string,
): CedictSenseSamplingEntryType[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new TypeError(
      `invalid sense sampling json: expected a top-level array`,
    );
  }

  const entries = parsed.map((row, rowIndex) => {
    if (
      !Array.isArray(row) ||
      row.length !== 3 ||
      typeof row[0] !== `string` ||
      typeof row[1] !== `string` ||
      typeof row[2] !== `string`
    ) {
      throw new Error(
        `invalid sense sampling row at index ${rowIndex}: expected [entryId, glosses, samples]`,
      );
    }

    return decodeCedictSenseSamplingRow([row[0], row[1], row[2]]);
  });

  const entryIds = new Set<string>();
  for (const entry of entries) {
    if (entryIds.has(entry.entryId)) {
      throw new Error(
        `invalid sense sampling json: duplicate entry id ${entry.entryId}`,
      );
    }

    entryIds.add(entry.entryId);
  }

  return entries;
}

export function serializeCedictSenseSamplingText(
  data: readonly CedictSenseSamplingEntryType[],
): CedictSenseSamplingRowType[] {
  return data.map(encodeCedictSenseSamplingRow);
}

export type GlossTokenKind =
  | `text`
  | `usesClassifier`
  | `classifierFor`
  | `label`
  | `alsoPr`
  | `abbrFor`
  | `abbrTo`
  | `variantOf`
  | `erhuaVariantOf`
  | `alsoWritten`
  | `see`
  | `seeAlso`
  | `usedIn`;

export interface GlossTokenTextType {
  kind: `text`;
  text: string;
}

export interface GlossTokenUsesClassifierType {
  kind: `usesClassifier`;
  value: string;
}

export interface GlossTokenClassifierForType {
  kind: `classifierFor`;
  value: string;
}

export interface GlossTokenLabelType {
  kind: `label`;
  value: string;
}

export type GlossTokenAlsoPrMarkerKind =
  | `also`
  | `generic`
  | `taiwan`
  | `beijing`
  | `colloquial`
  | `old`
  | `ancient`
  | `taiLo`;

export interface GlossTokenAlsoPrType {
  kind: `alsoPr`;
  value: string;
  marker?: GlossTokenAlsoPrMarkerKind;
}

export interface GlossTokenAbbrForType {
  kind: `abbrFor`;
  value: string;
}

export interface GlossTokenAbbrToType {
  kind: `abbrTo`;
  value: string;
}

export interface GlossTokenVariantOfType {
  kind: `variantOf`;
  value: string;
}

export interface GlossTokenErhuaVariantOfType {
  kind: `erhuaVariantOf`;
  value: string;
}

export interface GlossTokenAlsoWrittenType {
  kind: `alsoWritten`;
  value: string;
}

export interface GlossTokenSeeType {
  kind: `see`;
  value: string;
}

export interface GlossTokenSeeAlsoType {
  kind: `seeAlso`;
  value: string;
}

export interface GlossTokenUsedInType {
  kind: `usedIn`;
  value: string;
}

/**
 * Convenience token type to make switch(token.kind) exhaustive, since null
 * tokens don't exist.
 */
export interface GlossTokenNullType {
  kind: `null`;
}

export type GlossTokenType =
  | GlossTokenTextType
  | GlossTokenUsesClassifierType
  | GlossTokenClassifierForType
  | GlossTokenLabelType
  | GlossTokenAlsoPrType
  | GlossTokenAbbrForType
  | GlossTokenAbbrToType
  | GlossTokenVariantOfType
  | GlossTokenErhuaVariantOfType
  | GlossTokenAlsoWrittenType
  | GlossTokenSeeType
  | GlossTokenSeeAlsoType
  | GlossTokenUsedInType
  | GlossTokenNullType;

export interface GlossParseStepType {
  startTokens: GlossTokenType[];
  endTokens: GlossTokenType[];
  unparsed: string;
}

interface GlossParserContextType {
  consumedStartTokens: readonly GlossTokenType[];
}

type GlossParserType = (
  value: string,
  context: GlossParserContextType,
) => GlossParseStepType | null;

export type ParsedCedictV2SenseType = { tokens: GlossTokenType[] };

/**
 * Parse a single CC-CEDICT sense into an array of structured gloss item
 * arrays. Each inner array corresponds to one `;`-delimited gloss and contains
 * ordered items describing labels, text, inline classifiers, and also-pr
 * pronunciations in the order they appear in the original string.
 */
export function parseCedictV2Sense(
  sense: CedictV2EntryType[`senses`][number],
): ParsedCedictV2SenseType[] {
  return splitCedictV2Sense(sense).map((gloss) => ({
    tokens: parseCedictV2Gloss(gloss),
  }));
}

/**
 * Serialize structured gloss items back into a CC-CEDICT sense string.
 * Consecutive usesClassifier items are grouped into a single
 * `(uses classifier a,b)` fragment.
 * Consecutive alsoPr items are grouped into a single `(also pr. [a] [b])` fragment.
 * Abbreviation items are serialized as `(abbr. for ...)` or `(abbr. to ...)` fragments.
 * Labels are wrapped in `()`, or `{{}}` in debug mode.
 */
export function serializeCedictV2Sense(
  senses: ParsedCedictV2SenseType[],
  opts?: { debug?: boolean },
): string | null {
  if (senses.length === 0) {
    return null;
  }

  const serializedGlosses = senses
    .map((sense) => serializeGlossTokens(sense.tokens, opts))
    .filter((g) => g.length > 0);

  return serializedGlosses.length === 0 ? null : serializedGlosses.join(`; `);
}

function serializeRefs(refs: string[]): string {
  return refs.join(`,`);
}

function serializeAlsoPrMarkerLabel(
  marker: GlossTokenAlsoPrType[`marker`],
): string {
  if (marker == null || marker === `also`) {
    return `also pr.`;
  }

  if (marker === `generic`) {
    return `pr.`;
  }

  if (marker === `taiwan`) {
    return `Taiwan pr.`;
  }

  if (marker === `beijing`) {
    return `Beijing pr.`;
  }

  if (marker === `colloquial`) {
    return `colloquial pr.`;
  }

  if (marker === `old`) {
    return `old pr.`;
  }

  if (marker === `ancient`) {
    return `ancient pr.`;
  }

  return `Tai-lo pr.`;
}

function serializeAbbreviationLabel(kind: `abbrFor` | `abbrTo`): string {
  return kind === `abbrFor` ? `abbr. for` : `abbr. to`;
}

function serializeGlossTokens(
  tokens: GlossTokenType[],
  opts?: { debug?: boolean },
): string {
  const debug = opts?.debug ?? false;
  const parts: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i]!;

    if (token.kind === `text`) {
      parts.push(token.text);
    } else if (token.kind === `classifierFor`) {
      const serializedClassifierFor = `classifier for ${token.value}`;
      parts.push(
        debug
          ? `{{${serializedClassifierFor}}}`
          : `(${serializedClassifierFor})`,
      );
    } else if (token.kind === `label`) {
      parts.push(debug ? `{{${token.value}}}` : `(${token.value})`);
    } else if (token.kind === `usesClassifier`) {
      // Collect consecutive usesClassifier items into one
      // (uses classifier a,b) fragment.
      const refs: string[] = [token.value];
      while (
        i + 1 < tokens.length &&
        tokens[i + 1]!.kind === `usesClassifier`
      ) {
        i++;
        refs.push((tokens[i] as GlossTokenUsesClassifierType).value);
      }
      const serializedClassifier = `uses classifier ${serializeRefs(refs)}`;
      parts.push(
        debug ? `{{${serializedClassifier}}}` : `(${serializedClassifier})`,
      );
    } else if (token.kind === `alsoPr`) {
      // alsoPr: collect consecutive items with the same marker.
      const pinyins: string[] = [token.value];
      const marker = token.marker;
      while (
        i + 1 < tokens.length &&
        tokens[i + 1]!.kind === `alsoPr` &&
        (tokens[i + 1] as GlossTokenAlsoPrType).marker === marker
      ) {
        i++;
        pinyins.push((tokens[i] as GlossTokenAlsoPrType).value);
      }
      const markerLabel = serializeAlsoPrMarkerLabel(marker);
      parts.push(
        debug
          ? `{{${markerLabel} ${pinyins.map((p) => `[${p}]`).join(` `)}}}`
          : `(${markerLabel} ${pinyins.map((p) => `[${p}]`).join(` `)})`,
      );
    } else if (token.kind === `abbrFor` || token.kind === `abbrTo`) {
      const serializedAbbr = `${serializeAbbreviationLabel(token.kind)} ${token.value}`;
      parts.push(debug ? `{{${serializedAbbr}}}` : `(${serializedAbbr})`);
    } else if (token.kind === `variantOf`) {
      const refs: string[] = [token.value];
      while (i + 1 < tokens.length && tokens[i + 1]!.kind === `variantOf`) {
        i++;
        refs.push((tokens[i] as GlossTokenVariantOfType).value);
      }

      const serializedVariant = `variant of ${serializeRefs(refs)}`;
      parts.push(debug ? `{{${serializedVariant}}}` : `(${serializedVariant})`);
    } else if (token.kind === `erhuaVariantOf`) {
      const startIndex = i;
      const refs: string[] = [token.value];
      while (
        i + 1 < tokens.length &&
        tokens[i + 1]!.kind === `erhuaVariantOf`
      ) {
        i++;
        refs.push((tokens[i] as GlossTokenErhuaVariantOfType).value);
      }

      let serializedVariant = `erhua variant of ${serializeRefs(refs)}`;
      const previousToken = tokens[startIndex - 1];
      const nextToken = tokens[i + 1];

      if (previousToken?.kind === `text`) {
        serializedVariant = `, ${serializedVariant}`;
      }

      if (nextToken?.kind === `text`) {
        serializedVariant = `${serializedVariant},`;
      }

      // Keep unwrapped output for backwards-compatible ID canonicalization.
      parts.push(debug ? `{{${serializedVariant}}}` : serializedVariant);
    } else if (token.kind === `alsoWritten`) {
      // alsoWritten: collect consecutive refs into one fragment.
      const refs: string[] = [token.value];
      while (i + 1 < tokens.length && tokens[i + 1]!.kind === `alsoWritten`) {
        i++;
        refs.push((tokens[i] as GlossTokenAlsoWrittenType).value);
      }

      const serializedAlsoWritten = `also written ${serializeRefs(refs)}`;
      parts.push(
        debug ? `{{${serializedAlsoWritten}}}` : `(${serializedAlsoWritten})`,
      );
    } else if (token.kind === `see`) {
      // see: collect consecutive refs into one fragment.
      const refs: string[] = [token.value];
      while (i + 1 < tokens.length && tokens[i + 1]!.kind === `see`) {
        i++;
        refs.push((tokens[i] as GlossTokenSeeType).value);
      }

      const serializedSee = `see ${serializeRefs(refs)}`;
      parts.push(debug ? `{{${serializedSee}}}` : `(${serializedSee})`);
    } else if (token.kind === `seeAlso`) {
      // seeAlso: collect consecutive refs into one fragment.
      const refs: string[] = [token.value];
      while (i + 1 < tokens.length && tokens[i + 1]!.kind === `seeAlso`) {
        i++;
        refs.push((tokens[i] as GlossTokenSeeAlsoType).value);
      }

      const serializedSeeAlso = `see also ${serializeRefs(refs)}`;
      parts.push(debug ? `{{${serializedSeeAlso}}}` : `(${serializedSeeAlso})`);
    } else if (token.kind === `usedIn`) {
      // usedIn: collect consecutive values into one fragment.
      const values: string[] = [token.value];
      while (i + 1 < tokens.length && tokens[i + 1]!.kind === `usedIn`) {
        i++;
        values.push((tokens[i] as GlossTokenUsedInType).value);
      }

      const serializedUsedIn = `used in ${values.join(`,`)}`;
      parts.push(debug ? `{{${serializedUsedIn}}}` : `(${serializedUsedIn})`);
    } else {
      // type guard
      token.kind satisfies `null`;
    }

    i++;
  }

  return joinSerializedGlossParts(parts);
}

function joinSerializedGlossParts(parts: readonly string[]): string {
  let output = ``;

  for (const part of parts) {
    if (part.length === 0) {
      continue;
    }

    const shouldInsertSpace = output.length > 0 && !part.startsWith(`,`);
    output += shouldInsertSpace ? ` ${part}` : part;
  }

  return output.trim();
}

export function parseCedictV2Gloss(gloss: string): GlossTokenType[] {
  let remaining = gloss;

  const parserSteps: GlossParserType[] = [
    startLabelParserStep,
    endLabelParserStep,
    inlineClassifierParserStep,
    leadingParenthesizedClassifierForParserStep,
    leadingParenthesizedUsedInParserStep,
    leadingUsedInParserStep,
    // Standalone CL sense (entire remaining text is a classifier list)
    classifierSenseRefsParserStep,
    leadingParenthesizedPronunciationParserStep,
    // Standalone pronunciation sense, e.g. "also pr. [san1 jin1]" or "Taiwan pr. [huo4]"
    pronunciationSenseParserStep,
    abbreviationSenseParserStep,
    leadingParenthesizedAbbreviationParserStep,
    // Standalone variant-of sense, e.g. "variant of 餵|喂[wei4]"
    variantOfSenseRefsParserStep,
    // Standalone erhua variant-of sense, e.g. "erhua variant of 擺譜|摆谱[bai3pu3]"
    erhuaVariantOfSenseRefsParserStep,
    // Standalone also-written sense, e.g. "also written 三疊紀|三叠纪"
    alsoWrittenSenseRefsParserStep,
    // Standalone see sense, e.g. "see 筊杯[jiao3bei1]"
    seeSenseRefsParserStep,
    // Standalone see also sense, e.g. "see also 槲樹|槲树[hu2shu4]"
    seeAlsoSenseRefsParserStep,
    // Standalone used in sense, e.g. "used in 刺棱[ci1leng1]"
    usedInSenseRefsParserStep,
    // Standalone classifier-for sense, e.g. "classifier for noises"
    classifierForSenseParserStep,
    parenthesizedClassifierForSenseParserStep,
    leadingParenthesizedTextThenClassifierForParserStep,
    variantOfSenseWithTrailingTextParserStep,
    erhuaVariantOfSenseWithTrailingTextParserStep,
    inlineAlsoWrittenParserStep,
    inlineSeeParserStep,
    inlineSeeAlsoParserStep,
    inlineUsedInParserStep,
    inlineClassifierForParserStep,
    inlineOldVariantOfParserStep,
    inlineAbbreviationParserStep,
    inlinePronunciationParserStep,
    // Fallback text parser: consume until boundary and let parser steps retry.
    fallbackTextParserStep,
  ];

  const consumedStartTokens: GlossTokenType[] = [];
  const consumedEndTokens: GlossTokenType[] = [];
  let unparsed = remaining;

  for (;;) {
    let matched = false;

    for (const parseStep of parserSteps) {
      const parsedStep = parseStep(unparsed, {
        consumedStartTokens,
      });
      if (parsedStep == null) {
        continue;
      }

      const nextUnparsed = parsedStep.unparsed.trim();
      if (
        parsedStep.startTokens.length === 0 &&
        parsedStep.endTokens.length === 0 &&
        nextUnparsed === unparsed
      ) {
        continue;
      }

      consumedStartTokens.push(...parsedStep.startTokens);
      consumedEndTokens.unshift(...parsedStep.endTokens);
      unparsed = nextUnparsed;
      matched = true;
      break;
    }

    if (!matched || unparsed.length === 0) {
      break;
    }
  }

  const middleTokens: GlossTokenType[] = [...consumedStartTokens];
  remaining = unparsed;

  if (remaining.length > 0) {
    middleTokens.push({ kind: `text`, text: remaining.trim() });
  }

  const tokens = [...middleTokens, ...consumedEndTokens];
  const mergedTextTokens: GlossTokenType[] = [];

  for (const token of tokens) {
    const previousToken = mergedTextTokens.at(-1);
    if (token.kind !== `text` || previousToken?.kind !== `text`) {
      mergedTextTokens.push(token);
      continue;
    }

    const startsWithAlphaNumeric = /^[\p{L}\p{N}]/u.test(token.text);
    const startsWithQuote = /^["'“”‘’]/u.test(token.text);
    const shouldInsertSpace =
      previousToken.text.endsWith(`,`) ||
      token.text.startsWith(`(`) ||
      (previousToken.text.endsWith(`)`) &&
        (startsWithAlphaNumeric || startsWithQuote));
    previousToken.text += shouldInsertSpace ? ` ${token.text}` : token.text;
  }

  return mergedTextTokens;
}

function startLabelParserStep(value: string): GlossParseStepType | null {
  const startMatch = value.match(labelsAtStartRe);
  if (startMatch == null) {
    return null;
  }

  let label = startMatch.groups?.[`label`] ?? startMatch.groups?.[`domain`];
  if (label == null) {
    return null;
  }

  label = labelAliases[label] ?? label;

  return {
    startTokens: [{ kind: `label`, value: label }],
    endTokens: [],
    unparsed: value.slice(startMatch[0].length),
  };
}

function endLabelParserStep(value: string): GlossParseStepType | null {
  const endMatch = value.match(labelsAtEndRe);
  if (endMatch == null) {
    return null;
  }

  let label = endMatch.groups?.[`label`] ?? endMatch.groups?.[`domain`];
  if (label == null) {
    return null;
  }

  label = labelAliases[label] ?? label;

  return {
    startTokens: [],
    endTokens: [{ kind: `label`, value: label }],
    unparsed: value.slice(0, value.length - endMatch[0].length),
  };
}

function inlineClassifierParserStep(value: string): GlossParseStepType | null {
  const inlineClMatch = value.match(
    /\(\s*(?:CL:\s*|uses\s+classifier\s+)(?<refs>[^)]+)\)\s*/iu,
  );
  if (inlineClMatch == null) {
    return null;
  }

  const parsedRefs = parseCedictEntryRefs(inlineClMatch.groups?.[`refs`]);
  if (parsedRefs.refs.length === 0 || parsedRefs.tail.trim().length > 0) {
    return null;
  }

  const inlineClIndex = inlineClMatch.index ?? 0;
  const leadingText = value.slice(0, inlineClIndex).trim();

  const startTokens: GlossTokenType[] = [];
  if (leadingText.length > 0) {
    startTokens.push({ kind: `text`, text: leadingText });
  }

  startTokens.push(
    ...parsedRefs.refs.map(
      (v): GlossTokenUsesClassifierType => ({
        kind: `usesClassifier`,
        value: v,
      }),
    ),
  );

  return {
    startTokens,
    endTokens: [],
    unparsed: value.slice(inlineClIndex + inlineClMatch[0].length),
  };
}

function inlinePronunciationParserStep(
  value: string,
): GlossParseStepType | null {
  const inlinePronunciationMatch = value.match(
    /\s*\((?<content>[^)]*\bpr\.[^)]*)\)\s*/iu,
  );
  if (inlinePronunciationMatch == null) {
    return null;
  }

  const inlinePronunciation = extractInlinePronunciationPinyin(
    inlinePronunciationMatch[0],
  );
  if (inlinePronunciation == null) {
    return null;
  }

  const inlinePronunciationIndex = inlinePronunciationMatch.index ?? 0;
  const leadingText = value.slice(0, inlinePronunciationIndex).trim();

  const startTokens: GlossTokenType[] = [];
  if (leadingText.length > 0) {
    startTokens.push({ kind: `text`, text: leadingText });
  }

  startTokens.push(
    ...inlinePronunciation.pinyin.map(
      (v): GlossTokenAlsoPrType =>
        inlinePronunciation.marker === `also`
          ? { kind: `alsoPr`, value: v }
          : { kind: `alsoPr`, value: v, marker: inlinePronunciation.marker },
    ),
  );

  return {
    startTokens,
    endTokens: [],
    unparsed: value.slice(
      inlinePronunciationIndex + inlinePronunciationMatch[0].length,
    ),
  };
}

function inlineAbbreviationParserStep(
  value: string,
): GlossParseStepType | null {
  const inlineAbbreviationMatch = value.match(
    /\s*\(\s*abbr\.\s*(?<relation>for|of|to)\s+(?<refs>[^)]+)\s*\)\s*/iu,
  );
  if (inlineAbbreviationMatch == null) {
    return null;
  }

  const abbreviatedValue =
    inlineAbbreviationMatch.groups?.[`refs`]?.trim() ?? ``;
  if (abbreviatedValue.length === 0) {
    return null;
  }

  const kind =
    inlineAbbreviationMatch.groups?.[`relation`] === `to`
      ? `abbrTo`
      : `abbrFor`;
  const inlineAbbreviationIndex = inlineAbbreviationMatch.index ?? 0;
  const leadingText = value.slice(0, inlineAbbreviationIndex).trim();

  const startTokens: GlossTokenType[] = [];
  if (leadingText.length > 0) {
    startTokens.push({ kind: `text`, text: leadingText });
  }

  startTokens.push(
    kind === `abbrFor`
      ? { kind: `abbrFor`, value: abbreviatedValue }
      : { kind: `abbrTo`, value: abbreviatedValue },
  );

  return {
    startTokens,
    endTokens: [],
    unparsed: value.slice(
      inlineAbbreviationIndex + inlineAbbreviationMatch[0].length,
    ),
  };
}

function inlineAlsoWrittenParserStep(value: string): GlossParseStepType | null {
  const inlineAlsoWrittenMatch = value.match(
    /\s*\(\s*also\s+written\s+(?<refs>[^)]+)\s*\)\s*/iu,
  );
  if (inlineAlsoWrittenMatch == null) {
    return null;
  }

  const refs = parseCedictAlsoWrittenRefsStrict(
    inlineAlsoWrittenMatch.groups?.[`refs`],
  );
  if (refs.length === 0) {
    return null;
  }

  const inlineAlsoWrittenIndex = inlineAlsoWrittenMatch.index ?? 0;
  const leadingText = value.slice(0, inlineAlsoWrittenIndex).trim();

  const startTokens: GlossTokenType[] = [];
  if (leadingText.length > 0) {
    startTokens.push({ kind: `text`, text: leadingText });
  }

  startTokens.push(
    ...refs.map(
      (v): GlossTokenAlsoWrittenType => ({
        kind: `alsoWritten`,
        value: v,
      }),
    ),
  );

  return {
    startTokens,
    endTokens: [],
    unparsed: value.slice(
      inlineAlsoWrittenIndex + inlineAlsoWrittenMatch[0].length,
    ),
  };
}

function inlineSeeParserStep(value: string): GlossParseStepType | null {
  const inlineSeeMatch = value.match(
    /\s*\(\s*see(?!\s+also\b)\s+(?<refs>[^)]+)\s*\)\s*/iu,
  );
  if (inlineSeeMatch == null) {
    return null;
  }

  const parsedRefs = parseCedictEntryRefs(inlineSeeMatch.groups?.[`refs`]);
  if (parsedRefs.refs.length === 0 || parsedRefs.tail.trim().length > 0) {
    return null;
  }

  const inlineSeeIndex = inlineSeeMatch.index ?? 0;
  const leadingText = value.slice(0, inlineSeeIndex).trim();

  const startTokens: GlossTokenType[] = [];
  if (leadingText.length > 0) {
    startTokens.push({ kind: `text`, text: leadingText });
  }

  startTokens.push(
    ...parsedRefs.refs.map(
      (v): GlossTokenSeeType => ({ kind: `see`, value: v }),
    ),
  );

  return {
    startTokens,
    endTokens: [],
    unparsed: value.slice(inlineSeeIndex + inlineSeeMatch[0].length),
  };
}

function inlineSeeAlsoParserStep(value: string): GlossParseStepType | null {
  const inlineSeeAlsoMatch = value.match(
    /\s*\(\s*see\s+also\s+(?<refs>[^)]+)\s*\)\s*/iu,
  );
  if (inlineSeeAlsoMatch == null) {
    return null;
  }

  const parsedRefs = parseCedictEntryRefs(inlineSeeAlsoMatch.groups?.[`refs`]);
  if (parsedRefs.refs.length === 0 || parsedRefs.tail.trim().length > 0) {
    return null;
  }

  const inlineSeeAlsoIndex = inlineSeeAlsoMatch.index ?? 0;
  const leadingText = value.slice(0, inlineSeeAlsoIndex).trim();

  const startTokens: GlossTokenType[] = [];
  if (leadingText.length > 0) {
    startTokens.push({ kind: `text`, text: leadingText });
  }

  startTokens.push(
    ...parsedRefs.refs.map(
      (v): GlossTokenSeeAlsoType => ({ kind: `seeAlso`, value: v }),
    ),
  );

  return {
    startTokens,
    endTokens: [],
    unparsed: value.slice(inlineSeeAlsoIndex + inlineSeeAlsoMatch[0].length),
  };
}

function inlineUsedInParserStep(value: string): GlossParseStepType | null {
  const inlineUsedInMatch = value.match(
    /\s*\(\s*used\s+in\s+(?<value>[^)]+)\s*\)\s*/iu,
  );
  if (inlineUsedInMatch == null) {
    return null;
  }

  const parsedRefs = parseCedictEntryRefs(inlineUsedInMatch.groups?.[`value`]);
  if (parsedRefs.refs.length === 0 || parsedRefs.tail.trim().length > 0) {
    return null;
  }

  const inlineUsedInIndex = inlineUsedInMatch.index ?? 0;
  const leadingText = value.slice(0, inlineUsedInIndex).trim();

  const startTokens: GlossTokenType[] = [];
  if (leadingText.length > 0) {
    startTokens.push({ kind: `text`, text: leadingText });
  }

  startTokens.push(
    ...parsedRefs.refs.map(
      (v): GlossTokenUsedInType => ({ kind: `usedIn`, value: v }),
    ),
  );

  return {
    startTokens,
    endTokens: [],
    unparsed: value.slice(inlineUsedInIndex + inlineUsedInMatch[0].length),
  };
}

function inlineClassifierForParserStep(
  value: string,
): GlossParseStepType | null {
  const inlineClassifierForMatch = value.match(
    /\s*\(\s*classifier\s+for\s+(?<value>[^)]+)\s*\)\s*/iu,
  );
  if (inlineClassifierForMatch == null) {
    return null;
  }

  const inlineClassifierForIndex = inlineClassifierForMatch.index ?? 0;
  const isWholeGloss =
    inlineClassifierForIndex === 0 &&
    inlineClassifierForMatch[0].trim().length === value.trim().length;
  if (isWholeGloss) {
    return null;
  }

  const classifierForValue =
    inlineClassifierForMatch.groups?.[`value`]?.trim() ?? ``;
  if (classifierForValue.length === 0) {
    return null;
  }

  const leadingText = value.slice(0, inlineClassifierForIndex).trim();
  const startTokens: GlossTokenType[] = [];

  if (leadingText.length > 0) {
    startTokens.push({ kind: `text`, text: leadingText });
  }

  startTokens.push({ kind: `classifierFor`, value: classifierForValue });

  return {
    startTokens,
    endTokens: [],
    unparsed: value.slice(
      inlineClassifierForIndex + inlineClassifierForMatch[0].length,
    ),
  };
}

function inlineOldVariantOfParserStep(
  value: string,
  context: GlossParserContextType,
): GlossParseStepType | null {
  const hasLeadingLabelToken = context.consumedStartTokens.some(
    (token) => token.kind === `label`,
  );
  if (hasLeadingLabelToken) {
    return null;
  }

  const inlineOldVariantOfMatch = value.match(
    /\s*\(\s*old\s+variant\s+of\s+(?<refs>[^)]+)\s*\)\s*/iu,
  );
  if (inlineOldVariantOfMatch == null) {
    return null;
  }

  const parsedRefs = parseCedictEntryRefs(
    inlineOldVariantOfMatch.groups?.[`refs`],
  );
  if (parsedRefs.refs.length !== 1 || parsedRefs.tail.trim().length > 0) {
    return null;
  }

  const inlineOldVariantOfIndex = inlineOldVariantOfMatch.index ?? 0;
  const leadingText = value.slice(0, inlineOldVariantOfIndex).trim();
  const startTokens: GlossTokenType[] = [];

  if (leadingText.length > 0) {
    startTokens.push({ kind: `text`, text: leadingText });
  }

  startTokens.push(
    { kind: `label`, value: `old` },
    { kind: `variantOf`, value: parsedRefs.refs[0]! },
  );

  return {
    startTokens,
    endTokens: [],
    unparsed: value.slice(
      inlineOldVariantOfIndex + inlineOldVariantOfMatch[0].length,
    ),
  };
}

function leadingParenthesizedClassifierForParserStep(
  value: string,
): GlossParseStepType | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith(`(`)) {
    return null;
  }

  let depth = 0;
  let closingParenIndex = -1;
  for (const [index, char] of Array.from(trimmed).entries()) {
    if (char === `(`) {
      depth += 1;
    } else if (char === `)`) {
      depth -= 1;
      if (depth === 0) {
        closingParenIndex = index;
        break;
      }
    }
  }

  if (closingParenIndex < 0) {
    return null;
  }

  const firstParenthesizedSegment = trimmed
    .slice(0, closingParenIndex + 1)
    .trim();
  const classifierFor = extractParenthesizedClassifierForSense(
    firstParenthesizedSegment,
  );
  if (classifierFor == null) {
    return null;
  }

  return {
    startTokens: [{ kind: `classifierFor`, value: classifierFor }],
    endTokens: [],
    unparsed: trimmed.slice(closingParenIndex + 1),
  };
}

function leadingParenthesizedUsedInParserStep(
  value: string,
): GlossParseStepType | null {
  const trimmed = value.trim();
  const leadingParenthesizedUsedInMatch = trimmed.match(
    /^\(\s*used\s+in\s+(?<refs>[^)]+)\s*\)\s*/iu,
  );
  if (leadingParenthesizedUsedInMatch == null) {
    return null;
  }

  const parsedRefs = parseCedictEntryRefs(
    leadingParenthesizedUsedInMatch.groups?.[`refs`],
  );
  if (parsedRefs.refs.length === 0 || parsedRefs.tail.trim().length > 0) {
    return null;
  }

  return {
    startTokens: parsedRefs.refs.map(
      (v): GlossTokenUsedInType => ({ kind: `usedIn`, value: v }),
    ),
    endTokens: [],
    unparsed: trimmed.slice(leadingParenthesizedUsedInMatch[0].length),
  };
}

function leadingUsedInParserStep(value: string): GlossParseStepType | null {
  const trimmed = value.trim();
  const leadingUsedInMatch = trimmed.match(/^used\s+in\s+/iu);
  if (leadingUsedInMatch == null) {
    return null;
  }

  const parsedRefs = parseCedictEntryRefs(
    trimmed.slice(leadingUsedInMatch[0].length),
  );
  if (parsedRefs.refs.length === 0) {
    return null;
  }

  return {
    startTokens: parsedRefs.refs.map(
      (v): GlossTokenUsedInType => ({ kind: `usedIn`, value: v }),
    ),
    endTokens: [],
    unparsed: parsedRefs.tail,
  };
}

function leadingParenthesizedPronunciationParserStep(
  value: string,
): GlossParseStepType | null {
  const trimmed = value.trim();
  const leadingParenthesizedPronunciationMatch = trimmed.match(
    /^\(\s*[^)]*\bpr\.[^)]*\)\s*/iu,
  );
  if (leadingParenthesizedPronunciationMatch == null) {
    return null;
  }

  const inlinePronunciation = extractInlinePronunciationPinyin(
    leadingParenthesizedPronunciationMatch[0],
  );
  if (inlinePronunciation == null) {
    return null;
  }

  return {
    startTokens: inlinePronunciation.pinyin.map(
      (v): GlossTokenAlsoPrType =>
        inlinePronunciation.marker === `also`
          ? { kind: `alsoPr`, value: v }
          : { kind: `alsoPr`, value: v, marker: inlinePronunciation.marker },
    ),
    endTokens: [],
    unparsed: trimmed.slice(leadingParenthesizedPronunciationMatch[0].length),
  };
}

function leadingParenthesizedTextThenClassifierForParserStep(
  value: string,
): GlossParseStepType | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith(`(`)) {
    return null;
  }

  let depth = 0;
  let closingParenIndex = -1;
  for (const [index, char] of Array.from(trimmed).entries()) {
    if (char === `(`) {
      depth += 1;
      continue;
    }

    if (char !== `)`) {
      continue;
    }

    depth -= 1;
    if (depth === 0) {
      closingParenIndex = index;
      break;
    }
  }

  if (closingParenIndex < 0) {
    return null;
  }

  const leadingText = trimmed.slice(0, closingParenIndex + 1).trim();
  const trailingText = trimmed.slice(closingParenIndex + 1).trim();
  const classifierFor = extractClassifierForSense(trailingText);
  if (classifierFor == null) {
    return null;
  }

  return {
    startTokens: [
      { kind: `text`, text: leadingText },
      { kind: `classifierFor`, value: classifierFor },
    ],
    endTokens: [],
    unparsed: ``,
  };
}

function fallbackTextParserStep(value: string): GlossParseStepType | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let firstBoundaryIndex = -1;
  for (const [index, char] of Array.from(trimmed).entries()) {
    const tail = trimmed.slice(index);
    if (
      char === `(` &&
      (index === 0 || /[\s,]/u.test(trimmed[index - 1] ?? ``)) &&
      tail.match(
        /^\(\s*(?:[^)]*\bpr\.|abbr\.|also\s+written|see(?:\s+also)?|used\s+in|classifier\s+for|old\s+variant\s+of|old\s*\)\s*\(\s*variant\s+of|variant\s+of|erhua\s+variant\s+of)/iu,
      ) != null
    ) {
      firstBoundaryIndex = index;
      break;
    }
  }

  let consumeLength =
    firstBoundaryIndex < 0 ? trimmed.length : firstBoundaryIndex;

  if (consumeLength === 0 && trimmed.startsWith(`(`)) {
    let depth = 0;
    for (const [index, char] of Array.from(trimmed).entries()) {
      if (char === `(`) {
        depth += 1;
      } else if (char === `)`) {
        depth -= 1;
      }

      if (depth === 0) {
        consumeLength = index + 1;
        break;
      }
    }

    if (consumeLength === 0) {
      consumeLength = trimmed.length;
    }
  }

  const consumedText = trimmed.slice(0, consumeLength).trim();
  if (consumedText.length === 0) {
    return null;
  }

  return {
    startTokens: [{ kind: `text`, text: consumedText }],
    endTokens: [],
    unparsed: trimmed.slice(consumeLength),
  };
}

function classifierSenseRefsParserStep(
  value: string,
): GlossParseStepType | null {
  const standaloneClassifiers = extractClassifierSenseRefs(value);
  if (standaloneClassifiers == null) {
    return null;
  }

  return {
    startTokens: standaloneClassifiers.map(
      (v): GlossTokenUsesClassifierType => ({
        kind: `usesClassifier`,
        value: v,
      }),
    ),
    endTokens: [],
    unparsed: ``,
  };
}

function pronunciationSenseParserStep(
  value: string,
): GlossParseStepType | null {
  const standalonePronunciation = extractPronunciationSensePinyin(value);
  if (standalonePronunciation == null) {
    return null;
  }

  return {
    startTokens: standalonePronunciation.pinyin.map(
      (v): GlossTokenAlsoPrType =>
        standalonePronunciation.marker === `also`
          ? { kind: `alsoPr`, value: v }
          : {
              kind: `alsoPr`,
              value: v,
              marker: standalonePronunciation.marker,
            },
    ),
    endTokens: [],
    unparsed: ``,
  };
}

function abbreviationSenseParserStep(value: string): GlossParseStepType | null {
  const standaloneAbbreviation = extractAbbreviationSenseRefs(value);
  if (standaloneAbbreviation == null) {
    return null;
  }

  const abbreviationTokens: GlossTokenType[] = [];
  const leadingText = standaloneAbbreviation.leadingText?.trim() ?? ``;
  const trailingText = standaloneAbbreviation.trailingText?.trim() ?? ``;

  if (leadingText.length > 0) {
    abbreviationTokens.push({ kind: `text`, text: leadingText });
  }

  abbreviationTokens.push(
    standaloneAbbreviation.kind === `abbrFor`
      ? { kind: `abbrFor`, value: standaloneAbbreviation.value }
      : { kind: `abbrTo`, value: standaloneAbbreviation.value },
  );

  if (trailingText.length > 0) {
    abbreviationTokens.push({ kind: `text`, text: trailingText });
  }

  return {
    startTokens: abbreviationTokens,
    endTokens: [],
    unparsed: ``,
  };
}

function leadingParenthesizedAbbreviationParserStep(
  value: string,
): GlossParseStepType | null {
  const trimmed = value.trim();
  const leadingParenthesizedAbbreviationMatch = trimmed.match(
    /^\(\s*abbr\.\s*(for|of|to)\s+[^)]+\)\s*/iu,
  );
  if (leadingParenthesizedAbbreviationMatch == null) {
    return null;
  }

  const leadingAbbreviation = extractAbbreviationSenseRefs(
    leadingParenthesizedAbbreviationMatch[0],
  );
  if (leadingAbbreviation == null) {
    return null;
  }

  return {
    startTokens: [
      leadingAbbreviation.kind === `abbrFor`
        ? { kind: `abbrFor`, value: leadingAbbreviation.value }
        : { kind: `abbrTo`, value: leadingAbbreviation.value },
    ],
    endTokens: [],
    unparsed: trimmed.slice(leadingParenthesizedAbbreviationMatch[0].length),
  };
}

function variantOfSenseRefsParserStep(
  value: string,
): GlossParseStepType | null {
  const standaloneVariantOf = extractVariantOfSenseRefs(value);
  if (standaloneVariantOf == null) {
    return null;
  }

  return {
    startTokens: standaloneVariantOf.map(
      (v): GlossTokenVariantOfType => ({ kind: `variantOf`, value: v }),
    ),
    endTokens: [],
    unparsed: ``,
  };
}

function erhuaVariantOfSenseRefsParserStep(
  value: string,
): GlossParseStepType | null {
  const standaloneErhuaVariantOf = extractErhuaVariantOfSenseRefs(value);
  if (standaloneErhuaVariantOf == null) {
    return null;
  }

  return {
    startTokens: standaloneErhuaVariantOf.map(
      (v): GlossTokenErhuaVariantOfType => ({
        kind: `erhuaVariantOf`,
        value: v,
      }),
    ),
    endTokens: [],
    unparsed: ``,
  };
}

function alsoWrittenSenseRefsParserStep(
  value: string,
): GlossParseStepType | null {
  const standaloneAlsoWritten = extractAlsoWrittenSenseRefs(value);
  if (standaloneAlsoWritten == null) {
    return null;
  }

  return {
    startTokens: standaloneAlsoWritten.map(
      (v): GlossTokenAlsoWrittenType => ({ kind: `alsoWritten`, value: v }),
    ),
    endTokens: [],
    unparsed: ``,
  };
}

function seeSenseRefsParserStep(value: string): GlossParseStepType | null {
  const standaloneSee = extractSeeSenseRefs(value);
  if (standaloneSee == null) {
    return null;
  }

  return {
    startTokens: standaloneSee.map(
      (v): GlossTokenSeeType => ({ kind: `see`, value: v }),
    ),
    endTokens: [],
    unparsed: ``,
  };
}

function seeAlsoSenseRefsParserStep(value: string): GlossParseStepType | null {
  const standaloneSeeAlso = extractSeeAlsoSenseRefs(value);
  if (standaloneSeeAlso == null) {
    return null;
  }

  return {
    startTokens: standaloneSeeAlso.map(
      (v): GlossTokenSeeAlsoType => ({ kind: `seeAlso`, value: v }),
    ),
    endTokens: [],
    unparsed: ``,
  };
}

function usedInSenseRefsParserStep(value: string): GlossParseStepType | null {
  const standaloneUsedIn = extractUsedInSenseRefs(value);
  if (standaloneUsedIn == null) {
    return null;
  }

  return {
    startTokens: standaloneUsedIn.map(
      (v): GlossTokenUsedInType => ({ kind: `usedIn`, value: v }),
    ),
    endTokens: [],
    unparsed: ``,
  };
}

function classifierForSenseParserStep(
  value: string,
): GlossParseStepType | null {
  const standaloneClassifierFor = extractClassifierForSense(value);
  if (standaloneClassifierFor == null) {
    return null;
  }

  return {
    startTokens: [{ kind: `classifierFor`, value: standaloneClassifierFor }],
    endTokens: [],
    unparsed: ``,
  };
}

function parenthesizedClassifierForSenseParserStep(
  value: string,
): GlossParseStepType | null {
  const wrappedStandaloneClassifierFor =
    extractParenthesizedClassifierForSense(value);
  if (wrappedStandaloneClassifierFor == null) {
    return null;
  }

  return {
    startTokens: [
      { kind: `classifierFor`, value: wrappedStandaloneClassifierFor },
    ],
    endTokens: [],
    unparsed: ``,
  };
}

function variantOfSenseWithTrailingTextParserStep(
  value: string,
): GlossParseStepType | null {
  const variantOfWithTrailingText =
    extractVariantOfSenseWithTrailingText(value);
  if (variantOfWithTrailingText == null) {
    return null;
  }

  return {
    startTokens: variantOfWithTrailingText.refs.map(
      (v): GlossTokenVariantOfType => ({ kind: `variantOf`, value: v }),
    ),
    endTokens: [],
    unparsed: variantOfWithTrailingText.trailingText,
  };
}

function erhuaVariantOfSenseWithTrailingTextParserStep(
  value: string,
): GlossParseStepType | null {
  const erhuaVariantOfWithTrailingText =
    extractErhuaVariantOfSenseWithTrailingText(value);
  if (erhuaVariantOfWithTrailingText == null) {
    return null;
  }

  return {
    startTokens: erhuaVariantOfWithTrailingText.refs.map(
      (v): GlossTokenErhuaVariantOfType => ({
        kind: `erhuaVariantOf`,
        value: v,
      }),
    ),
    endTokens: [],
    unparsed: erhuaVariantOfWithTrailingText.trailingText,
  };
}

function extractClassifierSenseRefs(sense: string): string[] | null {
  const directMatch = sense.match(/^\s*CL:\s*(?<refs>.+?)\s*$/iu);
  if (directMatch != null) {
    const parsedRefs = parseCedictEntryRefs(directMatch.groups?.[`refs`]);
    if (parsedRefs.refs.length > 0 && parsedRefs.tail.trim().length === 0) {
      return parsedRefs.refs;
    }
  }

  const wrappedMatch = sense.match(/^\s*\(\s*CL:\s*(?<refs>[^)]+)\s*\)\s*$/iu);
  if (wrappedMatch == null) {
    return null;
  }

  const parsedRefs = parseCedictEntryRefs(wrappedMatch.groups?.[`refs`]);
  if (parsedRefs.tail.trim().length > 0) {
    return null;
  }

  return parsedRefs.refs.length === 0 ? null : parsedRefs.refs;
}

export interface CedictEntryRefsParseResultType {
  refs: string[];
  tail: string;
}

function isValidCedictEntryRef(ref: string): boolean {
  if (/^\[[^\]]+\]$/u.test(ref)) {
    return true;
  }

  const bracketedMatch = ref.match(/^(?<word>[^,\s[\]]+?)\[[^\]]+\]$/u);
  if (bracketedMatch != null) {
    const word = bracketedMatch.groups?.[`word`];
    return (
      word != null &&
      word.length > 0 &&
      word.split(`|`).every((part) => part.length > 0)
    );
  }

  const isPipeDelimitedRef =
    ref.includes(`|`) && ref.split(`|`).every((part) => part.length > 0);
  if (isPipeDelimitedRef) {
    return true;
  }

  if (/^\p{Script=Han}+$/u.test(ref)) {
    return true;
  }

  // Some name refs use a middle dot between Han segments, e.g. 斯文·赫定.
  return /^\p{Script=Han}+(?:[·・]\p{Script=Han}+)+$/u.test(ref);
}

export function parseCedictEntryRefs(
  rawRefs: string | undefined,
): CedictEntryRefsParseResultType {
  if (rawRefs == null) {
    return {
      refs: [],
      tail: ``,
    };
  }

  const refs: string[] = [];
  let cursor = 0;

  for (;;) {
    const itemStart = cursor;
    while (rawRefs[cursor]?.match(/\s/u) != null) {
      cursor += 1;
    }

    const itemMatch = rawRefs
      .slice(cursor)
      .match(/^(?<ref>\[[^\]]+\]|[^,\s[\]]+\[[^\]]+\]|[^,\s[\]]+)/u);
    if (itemMatch == null) {
      return {
        refs,
        tail: rawRefs.slice(itemStart),
      };
    }

    const nextRef = itemMatch.groups?.[`ref`];
    if (nextRef == null || !isValidCedictEntryRef(nextRef)) {
      return {
        refs,
        tail: rawRefs.slice(itemStart),
      };
    }

    refs.push(nextRef);
    cursor += itemMatch[0].length;

    const separatorStart = cursor;
    while (rawRefs[cursor]?.match(/\s/u) != null) {
      cursor += 1;
    }
    const hasWhitespaceSeparator = cursor > separatorStart;

    if (cursor >= rawRefs.length) {
      return {
        refs,
        tail: ``,
      };
    }

    let separatorLength = 0;
    if (rawRefs[cursor] === `,`) {
      separatorLength = 1;
    } else if (/^and\b/iu.test(rawRefs.slice(cursor))) {
      separatorLength = 3;
    } else if (/^or\b/iu.test(rawRefs.slice(cursor))) {
      separatorLength = 2;
    } else if (hasWhitespaceSeparator) {
      // Support refs separated only by whitespace, e.g. "[a] [b]".
      separatorLength = 0;
    } else {
      return {
        refs,
        tail: rawRefs.slice(separatorStart),
      };
    }

    const separatorIndex = hasWhitespaceSeparator ? separatorStart : cursor;
    cursor += separatorLength;
    while (rawRefs[cursor]?.match(/\s/u) != null) {
      cursor += 1;
    }

    const nextItem = rawRefs
      .slice(cursor)
      .match(/^(?<ref>\[[^\]]+\]|[^,\s[\]]+\[[^\]]+\]|[^,\s[\]]+)/u);
    const nextRefCandidate = nextItem?.groups?.[`ref`];
    const hasValidNextRef =
      nextRefCandidate != null && isValidCedictEntryRef(nextRefCandidate);

    if (!hasValidNextRef) {
      return {
        refs,
        tail: rawRefs.slice(separatorIndex),
      };
    }
  }
}

function parseCedictVariantRefsStrict(rawRefs: string | undefined): string[] {
  if (rawRefs == null) {
    return [];
  }

  const parsedRefs = parseCedictEntryRefs(rawRefs);
  if (parsedRefs.tail.trim().length > 0) {
    return [];
  }

  return parsedRefs.refs.length === 0 ? [] : parsedRefs.refs;
}

function extractVariantOfSenseRefs(sense: string): string[] | null {
  const directMatch = sense.match(/^\s*variant\s+of\s+(?<refs>.+?)\s*$/iu);
  if (directMatch != null) {
    const refs = parseCedictVariantRefsStrict(directMatch.groups?.[`refs`]);
    if (refs.length > 0) {
      return refs;
    }
  }

  const wrappedMatch = sense.match(
    /^\s*\(\s*variant\s+of\s+(?<refs>[^)]+)\s*\)\s*$/iu,
  );
  if (wrappedMatch == null) {
    return null;
  }

  const refs = parseCedictVariantRefsStrict(wrappedMatch.groups?.[`refs`]);
  return refs.length === 0 ? null : refs;
}

function extractErhuaVariantOfSenseRefs(sense: string): string[] | null {
  const directMatch = sense.match(
    /^\s*erhua\s+variant\s+of\s+(?<refs>.+?)\s*$/iu,
  );
  if (directMatch != null) {
    const refs = parseCedictVariantRefsStrict(directMatch.groups?.[`refs`]);
    if (refs.length > 0) {
      return refs;
    }
  }

  const wrappedMatch = sense.match(
    /^\s*\(\s*erhua\s+variant\s+of\s+(?<refs>[^)]+)\s*\)\s*$/iu,
  );
  if (wrappedMatch == null) {
    return null;
  }

  const refs = parseCedictVariantRefsStrict(wrappedMatch.groups?.[`refs`]);
  return refs.length === 0 ? null : refs;
}

function extractAlsoWrittenSenseRefs(sense: string): string[] | null {
  const directMatch = sense.match(/^[\s]*also\s+written\s+(?<refs>.+?)\s*$/iu);
  if (directMatch != null) {
    const refs = parseCedictAlsoWrittenRefsStrict(directMatch.groups?.[`refs`]);
    if (refs.length > 0) {
      return refs;
    }
  }

  const wrappedMatch = sense.match(
    /^[\s]*\(\s*also\s+written\s+(?<refs>[^)]+)\s*\)\s*$/iu,
  );
  if (wrappedMatch == null) {
    return null;
  }

  const refs = parseCedictAlsoWrittenRefsStrict(wrappedMatch.groups?.[`refs`]);
  return refs.length === 0 ? null : refs;
}

function parseCedictAlsoWrittenRefsStrict(
  rawRefs: string | undefined,
): string[] {
  if (rawRefs == null) {
    return [];
  }

  const refs = rawRefs.trim();
  if (refs.length === 0 || refs.match(/^as$/iu) != null) {
    return [];
  }

  return [refs];
}

function extractSeeSenseRefs(sense: string): string[] | null {
  const directMatch = sense.match(/^\s*see(?!\s+also\b)\s+(?<refs>.+?)\s*$/iu);
  if (directMatch != null) {
    const refs = parseCedictVariantRefsStrict(directMatch.groups?.[`refs`]);
    if (refs.length > 0) {
      return refs;
    }
  }

  const wrappedMatch = sense.match(
    /^\s*\(\s*see(?!\s+also\b)\s+(?<refs>[^)]+)\s*\)\s*$/iu,
  );
  if (wrappedMatch == null) {
    return null;
  }

  const refs = parseCedictVariantRefsStrict(wrappedMatch.groups?.[`refs`]);
  return refs.length === 0 ? null : refs;
}

function extractSeeAlsoSenseRefs(sense: string): string[] | null {
  const directMatch = sense.match(/^\s*see\s+also\s+(?<refs>.+?)\s*$/iu);
  if (directMatch != null) {
    const refs = parseCedictVariantRefsStrict(directMatch.groups?.[`refs`]);
    if (refs.length > 0) {
      return refs;
    }
  }

  const wrappedMatch = sense.match(
    /^\s*\(\s*see\s+also\s+(?<refs>[^)]+)\s*\)\s*$/iu,
  );
  if (wrappedMatch == null) {
    return null;
  }

  const refs = parseCedictVariantRefsStrict(wrappedMatch.groups?.[`refs`]);
  return refs.length === 0 ? null : refs;
}

function extractUsedInSenseRefs(sense: string): string[] | null {
  const directMatch = sense.match(/^[\s]*used\s+in\s+(?<refs>.+?)\s*$/iu);
  if (directMatch != null) {
    const refs = parseCedictVariantRefsStrict(directMatch.groups?.[`refs`]);
    if (refs.length > 0) {
      return refs;
    }
  }

  const wrappedMatch = sense.match(
    /^[\s]*\(\s*used\s+in\s+(?<refs>[^)]+)\s*\)\s*$/iu,
  );
  if (wrappedMatch == null) {
    return null;
  }

  const refs = parseCedictVariantRefsStrict(wrappedMatch.groups?.[`refs`]);
  return refs.length === 0 ? null : refs;
}

function extractClassifierForSense(sense: string): string | null {
  const directMatch = sense.match(
    /^[\s]*classifier\s+for\s+(?<value>.+?)\s*$/iu,
  );
  if (directMatch != null) {
    const value = directMatch.groups?.[`value`]?.trim() ?? ``;
    if (value.length > 0) {
      return value;
    }
  }

  return null;
}

function extractParenthesizedClassifierForSense(sense: string): string | null {
  const normalizedSense = sense.trim();
  if (
    !normalizedSense.startsWith(`(`) ||
    !normalizedSense.endsWith(`)`) ||
    !hasFullOuterParentheses(normalizedSense)
  ) {
    return null;
  }

  const unwrappedSense = normalizedSense.slice(1, -1).trim();
  const wrappedMatch = unwrappedSense.match(
    /^classifier\s+for\s+(?<value>[\s\S]+)$/iu,
  );
  if (wrappedMatch == null) {
    return null;
  }

  const value = wrappedMatch.groups?.[`value`]?.trim() ?? ``;
  return value.length === 0 ? null : value;
}

function extractVariantOfSenseWithTrailingText(sense: string): {
  refs: string[];
  trailingText: string;
} | null {
  const wrappedMatch = sense.match(
    /^[\s]*\(\s*variant\s+of\s+(?<refs>[^)]+)\s*\)\s*(?<trailingText>.+?)\s*$/iu,
  );
  if (wrappedMatch != null) {
    const refs = parseCedictVariantRefsStrict(wrappedMatch.groups?.[`refs`]);
    if (refs.length === 0) {
      return null;
    }

    const trailingText =
      wrappedMatch.groups?.[`trailingText`]?.replace(/^,\s*/u, ``).trim() ?? ``;
    if (trailingText.length === 0) {
      return null;
    }

    return {
      refs,
      trailingText,
    };
  }

  const directMatch = sense.match(/^[\s]*variant\s+of\s+(?<tail>.+?)\s*$/iu);
  if (directMatch == null) {
    return null;
  }

  const tail = directMatch.groups?.[`tail`]?.trim();
  if (tail == null || tail.length === 0) {
    return null;
  }

  const parsedRefs = parseCedictEntryRefs(tail);
  if (parsedRefs.refs.length === 0) {
    return null;
  }

  const trailingText = parsedRefs.tail.replace(/^,\s*/u, ``).trim();
  if (trailingText.length === 0) {
    return null;
  }

  return {
    refs: parsedRefs.refs,
    trailingText,
  };
}

function extractErhuaVariantOfSenseWithTrailingText(sense: string): {
  refs: string[];
  trailingText: string;
} | null {
  const wrappedMatch = sense.match(
    /^[\s]*\(\s*erhua\s+variant\s+of\s+(?<refs>[^)]+)\s*\)\s*(?<trailingText>.+?)\s*$/iu,
  );
  if (wrappedMatch != null) {
    const refs = parseCedictVariantRefsStrict(wrappedMatch.groups?.[`refs`]);
    if (refs.length === 0) {
      return null;
    }

    const trailingText =
      wrappedMatch.groups?.[`trailingText`]?.replace(/^,\s*/u, ``).trim() ?? ``;
    if (trailingText.length === 0) {
      return null;
    }

    return {
      refs,
      trailingText,
    };
  }

  const directMatch = sense.match(
    /^[\s]*erhua\s+variant\s+of\s+(?<tail>.+?)\s*$/iu,
  );
  if (directMatch == null) {
    return null;
  }

  const tail = directMatch.groups?.[`tail`]?.trim();
  if (tail == null || tail.length === 0) {
    return null;
  }

  const parsedRefs = parseCedictEntryRefs(tail);
  if (parsedRefs.refs.length === 0) {
    return null;
  }

  const trailingText = parsedRefs.tail.replace(/^,\s*/u, ``).trim();
  if (trailingText.length === 0) {
    return null;
  }

  return {
    refs: parsedRefs.refs,
    trailingText,
  };
}

interface PronunciationMarkerMatchType {
  marker: GlossTokenAlsoPrMarkerKind;
  matchedText: string;
}

interface PronunciationExtractionType {
  marker: GlossTokenAlsoPrMarkerKind;
  pinyin: string[];
}

const standalonePronunciationMarkerMatchers: readonly {
  marker: GlossTokenAlsoPrMarkerKind;
  regexp: RegExp;
}[] = [
  { marker: `taiwan`, regexp: /^(?:Taiwan|Tw)\s+pr\./iu },
  { marker: `beijing`, regexp: /^Beijing\s+pr\./iu },
  { marker: `colloquial`, regexp: /^(?:colloquial|coll\.)\s+pr\./iu },
  { marker: `old`, regexp: /^old\s+pr\./iu },
  { marker: `ancient`, regexp: /^ancient\s+pr\./iu },
  { marker: `taiLo`, regexp: /^Tai-lo\s+pr\./iu },
  { marker: `also`, regexp: /^(?:also|alternatively)\s+pr\./iu },
  { marker: `generic`, regexp: /^pr\./iu },
];

const inlinePronunciationMarkerMatchers: readonly {
  marker: GlossTokenAlsoPrMarkerKind;
  regexp: RegExp;
}[] = [
  { marker: `taiwan`, regexp: /^(?:Taiwan|Tw)\s+pr\./iu },
  { marker: `beijing`, regexp: /^Beijing\s+pr\./iu },
  { marker: `colloquial`, regexp: /^(?:colloquial|coll\.)\s+pr\./iu },
  { marker: `old`, regexp: /^old\s+pr\./iu },
  { marker: `ancient`, regexp: /^ancient\s+pr\./iu },
  { marker: `taiLo`, regexp: /^Tai-lo\s+pr\./iu },
  { marker: `also`, regexp: /^(?:also|alternatively)\s+pr\./iu },
  { marker: `generic`, regexp: /^pr\./iu },
];

function parseBracketPronunciationRefs(value: string): string[] | null {
  const parsedRefs = parseCedictEntryRefs(value);
  if (parsedRefs.refs.length === 0) {
    return null;
  }

  const bracketRefMatchRe = /^\[(?<pinyinNumeric>[^\]]+)\]$/u;
  const bracketMatches = parsedRefs.refs
    .map((ref) =>
      ref.match(bracketRefMatchRe)?.groups?.[`pinyinNumeric`]?.trim(),
    )
    .filter((item): item is string => item != null && item.length > 0);
  if (bracketMatches.length !== parsedRefs.refs.length) {
    return null;
  }

  const remainder = parsedRefs.tail
    .replaceAll(/\b(?:and|etc\.?)\b/giu, ` `)
    .replaceAll(/[^a-z0-9\s]/giu, ` `)
    .trim();

  if (remainder.length > 0) {
    return null;
  }

  return bracketMatches;
}

function extractStandalonePronunciationMarker(
  value: string,
): PronunciationMarkerMatchType | null {
  for (const matcher of standalonePronunciationMarkerMatchers) {
    const match = value.match(matcher.regexp);
    if (match == null) {
      continue;
    }

    return {
      marker: matcher.marker,
      matchedText: match[0],
    };
  }

  return null;
}

function extractInlinePronunciationMarker(
  value: string,
): GlossTokenAlsoPrMarkerKind | null {
  for (const matcher of inlinePronunciationMarkerMatchers) {
    const match = value.match(matcher.regexp);
    if (match == null) {
      continue;
    }

    return matcher.marker;
  }

  return null;
}

function extractInlinePronunciationPrefixLength(
  value: string,
  marker: GlossTokenAlsoPrMarkerKind,
): number | null {
  const match =
    marker === `taiwan`
      ? value.match(/^(?:Taiwan|Tw)\s+pr\./iu)
      : marker === `beijing`
        ? value.match(/^Beijing\s+pr\./iu)
        : marker === `colloquial`
          ? value.match(/^(?:colloquial|coll\.)\s+pr\./iu)
          : marker === `old`
            ? value.match(/^old\s+pr\./iu)
            : marker === `ancient`
              ? value.match(/^ancient\s+pr\./iu)
              : marker === `taiLo`
                ? value.match(/^Tai-lo\s+pr\./iu)
                : marker === `also`
                  ? value.match(/^(?:also|alternatively)\s+pr\./iu)
                  : value.match(/^pr\./iu);

  return match == null ? null : match[0].length;
}

function extractPronunciationSensePinyin(
  sense: string,
): PronunciationExtractionType | null {
  let remaining = sense.trimStart();
  for (;;) {
    const labelMatch = remaining.match(/^\([^)]*\)\s*/u);
    if (labelMatch == null) {
      break;
    }
    remaining = remaining.slice(labelMatch[0].length).trimStart();
  }

  const markerMatch = extractStandalonePronunciationMarker(remaining);
  if (markerMatch == null) {
    return null;
  }

  const tail = remaining.slice(markerMatch.matchedText.length).trim();

  const pinyin = parseBracketPronunciationRefs(tail);
  if (pinyin == null) {
    return null;
  }

  return {
    marker: markerMatch.marker,
    pinyin,
  };
}

function extractInlinePronunciationPinyin(
  parenthesized: string,
): PronunciationExtractionType | null {
  const parenthesizedMatch = parenthesized.match(
    /^\s*\(\s*(?<content>[^)]+)\s*\)\s*$/u,
  );
  if (parenthesizedMatch == null) {
    return null;
  }

  const content = parenthesizedMatch.groups?.[`content`];
  if (content == null) {
    return null;
  }

  const trimmedContent = content.trimStart();
  const marker = extractInlinePronunciationMarker(trimmedContent);
  if (marker == null) {
    return null;
  }

  const markerPrefixLength = extractInlinePronunciationPrefixLength(
    trimmedContent,
    marker,
  );
  if (markerPrefixLength == null) {
    return null;
  }

  const tail = trimmedContent.slice(markerPrefixLength).trim();
  const pinyin = parseBracketPronunciationRefs(tail);
  if (pinyin == null) {
    return null;
  }

  return {
    marker,
    pinyin,
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
      edits: options.edits,
    });

    return parsedLine == null ? [] : [parsedLine];
  });
}

export const cedictPath = path.join(import.meta.dirname, `cedict_ts-2.u8`);
export const cedictIdsPath = cedictPath + `.ids`;
export const cedictEditsPath = cedictPath + `.edits`;
export const cedictSenseSamplingPath = cedictPath + `.senseSampling.json`;

export const loadCedictV2Original = memoize0(
  async (): Promise<readonly CedictV2EntryType[]> => {
    const dataText = await readFile(cedictPath, `utf8`);

    const parsedEntries = parseCedictV2Text(dataText, { strict: true });
    const normalizedEntries = applyCedictV2UnicodeNormalization(parsedEntries);

    return normalizedEntries;
  },
);

export const loadCedictV2 = memoize0(
  async (): Promise<readonly CedictV2EntryType[]> => {
    const entries = await loadCedictV2Original();
    const edits = await loadCedictV2Edits();

    const editedEntries = applyCedictV2EditsToText(entries, {
      strict: true,
      edits,
    });

    return editedEntries;
  },
);

export async function findCedictSenseById(
  cedictSenseId: string,
): Promise<CedictV2SenseIdRuleType | null> {
  if (cedictSenseId.length === 0) {
    return null;
  }

  const senseIdParams = parseCedictSenseId(cedictSenseId);
  if (senseIdParams == null) {
    return null;
  }

  const ids = await loadCedictV2Ids();
  const idsEntry = ids.entriesById.get(buildCedictV2EntryId(senseIdParams));
  const directRule = idsEntry?.rules.find(
    (rule) => rule.id === senseIdParams.id,
  );
  const idsRule =
    directRule ??
    idsEntry?.rules.find((rule) => rule.mergedIds.includes(senseIdParams.id));
  if (idsRule == null) {
    return null;
  }

  return idsRule;
}

export function buildCedictSenseId(
  traditional: string,
  simplified: string,
  pinyinNumeric: string,
  id: string,
): string {
  const traditionalNormalized = traditional.normalize(`NFKC`);
  const simplifiedNormalized = simplified.normalize(`NFKC`);
  const pinyinNumericNormalized = pinyinNumeric.normalize(
    `NFKC`,
  ) as PinyinNumericText;
  const idNormalized = id.normalize(`NFKC`);

  invariant(
    idNormalized.match(/^[A-Za-z0-9]{5}$/u) != null,
    `invalid CE-DICT sense ID: ${idNormalized}`,
  );

  return `${buildCedictV2EntryId({ traditional: traditionalNormalized, simplified: simplifiedNormalized, pinyin: pinyinNumericNormalized })} ${idNormalized}`;
}

export function parseCedictSenseId(
  cedictSenseId: string,
): CedictSenseIdParamsType | null {
  const match = cedictSenseId.match(
    /^(?<traditional>\S+)\s+(?<simplified>\S+)\s+\[\[(?<pinyin>.*?)\]\]\s+(?<id>[A-Za-z0-9]{5})$/u,
  );
  if (match == null) {
    return null;
  }

  const traditional = match.groups?.[`traditional`];
  const simplified = match.groups?.[`simplified`];
  const pinyin = match.groups?.[`pinyin`];
  const id = match.groups?.[`id`];
  if (
    traditional == null ||
    traditional.length === 0 ||
    simplified == null ||
    simplified.length === 0 ||
    pinyin == null ||
    id == null
  ) {
    return null;
  }

  return {
    traditional,
    simplified,
    pinyin: pinyin as PinyinNumericText,
    id,
  };
}

function normalizeGlossForComparison(gloss: string): string {
  return gloss.toLowerCase().replaceAll(/\s+/gu, ` `).trim();
}

function extractMigrationComparableGlosses(sense: string): string[] {
  const comparableGlosses = parseCedictV2Sense(sense)
    .map((parsedGloss) =>
      normalizeMigrationGlossForComparison(
        buildCedictComparableGlossText(parsedGloss.tokens),
      ),
    )
    .filter((gloss) => gloss.length > 0)
    .filter(arrayFilterUnique());
  if (comparableGlosses.length > 0) {
    return comparableGlosses;
  }

  // Some legacy senses only differ by outer wrapping, e.g.
  // (also pr. [pou1]) vs also pr. [pou1].
  return splitCedictV2Sense(sense)
    .map((gloss) => normalizeMigrationGlossForComparison(gloss))
    .filter((gloss) => gloss.length > 0)
    .filter(arrayFilterUnique());
}

function normalizeMigrationGlossForComparison(gloss: string): string {
  let normalized = normalizeGlossForComparison(gloss);

  // Treat legacy CL classifier formatting and canonical uses-classifier
  // formatting as equivalent during migration matching.
  normalized = normalized.replaceAll(
    /^\(?\s*cl:\s*([^)]*?)\s*\)?$/giu,
    `uses classifier $1`,
  );
  normalized = normalized.replaceAll(
    /^\(?\s*uses\s+classifier\s+([^)]*?)\s*\)?$/giu,
    `uses classifier $1`,
  );

  // Treat parenthesized short abbreviations like "(foo.)" and "foo." as
  // equivalent during migration matching.
  normalized = normalized.replaceAll(/\((?<abbr>[a-z]{1,10}\.)\)/gu, `$1`);

  normalized = normalized.replaceAll(
    /\(\s*abbr\.\s*of\s+([^)]*?)\s*\)/giu,
    `abbr. for $1`,
  );
  normalized = normalized.replaceAll(
    /\(\s*abbr\.\s*for\s+([^)]*?)\s*\)/giu,
    `abbr. for $1`,
  );
  normalized = normalized.replaceAll(
    /\(\s*abbr\.\s*to\s+([^)]*?)\s*\)/giu,
    `abbr. to $1`,
  );

  // Treat "(variant of X)" and "variant of X" as equivalent during
  // migration matching so parser/serializer reshaping does not churn ids.
  normalized = normalized.replaceAll(
    /\(\s*variant\s+of\s+([^)]*?)\s*\)/gu,
    `variant of $1`,
  );
  normalized = normalized.replaceAll(
    /\(\s*erhua\s+variant\s+of\s+([^)]*?)\s*\)/gu,
    `erhua variant of $1`,
  );
  normalized = normalized.replaceAll(
    /\(\s*also\s+written\s+([^)]*?)\s*\)/gu,
    `also written $1`,
  );
  normalized = normalized.replaceAll(/\(\s*see\s+([^)]*?)\s*\)/gu, `see $1`);
  normalized = normalized.replaceAll(
    /\(\s*see\s+also\s+([^)]*?)\s*\)/gu,
    `see also $1`,
  );
  normalized = normalized.replaceAll(
    /\(\s*used\s+in\s+([^)]*?)\s*\)/gu,
    `used in $1`,
  );

  // Migration should treat the serializer's wrapped classifier-for form as
  // equivalent to the legacy bare form, even when the gloss body contains its
  // own parenthesized text.
  if (
    normalized.startsWith(`(`) &&
    normalized.endsWith(`)`) &&
    hasFullOuterParentheses(normalized)
  ) {
    const unwrapped = normalized.slice(1, -1).trim();
    if (unwrapped.startsWith(`classifier for `)) {
      normalized = unwrapped;
    }
  }

  for (;;) {
    if (
      normalized.length < 2 ||
      !normalized.startsWith(`(`) ||
      !normalized.endsWith(`)`)
    ) {
      break;
    }

    if (!hasFullOuterParentheses(normalized)) {
      break;
    }

    const inner = normalizeGlossForComparison(normalized.slice(1, -1));
    if (inner.length === 0) {
      break;
    }

    normalized = inner;
  }

  return normalized;
}

function buildCedictComparableGlossText(
  tokens: readonly GlossTokenType[],
): string {
  const parts: string[] = [];

  for (const [index, token] of tokens.entries()) {
    const previousToken = tokens[index - 1];
    const nextToken = tokens[index + 1];

    if (token.kind === `text`) {
      parts.push(token.text);
    } else if (token.kind === `label`) {
      parts.push(`(${token.value})`);
    } else if (token.kind === `abbrFor` || token.kind === `abbrTo`) {
      let serializedAbbreviation = `${serializeAbbreviationLabel(token.kind)} ${token.value}`;

      if (previousToken?.kind === `text`) {
        serializedAbbreviation = `, ${serializedAbbreviation}`;
      }

      if (nextToken?.kind === `text`) {
        serializedAbbreviation = `${serializedAbbreviation},`;
      }

      parts.push(serializedAbbreviation);
    } else if (token.kind === `variantOf`) {
      parts.push(`variant of ${token.value}`);
    } else if (token.kind === `erhuaVariantOf`) {
      parts.push(`erhua variant of ${token.value}`);
    } else if (token.kind === `alsoWritten`) {
      parts.push(`also written ${token.value}`);
    } else if (token.kind === `see`) {
      parts.push(`see ${token.value}`);
    } else if (token.kind === `seeAlso`) {
      parts.push(`see also ${token.value}`);
    } else if (token.kind === `usedIn`) {
      parts.push(`used in ${token.value}`);
    } else if (token.kind === `classifierFor`) {
      let serializedClassifierFor = `classifier for ${token.value}`;

      if (previousToken?.kind === `text`) {
        serializedClassifierFor = `, ${serializedClassifierFor}`;
      }

      if (nextToken?.kind === `text`) {
        serializedClassifierFor = `${serializedClassifierFor},`;
      }

      parts.push(serializedClassifierFor);
    }
  }

  return parts
    .join(` `)
    .replaceAll(/\s+,/gu, `,`)
    .replaceAll(/,\s+/gu, `, `)
    .trim();
}

function extractAbbreviationSenseRefs(sense: string): {
  kind: `abbrFor` | `abbrTo`;
  value: string;
  leadingText?: string;
  trailingText?: string;
} | null {
  const normalizedSense =
    sense.trim().startsWith(`/`) && sense.trim().endsWith(`/`)
      ? sense.trim().slice(1, -1).trim()
      : sense;

  const prefixedMatch = normalizedSense.match(
    /^\s*(?<leadingText>.+?),\s*abbr\.\s*(?<relation>for|of|to)\s+(?<refs>.+?)\s*$/iu,
  );
  if (prefixedMatch != null) {
    let leadingText = prefixedMatch.groups?.[`leadingText`]?.trim() ?? ``;
    let rawRefs = prefixedMatch.groups?.[`refs`] ?? ``;

    // Handle patterns like "foo (bar, abbr. for X)" where the trailing
    // right parenthesis belongs to the leading prose, not the ref.
    if (
      rawRefs.endsWith(`)`) &&
      leadingText.includes(`(`) &&
      !leadingText.includes(`)`)
    ) {
      rawRefs = rawRefs.slice(0, -1).trim();
      leadingText = `${leadingText})`;
    }

    const value = rawRefs.trim();
    if (value.length > 0) {
      return {
        kind:
          prefixedMatch.groups?.[`relation`] === `to` ? `abbrTo` : `abbrFor`,
        value,
        leadingText,
      };
    }
  }

  const directMatch = normalizedSense.match(
    /^\s*abbr\.\s*(?<relation>for|of|to)\s+(?<refs>.+?)\s*$/iu,
  );
  if (directMatch != null) {
    const rawValue = directMatch.groups?.[`refs`] ?? ``;
    const parsedRefs = parseCedictEntryRefs(rawValue);
    const tailMatch = parsedRefs.tail.match(/^\s*,\s*(?<tail>.+?)\s*$/u);
    const value =
      parsedRefs.refs.length > 0 && tailMatch != null
        ? rawValue.slice(0, rawValue.length - parsedRefs.tail.length).trim()
        : rawValue.trim();

    if (value.length > 0) {
      return {
        kind: directMatch.groups?.[`relation`] === `to` ? `abbrTo` : `abbrFor`,
        value,
        trailingText: tailMatch?.groups?.[`tail`],
      };
    }
  }

  const wrappedMatch = normalizedSense.match(
    /^\s*\(\s*abbr\.\s*(?<relation>for|of|to)\s+(?<refs>[^)]+)\s*\)\s*$/iu,
  );
  if (wrappedMatch != null) {
    const value = wrappedMatch.groups?.[`refs`]?.trim() ?? ``;
    if (value.length > 0) {
      return {
        kind: wrappedMatch.groups?.[`relation`] === `to` ? `abbrTo` : `abbrFor`,
        value,
      };
    }
  }

  return null;
}

function hasFullOuterParentheses(value: string): boolean {
  if (!value.startsWith(`(`) || !value.endsWith(`)`)) {
    return false;
  }

  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === `(`) {
      depth += 1;
      continue;
    }

    if (char !== `)`) {
      continue;
    }

    depth -= 1;
    if (depth < 0) {
      return false;
    }

    if (depth === 0 && index < value.length - 1) {
      return false;
    }
  }

  return depth === 0;
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

function formatParseError(
  message: string,
  options: ParseCedictV2LineOptionsType,
): string {
  if (options.lineNumber == null) {
    return message;
  }

  return `${message} (line ${options.lineNumber})`;
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

function parseCedictV2SenseIdRule(
  line: string,
  lineNumber: number,
): CedictV2SenseIdRuleType {
  const match = line.match(
    /^(?<id>[A-Za-z0-9]{5})(?:←(?<mergedIds>[A-Za-z0-9]{5}(?:,[A-Za-z0-9]{5})*))?\s+\/(?<sense>[^/]*)\/$/u,
  );
  if (match == null) {
    throw new Error(
      formatCedictIdsParseError(`invalid ids rule line`, lineNumber),
    );
  }

  const id = match.groups?.[`id`];
  const sense = match.groups?.[`sense`]?.trim();
  const mergedIds =
    match.groups?.[`mergedIds`]
      ?.split(`,`)
      .map((x) => x.trim())
      .filter((x) => x.length > 0) ?? [];

  if (
    new Set(mergedIds).size !== mergedIds.length ||
    mergedIds.includes(id ?? ``)
  ) {
    throw new Error(
      formatCedictIdsParseError(`invalid ids rule line`, lineNumber),
    );
  }

  if (
    id == null ||
    id.length !== CEDICT_V2_SENSE_ID_LENGTH ||
    sense == null ||
    sense.length === 0
  ) {
    throw new Error(
      formatCedictIdsParseError(`invalid ids rule line`, lineNumber),
    );
  }

  return {
    id: id,
    sense,
    mergedIds,
  };
}

function generateUniqueCedictSenseId({
  createId,
  usedIds,
}: {
  createId: () => string;
  usedIds: Set<string>;
}): string {
  const attempts = 100;

  for (let i = 0; i < attempts; i += 1) {
    const next = createId();
    if (next.length !== CEDICT_V2_SENSE_ID_LENGTH) {
      continue;
    }

    if (!/^[A-Za-z0-9]{5}$/u.test(next)) {
      continue;
    }

    if (usedIds.has(next)) {
      continue;
    }

    usedIds.add(next);
    return next;
  }

  throw new Error(
    `failed to generate unique 5-character CEDICT sense ID after ${attempts} attempts`,
  );
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

    const replacementSenses = splitCedictV2Definition(
      `/` + rule.newSense + `/`,
    );

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

function formatCedictIdsParseError(
  message: string,
  lineNumber: number,
): string {
  return `${message} (line ${lineNumber})`;
}

export const senseGroupingEntrySchema = z.object({
  simplified: z.string(),
  traditional: z.string(),
  pinyin: pinyinTextSchema,
  definition: z.array(z.array(z.string())),
});

export type SenseGroupingEntryType = z.infer<typeof senseGroupingEntrySchema>;

interface SenseGroupingDefinitionPartitionType {
  groupableDefinition: string[][];
  excludedDefinition: string[][];
  groupableGlosses: string[];
  excludedGlosses: string[];
}

function isGroupableSenseGloss(gloss: string): boolean {
  return parseCedictV2Gloss(gloss).some((token) => token.kind === `text`);
}

function partitionSenseGroupingDefinition(
  definition: readonly (readonly string[])[],
): SenseGroupingDefinitionPartitionType {
  const groupableDefinition = definition
    .map((sense) => sense.filter((gloss) => isGroupableSenseGloss(gloss)))
    .filter((sense) => sense.length > 0);
  const excludedDefinition = definition
    .map((sense) => sense.filter((gloss) => !isGroupableSenseGloss(gloss)))
    .filter((sense) => sense.length > 0);

  return {
    groupableDefinition,
    excludedDefinition,
    groupableGlosses: groupableDefinition.flat().filter(arrayFilterUnique()),
    excludedGlosses: excludedDefinition.flat().filter(arrayFilterUnique()),
  };
}

export const buildCedictEntryGlossGroupingRandomisedPrompt = (
  entry: SenseGroupingEntryType,
): ChatPrompt<typeof senseGroupingEntrySchema> => {
  const shuffledEntry = {
    ...entry,
    definition: shuffle(entry.definition.flat()).map((gloss) => [gloss]),
  };

  return buildCedictEntrySenseGroupingPrompt(shuffledEntry);
};

export async function sampledRegroupEntry(
  entry: SenseGroupingEntryType,
  opts?: { samples?: number; signal?: AbortSignal; threshold?: number },
): Promise<{
  affinityMatrix: SenseGroupingAffinityMatrixType;
  result: SenseGroupingEntryType;
  reviews: {
    clusters: string[][];
    glosses: ClusterGlossReviewType[];
  };
  messages: ChatPromptMessage[];
  usages: OpenAI.CompletionUsage[];
}> {
  const sampleCount = opts?.samples ?? 5;
  const threshold = opts?.threshold ?? 1;
  const partition = partitionSenseGroupingDefinition(entry.definition);

  if (partition.groupableGlosses.length <= 1) {
    return {
      affinityMatrix: {
        items: [...partition.groupableGlosses],
        matrix: partition.groupableGlosses.map(() => [1]),
      },
      result: {
        ...entry,
        definition: [
          ...partition.groupableDefinition,
          ...partition.excludedDefinition,
        ],
      },
      reviews: {
        clusters: [
          ...partition.groupableDefinition,
          ...partition.excludedDefinition,
        ],
        glosses: [],
      },
      messages: [],
      usages: [],
    };
  }

  const groupableEntry = {
    ...entry,
    definition: partition.groupableDefinition,
  };

  const samplePrompts = Array.from({ length: sampleCount }, () =>
    buildCedictEntryGlossGroupingRandomisedPrompt(groupableEntry),
  );

  const samples = await Promise.all(
    samplePrompts.map(async (prompt) => ({
      prompt,
      response: await requestOpenAiChatJson(prompt, { signal: opts?.signal }),
    })),
  );

  const definitions = samples.map((sample) => sample.response.data.definition);

  const affinityMatrix = buildSenseGroupingAffinityMatrix(definitions);

  const clusteredResult = clusterGlossesFromAffinityMatrix(affinityMatrix, {
    threshold,
  });

  const resultEntry = {
    ...entry,
    definition: [...clusteredResult.clusters, ...partition.excludedDefinition],
  };

  return {
    affinityMatrix,
    result: resultEntry,
    reviews: {
      clusters: resultEntry.definition,
      glosses: clusteredResult.reviewGlosses,
    },
    messages: samples.flatMap((sample) => [
      ...sample.prompt.messages,
      sample.response.message,
    ]),
    usages: samples
      .map((sample) => sample.response.usage)
      .filter((x) => x != null),
  };
}

export const buildCedictEntrySenseGroupingPrompt = (
  entry: SenseGroupingEntryType,
): ChatPrompt<typeof senseGroupingEntrySchema> => {
  const systemTemplate = `
You're a helpful assistant that makes improvements to Chinese to English dictionary entries. Your job is fix errors in entries, specifically how "glosses" are grouped into "senses".

> A definition is made up of senses, and a sense is made up of glosses. […] Generally, glosses within a sense are synonyms and can be included to remove ambiguity, while senses represent wholly different meanings or uses of a word.

Rules:
- Each gloss can have multiple meanings and appear in multiple groups.
- Do not invent or delete glosses, only arrange groups.
- Each group must have a unique meaning/concept/theme.
- Within each group, put good glosses first.
- Consider the "part of speech" for each gloss (e.g. verb, adjective, noun).
- Text in parenthesis "( )" are hints.
- Keep gloss text verbatim as they appear in the input.
`.trim();

  const userTemplate = `
Fix the following entry:

<data>
{{ data }}
</data>
`.trim();

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        data: JSON.stringify(entry),
      }),
    },
  ];

  const schema = z.object({
    simplified: z.string(),
    traditional: z.string(),
    pinyin: pinyinTextSchema,
    definition: z.array(
      // Enforce that only the input glosses can be used in the output groups.
      z.array(z.enum(entry.definition.flat()) as unknown as ZodString),
    ),
  }) satisfies typeof senseGroupingEntrySchema;

  return {
    messages,
    model: `gpt-5.4`,
    reasoningEffort: `none`,
    schema,
  };
};

export const buildCedictEntrySenseMergingPrompt = (
  entry: SenseGroupingEntryType,
): ChatPrompt<typeof senseGroupingEntrySchema> => {
  const systemTemplate = `
You're a helpful assistant that makes improvements to Chinese to English dictionary entries. Your job is to audit existing entries and determine if and how to simplify them by merging together some senses, or to leave them as-is.

> A definition is made up of senses, and a sense is made up of glosses. […] Generally, glosses within a sense are synonyms and can be included to remove ambiguity, while senses represent wholly different meanings or uses of a word.

Rules:
- Do not add or remove glosses, only group them.
- Do not create entirely new groups, only merge together existing ones.
- Do not delete a group unless it's being merged with another.
- Always separate different meaning/concept/theme into individual groups.
- Text in parenthesis "()" is often a hint for how the gloss could be used in a sentence.
`.trim();

  const userTemplate = `
Fix the following entry:

<data>
{{ data }}
</data>
`.trim();

  const messages: ChatPromptMessage[] = [
    { role: `system`, content: renderPromptTemplate(systemTemplate, {}) },
    {
      role: `user`,
      content: renderPromptTemplate(userTemplate, {
        data: JSON.stringify(entry, null, 2),
      }),
    },
  ];

  return {
    messages,
    model: `gpt-5.4`,
    reasoningEffort: `none`,
    schema: senseGroupingEntrySchema,
  };
};

export function nestedStringSetScorer(spec: {
  actual: SenseGroupingEntryType[`definition`];
  expected: SenseGroupingEntryType[`definition`];
}): {
  score: number;
  mismatches: Set<{ expected: Set<string>; actual: Set<string> }>;
} {
  const actualSenses = spec.actual.map((sense) => new Set(sense));
  const expectedSenses = spec.expected.map((sense) => new Set(sense));
  const expectedTotal = expectedSenses.reduce(
    (sum, sense) => sum + sense.size,
    0,
  );
  const actualTotal = actualSenses.reduce((sum, sense) => sum + sense.size, 0);

  let matching = 0;
  const usedActualSenses = new Set<number>();
  const mismatches = new Set<{ expected: Set<string>; actual: Set<string> }>();
  const emptySet = new Set<string>();

  for (const expectedSense of expectedSenses) {
    let bestMatchIndex = -1;
    let bestMatchCount = 0;

    for (let i = 0; i < actualSenses.length; i++) {
      if (usedActualSenses.has(i)) {
        continue;
      }

      let matchCount = 0;
      for (const gloss of expectedSense) {
        if (actualSenses[i]?.has(gloss) === true) {
          matchCount += 1;
        }
      }

      if (matchCount > bestMatchCount) {
        bestMatchCount = matchCount;
        bestMatchIndex = i;
      }
    }

    if (bestMatchIndex > -1) {
      usedActualSenses.add(bestMatchIndex);
      matching += bestMatchCount;

      const matchedActualSense = actualSenses[bestMatchIndex]!;
      const isExactSenseMatch =
        bestMatchCount === expectedSense.size &&
        matchedActualSense.size === expectedSense.size;

      if (!isExactSenseMatch) {
        mismatches.add({
          expected: expectedSense,
          actual: matchedActualSense,
        });
      }
    } else {
      mismatches.add({ expected: expectedSense, actual: emptySet });
    }
  }

  for (let i = 0; i < actualSenses.length; i++) {
    if (usedActualSenses.has(i)) {
      continue;
    }

    mismatches.add({ expected: emptySet, actual: actualSenses[i]! });
  }

  const denominator = expectedTotal + actualTotal - matching;

  return {
    score: denominator === 0 ? 1 : matching / denominator,
    mismatches,
  };
}

export interface SenseGroupingAffinityMatrixType {
  /**
   * Gloss labels, ordered to match the matrix rows and columns.
   */
  items: string[];
  /**
   * Pairwise normalized affinity scores in the 0-1 range; matrix[i][j] measures items[i] vs items[j].
   */
  matrix: number[][];
}

export interface SenseGlossOrderMatrixType {
  /**
   * Gloss labels, ordered to match the matrix rows and columns.
   */
  items: string[];
  /**
   * Pairwise counts where matrix[i][j] is the number of sampled senses where
   * items[i] appeared before items[j].
   */
  matrix: number[][];
}

export interface CreateGlossOrderSortComparatorOptionsType {
  /**
   * Deterministic fallback ordering when sampled evidence ties.
   */
  fallbackOrder?: readonly string[];
  /**
   * Optional subset to compute ordering strength within.
   */
  scopeItems?: readonly string[];
}

export interface ClusterGlossesFromAffinityMatrixOptionsType {
  threshold?: number;
}

export interface ClusterGlossesFromAffinityMatrixResultType {
  clusters: string[][];
  reviewGlosses: ClusterGlossReviewType[];
}

export interface ClusterGlossReviewType {
  gloss: string;
  clusterAffinities: number[];
}

export function buildSenseGroupingAffinityMatrix(
  samples: readonly SenseGroupingEntryType[`definition`][],
): SenseGroupingAffinityMatrixType {
  const allGlosses = samples.flatMap((sample) => sample.flat());
  const items = [...new Set(allGlosses)].sort((a, b) => a.localeCompare(b));

  if (items.length === 0) {
    return {
      items: [],
      matrix: [],
    };
  }

  const itemCount = items.length;
  const itemIndexByGloss = new Map<string, number>(
    items.map((gloss, index) => [gloss, index]),
  );
  const sameGroupCounts = Array.from({ length: itemCount }, () =>
    Array.from({ length: itemCount }, () => 0),
  );
  const coOccurrenceCounts = Array.from({ length: itemCount }, () =>
    Array.from({ length: itemCount }, () => 0),
  );

  for (const sample of samples) {
    const sampleGroupsByGloss = new Map<string, Set<number>>();

    for (const [groupIndex, group] of sample.entries()) {
      for (const gloss of group) {
        const groupsForGloss = sampleGroupsByGloss.get(gloss) ?? new Set();
        groupsForGloss.add(groupIndex);
        sampleGroupsByGloss.set(gloss, groupsForGloss);
      }
    }

    const presentIndexes = [...sampleGroupsByGloss.keys()]
      .map((gloss) => itemIndexByGloss.get(gloss))
      .filter((index): index is number => index != null)
      .sort((a, b) => a - b);

    for (let i = 0; i < presentIndexes.length; i += 1) {
      const rowIndex = presentIndexes[i]!;
      const rowItem = items[rowIndex]!;
      const rowGroups = sampleGroupsByGloss.get(rowItem);
      if (rowGroups == null) {
        continue;
      }

      for (let j = i; j < presentIndexes.length; j += 1) {
        const colIndex = presentIndexes[j]!;
        const colItem = items[colIndex]!;
        const colGroups = sampleGroupsByGloss.get(colItem);
        if (colGroups == null) {
          continue;
        }

        coOccurrenceCounts[rowIndex]![colIndex]! += 1;
        if (rowIndex !== colIndex) {
          coOccurrenceCounts[colIndex]![rowIndex]! += 1;
        }

        const isSameGroup = [...rowGroups].some((groupIndex) =>
          colGroups.has(groupIndex),
        );
        if (isSameGroup) {
          sameGroupCounts[rowIndex]![colIndex]! += 1;
          if (rowIndex !== colIndex) {
            sameGroupCounts[colIndex]![rowIndex]! += 1;
          }
        }
      }
    }
  }

  const matrix = Array.from({ length: itemCount }, (_, rowIndex) =>
    Array.from({ length: itemCount }, (_, colIndex) => {
      const denominator = coOccurrenceCounts[rowIndex]![colIndex]!;
      if (denominator === 0) {
        return 0;
      }

      const numerator = sameGroupCounts[rowIndex]![colIndex]!;
      return clampConfidence(numerator / denominator);
    }),
  );

  return {
    items,
    matrix,
  };
}

export function buildSenseGlossOrderMatrix(
  samples: readonly SenseGroupingEntryType[`definition`][],
): SenseGlossOrderMatrixType {
  const allGlosses = samples.flatMap((sample) => sample.flat());
  const items = [...new Set(allGlosses)].sort((a, b) => a.localeCompare(b));

  if (items.length === 0) {
    return {
      items: [],
      matrix: [],
    };
  }

  const itemIndexByGloss = new Map<string, number>(
    items.map((gloss, index) => [gloss, index]),
  );
  const matrix = Array.from({ length: items.length }, () =>
    Array.from({ length: items.length }, () => 0),
  );

  for (const sample of samples) {
    for (const senseGlosses of sample) {
      const seenGlosses = new Set<string>();
      const uniqueSenseGlosses = senseGlosses.filter((gloss) => {
        if (seenGlosses.has(gloss)) {
          return false;
        }

        seenGlosses.add(gloss);
        return true;
      });

      for (let left = 0; left < uniqueSenseGlosses.length; left += 1) {
        const leftGloss = uniqueSenseGlosses[left]!;
        const leftIndex = itemIndexByGloss.get(leftGloss);
        if (leftIndex == null) {
          continue;
        }

        for (
          let right = left + 1;
          right < uniqueSenseGlosses.length;
          right += 1
        ) {
          const rightGloss = uniqueSenseGlosses[right]!;
          const rightIndex = itemIndexByGloss.get(rightGloss);
          if (rightIndex == null) {
            continue;
          }

          matrix[leftIndex]![rightIndex]! += 1;
        }
      }
    }
  }

  return {
    items,
    matrix,
  };
}

export function createGlossOrderSortComparator(
  orderMatrix: SenseGlossOrderMatrixType,
  options: CreateGlossOrderSortComparatorOptionsType = {},
): (left: string, right: string) => number {
  const { items, matrix } = orderMatrix;
  const uniqueItemCount = new Set(items).size;
  if (uniqueItemCount !== items.length) {
    throw new Error(
      `gloss order matrix items must be unique; found duplicates in ${items.length} items`,
    );
  }

  if (matrix.length !== items.length) {
    throw new Error(
      `gloss order matrix row count (${matrix.length}) must equal item count (${items.length})`,
    );
  }

  for (const row of matrix) {
    if (row.length !== items.length) {
      throw new Error(
        `gloss order matrix must be square with each row length equal to item count (${items.length})`,
      );
    }
  }

  const itemIndexByGloss = new Map<string, number>(
    items.map((gloss, index) => [gloss, index]),
  );

  const fallbackOrder = options.fallbackOrder ?? items;
  const fallbackRankByGloss = new Map<string, number>(
    fallbackOrder.map((gloss, index) => [gloss, index]),
  );

  const scopeItems = options.scopeItems ?? items;
  const scopeIndexes = scopeItems
    .map((gloss) => itemIndexByGloss.get(gloss))
    .filter((index): index is number => index != null);

  const scopeSet = new Set<number>(scopeIndexes);
  const dominanceByIndex = new Map<number, number>();
  for (const rowIndex of scopeSet) {
    let score = 0;
    for (const colIndex of scopeSet) {
      if (rowIndex === colIndex) {
        continue;
      }

      score += matrix[rowIndex]![colIndex]! - matrix[colIndex]![rowIndex]!;
    }

    dominanceByIndex.set(rowIndex, score);
  }

  return (leftGloss, rightGloss) => {
    if (leftGloss === rightGloss) {
      return 0;
    }

    const leftIndex = itemIndexByGloss.get(leftGloss);
    const rightIndex = itemIndexByGloss.get(rightGloss);

    if (leftIndex != null && rightIndex != null) {
      const leftDominance = dominanceByIndex.get(leftIndex) ?? 0;
      const rightDominance = dominanceByIndex.get(rightIndex) ?? 0;
      if (leftDominance !== rightDominance) {
        return rightDominance - leftDominance;
      }

      const headToHead =
        matrix[leftIndex]![rightIndex]! - matrix[rightIndex]![leftIndex]!;
      if (headToHead !== 0) {
        return -headToHead;
      }
    } else if (leftIndex != null || rightIndex != null) {
      if (leftIndex == null) {
        return 1;
      }

      return -1;
    }

    const leftFallbackRank = fallbackRankByGloss.get(leftGloss);
    const rightFallbackRank = fallbackRankByGloss.get(rightGloss);
    if (leftFallbackRank != null && rightFallbackRank != null) {
      if (leftFallbackRank !== rightFallbackRank) {
        return leftFallbackRank - rightFallbackRank;
      }
    } else if (leftFallbackRank != null || rightFallbackRank != null) {
      if (leftFallbackRank == null) {
        return 1;
      }

      return -1;
    }

    return leftGloss.localeCompare(rightGloss);
  };
}

export function clusterGlossesFromAffinityMatrix(
  affinityMatrix: SenseGroupingAffinityMatrixType,
  options: ClusterGlossesFromAffinityMatrixOptionsType = {},
): ClusterGlossesFromAffinityMatrixResultType {
  const threshold = options.threshold ?? 0.6;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error(
      `cluster threshold must be a finite number between 0 and 1`,
    );
  }

  const { items, matrix } = affinityMatrix;
  const uniqueItemCount = new Set(items).size;
  if (uniqueItemCount !== items.length) {
    throw new Error(
      `affinity matrix items must be unique; found duplicates in ${items.length} items`,
    );
  }

  if (matrix.length !== items.length) {
    throw new Error(
      `affinity matrix row count (${matrix.length}) must equal item count (${items.length})`,
    );
  }

  for (const row of matrix) {
    if (row.length !== items.length) {
      throw new Error(
        `affinity matrix must be square with each row length equal to item count (${items.length})`,
      );
    }
  }

  if (items.length === 0) {
    return {
      clusters: [],
      reviewGlosses: [],
    };
  }

  const clusters: number[][] = items
    .map((_, index) => [index])
    .sort(compareClusterIndexes);

  while (clusters.length > 1) {
    let bestPair: [number, number] | null = null;
    let bestAffinity = -1;

    for (let i = 0; i < clusters.length; i += 1) {
      const clusterA = clusters[i]!;

      for (let j = i + 1; j < clusters.length; j += 1) {
        const clusterB = clusters[j]!;
        const affinity = computeCompleteLinkageAffinity(
          clusterA,
          clusterB,
          matrix,
        );

        if (bestPair == null || affinity > bestAffinity) {
          bestPair = [i, j];
          bestAffinity = affinity;
          continue;
        }

        if (
          affinity === bestAffinity &&
          compareClusterIndexesPair(
            [clusterA, clusterB],
            [clusters[bestPair[0]]!, clusters[bestPair[1]]!],
          ) < 0
        ) {
          bestPair = [i, j];
        }
      }
    }

    if (bestPair == null || bestAffinity < threshold) {
      break;
    }

    const [leftIndex, rightIndex] = bestPair;
    const mergedCluster = [
      ...clusters[leftIndex]!,
      ...clusters[rightIndex]!,
    ].sort((a, b) => a - b);

    const nextClusters = clusters.filter(
      (_, index) => index !== leftIndex && index !== rightIndex,
    );
    nextClusters.push(mergedCluster);
    nextClusters.sort(compareClusterIndexes);

    clusters.splice(0, clusters.length, ...nextClusters);
  }

  const expandedClusters = clusters.map((cluster) => [...cluster]);
  const clusterMembershipsByItem = new Map<number, number[]>();

  for (const [clusterIndex, cluster] of expandedClusters.entries()) {
    for (const itemIndex of cluster) {
      const memberships = clusterMembershipsByItem.get(itemIndex) ?? [];
      memberships.push(clusterIndex);
      clusterMembershipsByItem.set(itemIndex, memberships);
    }
  }

  for (const [itemIndex] of items.entries()) {
    for (const [clusterIndex, cluster] of expandedClusters.entries()) {
      if (cluster.includes(itemIndex)) {
        continue;
      }

      const affinity = computeCompleteLinkageAffinity(
        [itemIndex],
        cluster,
        matrix,
      );
      if (affinity < threshold) {
        continue;
      }

      cluster.push(itemIndex);

      const memberships = clusterMembershipsByItem.get(itemIndex) ?? [];
      memberships.push(clusterIndex);
      clusterMembershipsByItem.set(itemIndex, memberships);
    }
  }

  for (const cluster of expandedClusters) {
    cluster.sort((indexA, indexB) => {
      const strengthA = computeWithinClusterAffinityStrength(
        indexA,
        cluster,
        matrix,
      );
      const strengthB = computeWithinClusterAffinityStrength(
        indexB,
        cluster,
        matrix,
      );
      if (strengthA !== strengthB) {
        return strengthB - strengthA;
      }

      const glossA = items[indexA] ?? ``;
      const glossB = items[indexB] ?? ``;
      const lengthComparison = glossA.length - glossB.length;
      if (lengthComparison !== 0) {
        return lengthComparison;
      }

      const glossComparison = glossA.localeCompare(glossB);
      if (glossComparison !== 0) {
        return glossComparison;
      }

      return indexA - indexB;
    });
  }

  const clusteredGlosses = expandedClusters.map((cluster) =>
    cluster.map((index) => items[index]!),
  );

  const glossClusterAffinities = items.map((_, glossIndex) =>
    expandedClusters.map((cluster) =>
      clampConfidence(
        computeCompleteLinkageAffinity([glossIndex], cluster, matrix),
      ),
    ),
  );

  // Flag only orphaned glosses (single-item clusters) that showed partial
  // co-grouping with at least one other gloss.
  const reviewGlosses = items.flatMap((gloss, rowIndex) => {
    const memberships = clusterMembershipsByItem.get(rowIndex) ?? [];
    if (memberships.length !== 1) {
      return [];
    }

    const clusterIndex = memberships[0]!;
    const clusterSize = expandedClusters[clusterIndex]?.length ?? 0;
    if (clusterSize !== 1) {
      return [];
    }

    const shouldReview = matrix[rowIndex]!.some(
      (affinity, colIndex) =>
        rowIndex !== colIndex && affinity > 0 && affinity < 1,
    );
    if (!shouldReview) {
      return [];
    }

    return [
      {
        gloss,
        clusterAffinities: glossClusterAffinities[rowIndex]!,
      },
    ];
  });

  return {
    clusters: clusteredGlosses,
    reviewGlosses,
  };
}

function computeCompleteLinkageAffinity(
  clusterA: readonly number[],
  clusterB: readonly number[],
  matrix: readonly (readonly number[])[],
): number {
  let minAffinity = Number.POSITIVE_INFINITY;

  for (const indexA of clusterA) {
    for (const indexB of clusterB) {
      const affinity = matrix[indexA]?.[indexB] ?? 0;
      if (affinity < minAffinity) {
        minAffinity = affinity;
      }
    }
  }

  return minAffinity === Number.POSITIVE_INFINITY ? 0 : minAffinity;
}

function computeWithinClusterAffinityStrength(
  itemIndex: number,
  cluster: readonly number[],
  matrix: readonly (readonly number[])[],
): number {
  const peerIndexes = cluster.filter((index) => index !== itemIndex);
  if (peerIndexes.length === 0) {
    return 1;
  }

  const affinitySum = peerIndexes.reduce(
    (sum, peerIndex) => sum + (matrix[itemIndex]?.[peerIndex] ?? 0),
    0,
  );

  return clampConfidence(affinitySum / peerIndexes.length);
}

function compareClusterIndexes(
  clusterA: readonly number[],
  clusterB: readonly number[],
): number {
  const maxLength = Math.max(clusterA.length, clusterB.length);
  for (let i = 0; i < maxLength; i += 1) {
    const valueA = clusterA[i];
    const valueB = clusterB[i];
    if (valueA == null && valueB == null) {
      return 0;
    }

    if (valueA == null) {
      return -1;
    }

    if (valueB == null) {
      return 1;
    }

    if (valueA !== valueB) {
      return valueA - valueB;
    }
  }

  return 0;
}

function compareClusterIndexesPair(
  pairA: readonly [readonly number[], readonly number[]],
  pairB: readonly [readonly number[], readonly number[]],
): number {
  const leftComparison = compareClusterIndexes(pairA[0], pairB[0]);
  if (leftComparison !== 0) {
    return leftComparison;
  }

  return compareClusterIndexes(pairA[1], pairB[1]);
}

export function isLikelyOverSplitCedictEntry(
  entry: Pick<CedictV2EntryType, `senses`>,
): boolean {
  if (entry.senses.length === 1) {
    return false;
  }

  const parsedSenses = entry.senses.map((sense) => parseCedictV2Sense(sense));
  return parsedSenses.every((glosses) => glosses.length === 1);
}
