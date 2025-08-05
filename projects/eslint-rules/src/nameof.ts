/**
 * @fileoverview ESLint rule to validate string type casts with NameOf and HasNameOf match their type arguments
 *
 * This rule validates that type casts like "string" as NameOf<typeof Symbol> or "string" as NameOf<TypeName>
 * have a string that matches the symbol name in the generic type argument.
 *
 * Also supports HasNameOf<> which checks that the string contains the symbol name somewhere within it.
 *
 * Supports all string literal types: single quotes, double quotes, and template literals (backticks).
 * Template literals with expressions are ignored.
 *
 * @example
 * // Valid - using typeof with different quote styles (backticks preferred)
 * `MyClass` as NameOf<typeof MyClass>
 * 'MyClass' as NameOf<typeof MyClass>
 * "MyClass" as NameOf<typeof MyClass>
 *
 * // Valid - using satisfies syntax
 * 'MyClass' satisfies NameOf<typeof MyClass>
 * "MyInterface" satisfies NameOf<MyInterface>
 * `MyType` satisfies NameOf<MyType>
 *
 * // Valid - using type name directly (including built-in types)
 * `MyInterface` as NameOf<MyInterface>
 * "MyType" as NameOf<MyType>
 * 'MyComponent' as NameOf<MyComponent>
 * `boolean` as NameOf<boolean>
 * `string` as NameOf<string>
 *
 * // Valid - using HasNameOf (string contains the symbol name)
 * 'MyClass suite' satisfies HasNameOf<typeof MyClass>
 * "Testing MyFunction behavior" satisfies HasNameOf<typeof MyFunction>
 * `MyInterface tests` satisfies HasNameOf<MyInterface>
 *
 * // Invalid
 * 'WrongName' as NameOf<typeof MyClass>  // should be 'MyClass'
 * "WrongName" as NameOf<MyInterface>     // should be "MyInterface"
 * `WrongName` as NameOf<MyType>          // should be `MyType`
 * 'anything' as NameOf<boolean>          // should be `boolean`
 * 'WrongName satisfies NameOf<typeof MyClass>  // should be 'MyClass'
 * 'Wrong suite' satisfies HasNameOf<typeof MyClass>  // should contain 'MyClass'
 */

import type { Rule } from "eslint";

type QuoteStyle = `single` | `double` | `template`;

interface NameOfTypeResult {
  typeText: string | null;
  isHasNameOf: boolean;
}

/**
 * Extracts the symbol name from a type expression
 */
function extractSymbolName(typeText: string): string | null {
  // Match patterns like "typeof Symbol" and extract "Symbol"
  const typeofMatch = /typeof\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/.exec(typeText);
  if (typeofMatch?.[1] !== undefined) {
    return typeofMatch[1];
  }

  // Match patterns like "MyInterface" or "MyClass" (just the type name)
  const typeMatch = /^([a-zA-Z_$][a-zA-Z0-9_$]*)$/.exec(typeText);
  if (typeMatch?.[1] !== undefined) {
    return typeMatch[1];
  }

  return null;
}

/**
 * Gets the generic type argument text from a NameOf or HasNameOf type reference
 */
function getNameOfTypeText(typeAnnotationText: string): NameOfTypeResult {
  // Look for HasNameOf<...> pattern first
  const hasNameOfMatch = /HasNameOf\s*<([^>]+)>/.exec(typeAnnotationText);
  if (hasNameOfMatch) {
    return {
      typeText: hasNameOfMatch[1]?.trim() ?? null,
      isHasNameOf: true,
    };
  }

  // Look for NameOf<...> pattern
  const nameOfMatch = /NameOf\s*<([^>]+)>/.exec(typeAnnotationText);
  if (nameOfMatch) {
    return {
      typeText: nameOfMatch[1]?.trim() ?? null,
      isHasNameOf: false,
    };
  }

  return {
    typeText: null,
    isHasNameOf: false,
  };
}

/**
 * Determines the quote style used in an expression
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getQuoteStyle(expression: any, sourceCode: any): QuoteStyle {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (expression.type === `TemplateLiteral`) {
    return `template`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  } else if (expression.type === `Literal`) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const originalText: string = sourceCode.getText(expression);
    return originalText.startsWith(`"`) ? `double` : `single`;
  }
  return `template`; // default fallback
}

/**
 * Formats a string with the appropriate quote style
 */
function formatWithQuotes(text: string, quoteStyle: QuoteStyle): string {
  switch (quoteStyle) {
    case `double`: {
      return `"${text}"`;
    }
    case `single`: {
      return `'${text}'`;
    }
    case `template`: {
      return `\`${text}\``;
    }
    default: {
      return `\`${text}\``;
    }
  }
}

