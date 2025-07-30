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

export function identicalInvariant<
  T extends string | number | null | undefined,
>(items: readonly T[]) {
  const identity = items[0];

  for (const item of items) {
    invariant(
      item === identity,
      `unexpected non-identical values ${item}, ${identity}`,
    );
  }
}

export function nonNullable<T>(
  value: T | null | undefined,
  message?: string,
): NonNullable<T> {
  invariant(value != null, message ?? `unexpected ${value} value`);
  return value;
}
