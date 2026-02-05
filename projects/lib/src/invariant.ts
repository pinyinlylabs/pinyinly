export class Invariant extends Error {
  constructor(message?: string) {
    super(message);
    this.name = `InvariantException`;
  }
}

/**
 * Assert an invariant or throw.
 *
 * @param condition
 * @param message An error message, allows `%s` placeholders.
 * @param args positional arguments for `%s` message placeholders
 */
export function invariant(
  condition: unknown,
  message?: string,
  ...args: unknown[]
): asserts condition {
   
  if (!condition) {
    message ??= `Invariant failed`;
    // Replace %s placeholders with provided arguments
    const unusedArgs: unknown[] = [];
    let argIndex = 0;
    message = message.replaceAll(`%s`, () => {
      if (argIndex < args.length) {
        const arg = args[argIndex++];
        return typeof arg === `string` ? arg : JSON.stringify(arg);
      }
      return `%s`;
    });

    // Collect any unused arguments
    for (let i = argIndex; i < args.length; i++) {
      unusedArgs.push(args[i]);
    }

    // Append unused arguments if any
    if (unusedArgs.length > 0) {
      message += ` (args: ${JSON.stringify(unusedArgs)})`;
    }

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
  ...args: unknown[]
): NonNullable<T> {
  invariant(value != null, message ?? `unexpected ${value} value`, ...args);
  return value;
}
