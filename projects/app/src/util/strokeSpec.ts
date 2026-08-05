import { invariant } from "@pinyinly/lib/invariant";

export interface StrokeSpecStrokeBound {
  kind: `stroke`;
  stroke: number;
  occurrence: number;
}

export interface StrokeSpecPercentBound {
  kind: `percent`;
  percent: number;
}

export type StrokeSpecBound = StrokeSpecStrokeBound | StrokeSpecPercentBound;

export interface StrokeSpecRange {
  kind: `range`;
  start: number;
  end: number;
}

export interface StrokeSpecSlice {
  kind: `slice`;
  stroke: number;
  from: StrokeSpecBound | null;
  to: StrokeSpecBound | null;
}

export type StrokeSpecAtom = StrokeSpecRange | StrokeSpecSlice;

export interface StrokeSpecItem {
  kind: `item`;
  atoms: readonly StrokeSpecAtom[];
}

export interface StrokeSpec {
  kind: `list`;
  items: readonly StrokeSpecItem[];
}

function splitTopLevel(input: string, separator: string): string[] {
  const result: string[] = [];
  let bracketDepth = 0;
  let current = ``;

  for (const char of input) {
    if (char === `[`) {
      bracketDepth += 1;
      current += char;
      continue;
    }

    if (char === `]`) {
      bracketDepth -= 1;
      if (bracketDepth < 0) {
        throw new Error(`Unexpected closing bracket in stroke spec.`);
      }
      current += char;
      continue;
    }

    if (char === separator && bracketDepth === 0) {
      result.push(current.trim());
      current = ``;
      continue;
    }

    current += char;
  }

  if (bracketDepth !== 0) {
    throw new Error(`Unclosed bracket in stroke spec.`);
  }

  result.push(current.trim());
  return result;
}

function parseBound(text: string): StrokeSpecBound {
  const trimmed = text.trim();
  const percentMatch = /^(\d+(?:\.\d+)?)%$/u.exec(trimmed);
  if (percentMatch != null) {
    const percent = Number(percentMatch[1]);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error(
        `Invalid slice boundary ${JSON.stringify(text)}. Percent must be between 0% and 100%.`,
      );
    }

    return {
      kind: `percent`,
      percent,
    };
  }

  const boundMatch = /^(\d+)(?:#(\d+))?$/u.exec(trimmed);
  if (boundMatch == null) {
    throw new Error(
      `Invalid slice boundary ${JSON.stringify(text)}. Use N, N#occurrence, or P%.`,
    );
  }

  const stroke = Number(boundMatch[1]);
  const occurrence = Number(boundMatch[2] ?? `0`);

  return {
    kind: `stroke`,
    stroke,
    occurrence,
  };
}

function parseAtom(text: string): StrokeSpecAtom {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error(`Stroke spec tokens cannot be empty.`);
  }
  const compact = trimmed.replaceAll(/\s+/gu, ``);

  const sliceMatch = /^(\d+)\[([^\]]*)\]$/u.exec(compact);
  if (sliceMatch != null) {
    const stroke = Number(sliceMatch[1]);
    const body = sliceMatch[2] ?? ``;
    let colonCount = 0;
    for (const char of body) {
      if (char === `:`) {
        colonCount += 1;
      }
    }
    if (colonCount !== 1) {
      throw new Error(
        `Invalid slice ${JSON.stringify(trimmed)}. Use stroke[left:right].`,
      );
    }

    const [fromText, toText] = body.split(`:`);
    if (fromText == null || toText == null) {
      throw new Error(
        `Invalid slice ${JSON.stringify(trimmed)}. Use stroke[left:right].`,
      );
    }

    const from = fromText.trim().length === 0 ? null : parseBound(fromText);
    const to = toText.trim().length === 0 ? null : parseBound(toText);

    if (from == null && to == null) {
      return {
        kind: `range`,
        start: stroke,
        end: stroke,
      };
    }

    return {
      kind: `slice`,
      stroke,
      from,
      to,
    };
  }

  const rangeMatch = /^(\d+)(?:-(\d+))?$/u.exec(compact);
  if (rangeMatch == null) {
    throw new Error(
      `Invalid stroke token ${JSON.stringify(trimmed)}. Use N, N-M, or N[left:right].`,
    );
  }

  const start = Number(rangeMatch[1]);
  const end = Number(rangeMatch[2] ?? rangeMatch[1]);
  if (end < start) {
    throw new Error(
      `Range ${JSON.stringify(trimmed)} must be ascending (start <= end).`,
    );
  }

  return {
    kind: `range`,
    start,
    end,
  };
}

