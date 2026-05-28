/**
 * Parses a Unihan definition string into an array of individual glosses.
 */
export interface UnihanDefinitionGlossType {
  labels: string[];
  gloss: string;
}

export function serializeUnihanDefinitionGloss(
  parsedGloss: UnihanDefinitionGlossType,
): string {
  const labelsText = parsedGloss.labels.map((label) => `{${label}}`).join(` `);
  if (labelsText.length === 0) {
    return parsedGloss.gloss;
  }

  if (parsedGloss.gloss.length === 0) {
    return labelsText;
  }

  return `${labelsText} ${parsedGloss.gloss}`;
}

export function parseUnihanDefinition(
  definition: string,
): UnihanDefinitionGlossType[][] {
  return splitOutsideParens(definition, `;`).map((sense) =>
    splitOutsideParens(sense, `,`).map((g) => parseUnihanGloss(g.trim())),
  );
}

function parseUnihanGloss(gloss: string): UnihanDefinitionGlossType {
  const labels: string[] = [];
  let rest = gloss.trim();

  for (;;) {
    if (!rest.startsWith(`(`)) {
      break;
    }

    const closeIndex = findClosingParenIndex(rest, 0);
    if (closeIndex <= 1) {
      break;
    }

    const label = rest.slice(1, closeIndex).trim();
    if (label.length === 0) {
      break;
    }

    labels.push(...parseUnihanLabelText(label));
    rest = rest.slice(closeIndex + 1).trimStart();
  }

  return {
    labels,
    gloss: rest,
  };
}

function parseUnihanLabelText(labelText: string): string[] {
  return splitOutsideParens(labelText, `;`)
    .map((label) => label.trim())
    .filter((label) => label.length > 0);
}

function findClosingParenIndex(text: string, startIndex: number): number {
  let depth = 0;

  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];
    if (char === `(`) {
      depth += 1;
    } else if (char === `)`) {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function splitOutsideParens(str: string, separator: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = ``;

  for (const char of str) {
    if (char === `(`) {
      depth++;
      current += char;
    } else if (char === `)`) {
      depth--;
      current += char;
    } else if (char === separator && depth === 0) {
      result.push(current);
      current = ``;
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}
