export interface ParsedHintText {
  hint: string;
  description: string | null;
}

function normalizeHintText(value: string): string {
  return value.replaceAll(`\r\n`, `\n`).trim();
}

export function parseHintText(
  value: string | null | undefined,
): ParsedHintText {
  const normalized = normalizeHintText(value ?? ``);
  if (normalized.length === 0) {
    return {
      hint: ``,
      description: null,
    };
  }

  const descriptionSeparatorIndex = normalized.indexOf(`\n\n`);
  if (descriptionSeparatorIndex === -1) {
    return {
      hint: normalized,
      description: null,
    };
  }

  const hint = normalized.slice(0, descriptionSeparatorIndex).trim();
  const description = normalized.slice(descriptionSeparatorIndex + 2).trim();

  return {
    hint,
    description: description.length > 0 ? description : null,
  };
}

export function composeHintText(
  hint: string | null | undefined,
  description: string | null | undefined,
): string | null {
  const normalizedHint = normalizeHintText(hint ?? ``);
  const normalizedDescription = normalizeHintText(description ?? ``);

  if (normalizedHint.length === 0 && normalizedDescription.length === 0) {
    return null;
  }

  if (normalizedHint.length === 0) {
    return normalizedDescription;
  }

  if (normalizedDescription.length === 0) {
    return normalizedHint;
  }

  return `${normalizedHint}\n\n${normalizedDescription}`;
}

export function hintFirstLineLength(value: string): number {
  const normalized = value.replaceAll(`\r\n`, `\n`);
  const firstLine = normalized.split(`\n`)[0] ?? ``;
  return firstLine.trim().length;
}