function formatBound(bound: StrokeSpecBound): string {
  if (bound.kind === `percent`) {
    return `${bound.percent}%`;
  }

  return bound.occurrence === 0
    ? `${bound.stroke}`
    : `${bound.stroke}#${bound.occurrence}`;
}

export function formatAtom(atom: StrokeSpecAtom): string {
  if (atom.kind === `range`) {
    return atom.start === atom.end
      ? `${atom.start}`
      : `${atom.start}-${atom.end}`;
  }

  const from = atom.from == null ? `` : formatBound(atom.from);
  const to = atom.to == null ? `` : formatBound(atom.to);
  return `${atom.stroke}[${from}:${to}]`;
}

export function parseStrokeSpec(specText: string): StrokeSpec {
  const trimmed = specText.trim();
  if (trimmed.length === 0) {
    return {
      kind: `list`,
      items: [],
    };
  }

  const itemTexts = splitTopLevel(trimmed, `,`);
  const items: StrokeSpecItem[] = [];

  for (const itemText of itemTexts) {
    if (itemText.length === 0) {
      throw new Error(`Stroke spec items cannot be empty.`);
    }

    const atomTexts = splitTopLevel(itemText, `+`);

    if (atomTexts.length === 0 || atomTexts.some((text) => text.length === 0)) {
      throw new Error(`Stroke spec items cannot be empty.`);
    }

    const atoms = atomTexts.map(parseAtom);
    items.push({
      kind: `item`,
      atoms,
    });
  }

  return {
    kind: `list`,
    items,
  };
}

export function formatStrokeSpec(spec: StrokeSpec): string {
  return spec.items
    .map((item) => item.atoms.map((atom) => formatAtom(atom)).join(`+`))
    .join(`,`);
}

export function normalizeStrokeSpec(specText: string): string {
  return formatStrokeSpec(parseStrokeSpec(specText));
}

export function strokeSpecItemCount(specText: string): number {
  return parseStrokeSpec(specText).items.length;
}

export function parseIndexRangesFromStrokeSpec(specText: string): number[] {
  const spec = parseStrokeSpec(specText);
  const result: number[] = [];

  for (const item of spec.items) {
    for (const atom of item.atoms) {
      if (atom.kind === `slice`) {
        throw new Error(
          `Cannot convert slice ${JSON.stringify(formatAtom(atom))} to numeric index ranges.`,
        );
      }

      for (let i = atom.start; i <= atom.end; i += 1) {
        result.push(i);
      }
    }
  }

  return result;
}

function cloneAtom(atom: StrokeSpecAtom): StrokeSpecAtom {
  if (atom.kind === `range`) {
    return {
      kind: `range`,
      start: atom.start,
      end: atom.end,
    };
  }

  return {
    kind: `slice`,
    stroke: atom.stroke,
    from: atom.from == null ? null : { ...atom.from },
    to: atom.to == null ? null : { ...atom.to },
  };
}

function cloneItem(item: StrokeSpecItem): StrokeSpecItem {
  return {
    kind: `item`,
    atoms: item.atoms.map(cloneAtom),
  };
}

