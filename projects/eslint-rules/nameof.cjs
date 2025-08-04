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
 *
 * @typedef {import('eslint').Rule.RuleContext} RuleContext
 * @typedef {import('eslint').Rule.Node} Node
 * @typedef {import('estree').CallExpression} CallExpression
 * @typedef {import('estree').Identifier} Identifier
 * @typedef {import('estree').Literal} Literal
 * @typedef {import('eslint').Rule.RuleModule} RuleModule
 */

/** @type {RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Validates that string type casts with NameOf or HasNameOf (using 'as' or 'satisfies') match their generic type arguments",
      recommended: true,
    },
    messages: {
      mismatch:
        'String "{{ actual }}" should be "{{ expected }}" to match the symbol name in the NameOf type argument.',
      hasNameOfMismatch:
        'String "{{ actual }}" should contain "{{ expected }}" to match the symbol name in the HasNameOf type argument.',
    },
    fixable: "code",
    schema: [],
  },

  /**
   * @param {RuleContext} context
   */
  create(context) {
    const sourceCode = context.getSourceCode();

    /**
     * Extracts the symbol name from a type expression
     * @param {string} typeText - The text of the type expression
     * @returns {string|null} The symbol name or null if not found
     */
    function extractSymbolName(typeText) {
      // Match patterns like "typeof Symbol" and extract "Symbol"
      const typeofMatch = typeText.match(/typeof\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (typeofMatch && typeofMatch[1]) {
        return typeofMatch[1];
      }

      // Match patterns like "MyInterface" or "MyClass" (just the type name)
      const typeMatch = typeText.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)$/);
      if (typeMatch && typeMatch[1]) {
        const typeName = typeMatch[1];
        return typeName;
      }

      return null;
    }

    /**
     * Gets the generic type argument text from a NameOf or HasNameOf type reference
     * @param {string} typeAnnotationText - The text of the type annotation
     * @returns {{typeText: string|null, isHasNameOf: boolean}} The generic type text and whether it's HasNameOf
     */
    function getNameOfTypeText(typeAnnotationText) {
      // Look for HasNameOf<...> pattern first
      const hasNameOfMatch = typeAnnotationText.match(/HasNameOf\s*<([^>]+)>/);
      if (hasNameOfMatch) {
        return {
          typeText: hasNameOfMatch[1]?.trim() || null,
          isHasNameOf: true,
        };
      }

      // Look for NameOf<...> pattern
      const nameOfMatch = typeAnnotationText.match(/NameOf\s*<([^>]+)>/);
      if (nameOfMatch) {
        return {
          typeText: nameOfMatch[1]?.trim() || null,
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
     * @param {any} expression - The expression node
     * @param {any} sourceCode - The source code object
     * @returns {'single'|'double'|'template'} The quote style
     */
    function getQuoteStyle(expression, sourceCode) {
      if (expression.type === "TemplateLiteral") {
        return "template";
      } else if (expression.type === "Literal") {
        const originalText = sourceCode.getText(expression);
        if (originalText.startsWith('"')) {
          return "double";
        } else {
          return "single";
        }
      }
      return "template"; // default fallback
    }

    /**
     * Formats a string with the appropriate quote style
     * @param {string} text - The text to quote
     * @param {'single'|'double'|'template'} quoteStyle - The quote style to use
     * @returns {string} The quoted string
     */
    function formatWithQuotes(text, quoteStyle) {
      switch (quoteStyle) {
        case "double":
          return `"${text}"`;
        case "single":
          return `'${text}'`;
        case "template":
          return `\`${text}\``;
        default:
          return `\`${text}\``;
      }
    }

    return {
      /**
       * @param {any} node - TSTypeAssertion, TSAsExpression, or TSSatisfiesExpression node
       */
      "TSTypeAssertion, TSAsExpression, TSSatisfiesExpression"(node) {
        // Check if this is a type assertion/satisfies expression with NameOf
        if (!node.typeAnnotation) {
          return;
        }

        // Get the type annotation text
        const typeAnnotationText = sourceCode.getText(node.typeAnnotation);

        // Check if it's a NameOf or HasNameOf type
        const nameOfResult = getNameOfTypeText(typeAnnotationText);
        if (!nameOfResult.typeText) {
          return;
        }

        // Extract the symbol name from the type argument
        const expectedSymbolName = extractSymbolName(nameOfResult.typeText);
        if (!expectedSymbolName) {
          return;
        }

        // Check if the expression is a string literal
        const expression = node.expression;
        let actualString = null;
        let isValidStringExpr = false;

        if (
          expression.type === "Literal" &&
          typeof expression.value === "string"
        ) {
          // Handle regular string literals (single and double quotes)
          actualString = expression.value;
          isValidStringExpr = true;
        } else if (expression.type === "TemplateLiteral") {
          // Handle template literals (backticks) - only if they have no expressions
          if (
            expression.expressions.length === 0 &&
            expression.quasis.length === 1 &&
            expression.quasis[0]
          ) {
            const quasi = expression.quasis[0];
            actualString = quasi.value.cooked || quasi.value.raw || "";
            isValidStringExpr = true;
          }
        }

        if (!isValidStringExpr || actualString === null) {
          return;
        }

        // Check if the string matches the expected pattern
        let isValid = false;
        if (nameOfResult.isHasNameOf) {
          // For HasNameOf, check if the string contains the symbol name
          isValid = actualString.includes(expectedSymbolName);
        } else {
          // For NameOf, check if the string exactly matches the symbol name
          isValid = actualString === expectedSymbolName;
        }

        if (!isValid) {
          const messageId = nameOfResult.isHasNameOf
            ? "hasNameOfMismatch"
            : "mismatch";

          context.report({
            node: expression,
            messageId,
            data: {
              actual: String(actualString),
              expected: expectedSymbolName,
            },
            fix(fixer) {
              // Generate replacement based on the type
              let replacement;
              const quoteStyle = getQuoteStyle(expression, sourceCode);

              if (nameOfResult.isHasNameOf) {
                // For HasNameOf, try to preserve as much of the original string as possible
                // If the string is empty, just use the symbol name
                if (actualString === "") {
                  replacement = formatWithQuotes(
                    expectedSymbolName,
                    quoteStyle,
                  );
                } else {
                  // Try to intelligently insert the symbol name
                  const words = actualString
                    .split(/\s+/)
                    .filter(
                      /** @param {string} word */ (word) => word.length > 0,
                    );

                  // Words that should be preserved (test-related words)
                  const preserveWords = [
                    "test",
                    "tests",
                    "testing",
                    "suite",
                    "cases",
                    "behavior",
                    "functionality",
                    "else",
                  ];
                  // Generic words that are good candidates for replacement
                  const replaceWords = [
                    "something",
                    "anything",
                    "wrong",
                    "wrongname",
                    "different",
                    "incorrect",
                  ];

                  let replaced = false;

                  // First, try to replace specific generic words
                  for (let i = 0; i < words.length; i++) {
                    if (replaceWords.includes(words[i].toLowerCase())) {
                      words[i] = expectedSymbolName;
                      replaced = true;
                      break;
                    }
                  }

                  // If no generic word found, replace the first non-preserve word
                  if (!replaced) {
                    for (let i = 0; i < words.length; i++) {
                      if (!preserveWords.includes(words[i].toLowerCase())) {
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

                  replacement = formatWithQuotes(words.join(" "), quoteStyle);
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

module.exports = rule;
