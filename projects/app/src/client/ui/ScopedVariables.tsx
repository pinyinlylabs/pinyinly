import type { PropsWithChildren } from "react";
import {
  // oxlint-disable-next-line eslint/no-restricted-imports -- This wrapper resolves var() references for native Uniwind.
  ScopedVariables as UniwindScopedVariables,
  useCSSVariable,
} from "uniwind";

type CSSVariables = Record<`--${string}`, string | number>;

export function ScopedVariables({
  children,
  variables,
}: PropsWithChildren<{ variables: CSSVariables }>) {
  const referencedVariableNames = [
    ...new Set(
      Object.values(variables).flatMap((value) =>
        typeof value === `string`
          ? [...value.matchAll(/var\(\s*(--[\w-]+)\s*\)/gu)].map(([, name]) => {
              return name ?? ``;
            })
          : [],
      ),
    ),
  ];
  const variableNames = referencedVariableNames.filter(
    (name) => !Object.hasOwn(variables, name),
  );

  if (variableNames.length === 0) {
    return (
      <UniwindScopedVariables variables={resolveReferences(variables, [], [])}>
        {children}
      </UniwindScopedVariables>
    );
  }

  return (
    <ResolveScopedVariables variables={variables} variableNames={variableNames}>
      {children}
    </ResolveScopedVariables>
  );
}

function ResolveScopedVariables({
  children,
  variables,
  variableNames,
}: PropsWithChildren<{
  variables: CSSVariables;
  variableNames: string[];
}>) {
  const variableValues = useCSSVariable(variableNames);
  if (!Array.isArray(variableValues)) {
    console.error(
      new Error(`Expected CSS variable values to be an array`),
      variableValues,
    );
    return (
      <UniwindScopedVariables variables={variables}>
        {children}
      </UniwindScopedVariables>
    );
  }
  return (
    <UniwindScopedVariables
      variables={resolveReferences(variables, variableNames, variableValues)}
    >
      {children}
    </UniwindScopedVariables>
  );
}

function resolveReferences(
  variables: CSSVariables,
  variableNames: string[],
  variableValues: Array<string | number | undefined>,
): CSSVariables {
  const scopedVariables = new Map(Object.entries(variables));
  return Object.fromEntries(
    Object.entries(variables).map(([name, value]) => [
      name,
      typeof value === `string` ? resolveValue(value) : value,
    ]),
  );

  function resolveValue(value: string): string {
    return value.replaceAll(
      /var\(\s*(--[\w-]+)\s*\)/gu,
      (match, reference: string) => {
        const localValue = scopedVariables.get(reference);
        if (localValue != null) {
          return resolveReplacement(String(localValue));
        }

        const referenceIndex = variableNames.indexOf(reference);
        if (referenceIndex === -1) {
          console.error(
            new Error(`Missing scoped variable reference "${reference}"`),
          );
          return match;
        }

        const inheritedValue = variableValues[referenceIndex];
        if (inheritedValue == null) {
          console.error(
            new Error(`Could not resolve CSS variable "${reference}"`),
          );
          return match;
        }
        return resolveReplacement(String(inheritedValue));
      },
    );

    function resolveReplacement(replacement: string) {
      return replacement.replaceAll(`var(`, (nestedReference) => {
        console.error(
          new Error(
            `Only direct CSS variable references are supported in scoped variable values`,
          ),
        );
        return nestedReference;
      });
    }
  }
}
