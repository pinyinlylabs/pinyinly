import type { StrokeSpecString } from "@/data/model";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";

export interface StrokeSpecStrokeBound {
  kind: `stroke`;
  stroke: number;
  occurrence: number;
}

export interface StrokeSpecPercentBound {
  kind: `percent`;
  percent: number;
}

export type StrokeSpecSliceBound =
  | StrokeSpecStrokeBound
  | StrokeSpecPercentBound;

export interface StrokeSpecRangeAtom {
  kind: `range`;
  start: number;
  end: number;
}

export interface StrokeSpecSliceAtom {
  kind: `slice`;
  stroke: number;
  from: StrokeSpecSliceBound | null;
  to: StrokeSpecSliceBound | null;
}

export type StrokeSpecAtom = StrokeSpecRangeAtom | StrokeSpecSliceAtom;

export type StrokeSpec = StrokeSpecAtom[][];

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

function parseBound(text: string): StrokeSpecSliceBound {
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

function formatSliceBound(bound: StrokeSpecSliceBound): string {
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

  if (atom.from == null && atom.to == null) {
    return `${atom.stroke}`;
  }

  const from = atom.from == null ? `` : formatSliceBound(atom.from);
  const to = atom.to == null ? `` : formatSliceBound(atom.to);
  return `${atom.stroke}[${from}:${to}]`;
}

export function parseStrokeSpec(specText: string): StrokeSpec {
  const trimmed = specText.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const itemTexts = splitTopLevel(trimmed, `,`);
  const items: StrokeSpecAtom[][] = [];

  for (const itemText of itemTexts) {
    if (itemText.length === 0) {
      throw new Error(`Stroke spec items cannot be empty.`);
    }

    const atomTexts = splitTopLevel(itemText, `+`);

    if (atomTexts.length === 0 || atomTexts.some((text) => text.length === 0)) {
      throw new Error(`Stroke spec items cannot be empty.`);
    }

    items.push(atomTexts.map(parseAtom));
  }

  return items;
}

export function formatStrokeSpec(spec: StrokeSpec): StrokeSpecString {
  return spec
    .map((item) => item.map((atom) => formatAtom(atom)).join(`+`))
    .join(`,`) as StrokeSpecString;
}

export function normalizeStrokeSpec(
  specText: StrokeSpecString,
): StrokeSpecString {
  return formatStrokeSpec(parseStrokeSpec(specText));
}

export function parseIndexRangesFromStrokeSpec(
  specText: StrokeSpecString,
): number[] {
  const spec = parseStrokeSpec(specText);
  const result: number[] = [];

  for (const item of spec) {
    for (const atom of item) {
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

/**
 * Maps a stroke spec from a source context to a destination context, based on
 * the provided source and destination stroke specs.
 *
 * e.g. `mapStrokeSpec("0,3", "1,0")` returns `"3,0"`.
 */
export function mapStrokeSpec(
  src: StrokeSpecString,
  dest: StrokeSpecString,
): StrokeSpecString | null {
  const srcSpec = flattenStrokeSpecRanges(parseStrokeSpec(src));
  const destSpec = flattenStrokeSpecRanges(parseStrokeSpec(dest));

  if (srcSpec.length !== destSpec.length) {
    return null;
  }

  const result: StrokeSpec = [];

  for (const item of destSpec) {
    const newItem: StrokeSpecAtom[] = [];
    for (const atom of item) {
      invariant(
        atom.kind !== `range`,
        `ranges should have been flattened away`,
      );
      const slice = atom;

      const x = nonNullable(srcSpec.at(slice.stroke));

      if (slice.from != null || slice.to != null) {
        // Sliced atoms cannot be mapped because they depend on the source
        // context.
        return null;
      }

      newItem.push(...x);
    }
    result.push(newItem);
  }

  return formatStrokeSpec(result);
}

export function flattenStrokeSpecRanges(spec: StrokeSpec): StrokeSpec {
  const result = [];

  for (const item of spec) {
    if (item.length === 1 && item[0]?.kind === `range`) {
      for (let i = item[0].start; i <= item[0].end; i++) {
        result.push([
          {
            kind: `slice`,
            stroke: i,
            from: null,
            to: null,
          } satisfies StrokeSpecSliceAtom,
        ]);
      }
    } else {
      result.push(item);
    }
  }

  return result;
}

export function strokeSpecFilter(
  pathsByIndex: string[],
  pathsByAtom: Record<string, string>,
  strokeSpec: string,
): string[] {
  const result: string[] = [];

  const parsed = parseStrokeSpec(strokeSpec);

  for (const item of parsed) {
    for (const atom of item) {
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