function singletonRangeItem(index: number): StrokeSpecItem {
  return {
    kind: `item`,
    atoms: [{ kind: `range`, start: index, end: index }],
  };
}

function isSingleRangeAtom(item: StrokeSpecItem): item is {
  kind: `item`;
  atoms: readonly [StrokeSpecRange];
} {
  return item.atoms.length === 1 && item.atoms[0]?.kind === `range`;
}

function expandItemsToSlotBindings(spec: StrokeSpec): StrokeSpecItem[] {
  const result: StrokeSpecItem[] = [];

  for (const item of spec.items) {
    if (isSingleRangeAtom(item)) {
      const atom = item.atoms[0];
      for (let i = atom.start; i <= atom.end; i += 1) {
        result.push(singletonRangeItem(i));
      }
      continue;
    }

    result.push(cloneItem(item));
  }

  return result;
}

function itemReferencedSlotIndexes(item: StrokeSpecItem): number[] {
  const result: number[] = [];

  for (const atom of item.atoms) {
    if (atom.kind === `range`) {
      for (let i = atom.start; i <= atom.end; i += 1) {
        result.push(i);
      }
      continue;
    }

    result.push(atom.stroke);
  }

  return result;
}

function itemToText(item: StrokeSpecItem): string {
  return formatStrokeSpec({
    kind: `list`,
    items: [item],
  });
}

function parseItemText(itemText: string): StrokeSpecItem {
  const parsed = parseStrokeSpec(itemText);
  const item = parsed.items[0];
  if (parsed.items.length !== 1 || item == null) {
    throw new Error(`Expected a single StrokeSpec item.`);
  }
  return cloneItem(item);
}

export function strokeSpecToSlotBindings(specText: string): string[] {
  const spec = parseStrokeSpec(specText);
  return expandItemsToSlotBindings(spec).map(itemToText);
}

export function projectStrokeSpecThroughBindings({
  localStrokeSpec,
  sourceSlotBindingsInOriginal,
}: {
  localStrokeSpec: string;
  sourceSlotBindingsInOriginal: readonly string[] | null;
}): string[] {
  const localSpec = parseStrokeSpec(localStrokeSpec);
  const localItems = expandItemsToSlotBindings(localSpec);

  if (sourceSlotBindingsInOriginal == null) {
    return localItems.map(itemToText);
  }

  const projected: string[] = [];
  for (const localItem of localItems) {
    const referencedIndexes = itemReferencedSlotIndexes(localItem);
    const mappedItems = referencedIndexes
      .map((index) => sourceSlotBindingsInOriginal[index])
      .filter((item): item is string => item != null);

    if (mappedItems.length === 0) {
      continue;
    }

    if (mappedItems.length === 1) {
      const mappedItem = mappedItems[0];
      if (mappedItem != null) {
        projected.push(mappedItem);
      }
      continue;
    }

    const unionAtoms = mappedItems
      .flatMap((mappedItemText) => parseItemText(mappedItemText).atoms)
      .map(cloneAtom);
    projected.push(
      itemToText({
        kind: `item`,
        atoms: unionAtoms,
      }),
    );
  }

  return projected;
}

export function strokeSpecFilter(
  pathsByIndex: string[],
  pathsByAtom: Record<string, string>,
  strokeSpec: string,
): string[] {
  const result: string[] = [];

  const parsed = parseStrokeSpec(strokeSpec);

  for (const item of parsed.items) {
    for (const atom of item.atoms) {
      if (atom.kind === `range`) {
        for (let i = atom.start; i <= atom.end; i += 1) {
          const path = pathsByIndex[i];
          invariant(path != null, `Missing stoke path for index ${i}`);
          result.push(path);
        }
      } else {
        const atomKey = formatAtom(atom);
        const path = pathsByAtom[atomKey];
        invariant(path != null, `Missing segment path for atom ${atomKey}`);

        result.push(path);
      }
    }
  }

  return result;
}
