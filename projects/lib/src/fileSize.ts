const DECIMAL_UNIT_TO_MULTIPLIER = {
  b: 1,
  kb: 1000,
  mb: 1_000_000,
  gb: 1_000_000_000,
} as const;

const BINARY_UNIT_TO_MULTIPLIER = {
  b: 1,
  kib: 1024,
  mib: 1024 * 1024,
  gib: 1024 * 1024 * 1024,
} as const;

/**
 * Parse a human-readable file size into bytes.
 * Supports decimal units (kB, MB, GB) and binary IEC units (KiB, MiB, GiB).
 */
export function parseDecimalFileSize(input: string): number {
  const normalizedInput = input.trim();
  const match = /^(?<value>\d+(?:\.\d+)?)\s*(?<unit>(?:[kmg]i?)?b)$/i.exec(
    normalizedInput,
  );

  const valueText = match?.groups?.[`value`];
  const unitText = match?.groups?.[`unit`];

  if (valueText == null || unitText == null) {
    throw new Error(
      `Invalid file size "${input}". Expected formats like "250kB", "1MB", "500B", or "1MiB".`,
    );
  }

  const value = Number.parseFloat(valueText);
  const unitLower = unitText.toLowerCase();
  const isBinary = unitLower.includes(`i`);
  const multiplier = isBinary
    ? BINARY_UNIT_TO_MULTIPLIER[
        unitLower as keyof typeof BINARY_UNIT_TO_MULTIPLIER
      ]
    : DECIMAL_UNIT_TO_MULTIPLIER[
        unitLower as keyof typeof DECIMAL_UNIT_TO_MULTIPLIER
      ];

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid file size value in "${input}".`);
  }

  const bytes = Math.round(value * multiplier);

  if (!Number.isFinite(bytes)) {
    throw new TypeError(`Invalid file size value in "${input}".`);
  }

  return bytes;
}
