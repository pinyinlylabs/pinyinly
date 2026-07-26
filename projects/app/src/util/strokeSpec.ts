export interface StrokeSpecBound {
  stroke: number;
  occurrence: number;
}

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
  const boundMatch = /^(\d+)(?:#(\d+))?$/u.exec(text.trim());
  if (boundMatch == null) {
    throw new Error(
      `Invalid slice boundary ${JSON.stringify(text)}. Use N or N#occurrence.`,
    );
  }

  const stroke = Number(boundMatch[1]);
  const occurrence = Number(boundMatch[2] ?? `0`);

  return { stroke, occurrence };
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
  return bound.occurrence === 0
    ? `${bound.stroke}`
    : `${bound.stroke}#${bound.occurrence}`;
}

function formatAtom(atom: StrokeSpecAtom): string {
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
