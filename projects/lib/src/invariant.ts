export class Invariant extends Error {
  constructor(message?: string) {
    super(message);
    this.name = `InvariantException`;
  }
}

export function invariant(
  condition: unknown,
  message?: string,
): asserts condition {
  if (!condition) {
    throw new Invariant(message);
  }
}

export function uniqueInvariant<T extends string | number>(
  items: readonly T[],
) {
  const seen = new Set<T>();

  for (const item of items) {
    invariant(!seen.has(item), `non-unique item ${item}`);
    seen.add(item);
  }
}

export function identicalInvariant<T extends string | number>(
  items: readonly T[],
) {
  const identity = items[0];

  for (const item of items) {
    invariant(item === identity, `unexpected unique value ${item}`);
  }
}