const rule: Rule.RuleModule = {
  meta: {
    type: `problem`,
    docs: {
      description: `Validates that string type casts with NameOf or HasNameOf (using 'as' or 'satisfies') match their generic type arguments`,
      recommended: true,
    },
    messages: {
      mismatch: `String "{{ actual }}" should be "{{ expected }}" to match the symbol name in the NameOf type argument.`,
      hasNameOfMismatch: `String "{{ actual }}" should contain "{{ expected }}" to match the symbol name in the HasNameOf type argument.`,
    },
    fixable: `code`,
    schema: [],
  },

  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "TSTypeAssertion, TSAsExpression, TSSatisfiesExpression"(node: any) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (node.typeAnnotation === undefined) {
          return;
        }

        // Get the type annotation text
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        const typeAnnotationText = sourceCode.getText(node.typeAnnotation);

        // Check if it's a NameOf or HasNameOf type
        const nameOfResult = getNameOfTypeText(typeAnnotationText);
        if (nameOfResult.typeText === null) {
          return;
        }

        // Extract the symbol name from the type argument
        const expectedSymbolName = extractSymbolName(nameOfResult.typeText);
        if (expectedSymbolName === null) {
          return;
        }

        // Check if the expression is a string literal
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const expression = node.expression;
        let actualString: string | null = null;
        let isValidStringExpr = false;

        if (
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          expression.type === `Literal` &&
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          typeof expression.value === `string`
        ) {
          // Handle regular string literals (single and double quotes)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          actualString = expression.value as string;
          isValidStringExpr = true;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        } else if (expression.type === `TemplateLiteral`) {
          // Handle template literals (backticks) - only if they have no expressions
          // eslint-disable-next-line unicorn/no-lonely-if
          if (
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            expression.expressions.length === 0 &&
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            expression.quasis.length === 1 &&
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            expression.quasis[0] !== undefined
          ) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const quasi = expression.quasis[0];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            actualString = quasi.value.cooked ?? quasi.value.raw ?? ``;
            isValidStringExpr = true;
          }
        }

        if (!isValidStringExpr || actualString === null) {
          return;
        }

        // Check if the string matches the expected pattern
        const isValid = nameOfResult.isHasNameOf
          ? actualString.includes(expectedSymbolName) // For HasNameOf, check if the string contains the symbol name
          : actualString === expectedSymbolName; // For NameOf, check if the string exactly matches the symbol name

        if (!isValid) {
          const messageId = nameOfResult.isHasNameOf
            ? `hasNameOfMismatch`
            : `mismatch`;

          context.report({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            node: expression,
            messageId,
            data: {
              actual: String(actualString),
              expected: expectedSymbolName,
            },
            fix(fixer) {
              // Generate replacement based on the type
              let replacement: string;
              const quoteStyle = getQuoteStyle(expression, sourceCode);

              if (nameOfResult.isHasNameOf) {
                // For HasNameOf, try to preserve as much of the original string as possible
                // If the string is empty, just use the symbol name
                if (actualString === ``) {
                  replacement = formatWithQuotes(
                    expectedSymbolName,
                    quoteStyle,
                  );
                } else {
                  // Try to intelligently insert the symbol name
                  const words = actualString
                    .split(/\s+/)
                    .filter((word: string) => word.length > 0);

                  // Words that should be preserved (test-related words)
                  const preserveWords = new Set([
                    `test`,
                    `tests`,
                    `testing`,
                    `suite`,
                    `cases`,
                    `behavior`,
                    `functionality`,
                    `else`,
                  ]);
                  // Generic words that are good candidates for replacement
                  const replaceWords = new Set([
                    `something`,
                    `anything`,
                    `wrong`,
                    `wrongname`,
                    `different`,
                    `incorrect`,
                  ]);

                  let replaced = false;

                  // First, try to replace specific generic words
                  for (let i = 0; i < words.length; i++) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    if (replaceWords.has(words[i]!.toLowerCase())) {
                      words[i] = expectedSymbolName;
                      replaced = true;
                      break;
                    }
                  }

                  // If no generic word found, replace the first non-preserve word
                  if (!replaced) {
                    for (let i = 0; i < words.length; i++) {
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      if (!preserveWords.has(words[i]!.toLowerCase())) {
                        words[i] = expectedSymbolName;
                        replaced = true;
                        break;
                      }
                    }
                  }

                  // If still not replaced, just prepend the symbol name
                  if (!replaced) {
                    words.unshift(expectedSymbolName);
                  }

                  replacement = formatWithQuotes(words.join(` `), quoteStyle);
                }
              } else {
                // For NameOf, replace with exact symbol name
                replacement = formatWithQuotes(expectedSymbolName, quoteStyle);
              }

              return fixer.replaceText(expression, replacement);
            },
          });
        }
      },
    };
  },
};

export { rule as nameof };
