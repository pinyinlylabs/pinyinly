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

export function uniqueInvariant<T extends string>(choices: readonly T[]) {
  const seen = new Set<T>();

  for (const choice of choices) {
    invariant(!seen.has(choice), `duplicate choice ${choice}`);
    seen.add(choice);
  }
}
