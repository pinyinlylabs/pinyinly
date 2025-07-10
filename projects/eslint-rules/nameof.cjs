/**
 * @f * @example
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
 * // Invalid
 * 'WrongName' as NameOf<typeof MyClass>  // should be 'MyClass'
 * "WrongName" as NameOf<MyInterface>     // should be "MyInterface"
 * `WrongName` as NameOf<MyType>          // should be `MyType`
 * 'anything' as NameOf<boolean>          // should be `boolean`
 * 'WrongName' satisfies NameOf<typeof MyClass>  // should be 'MyClass' rule to validate string type casts with NameOf match their type arguments
 *
 * This rule validates that type casts like "string" as NameOf<typeof Symbol> or "string" as NameOf<TypeName>
 * have a string that matches the symbol name in the generic type argument.
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
 * // Valid - using type name directly (including built-in types)
 * `MyInterface` as NameOf<MyInterface>
 * "MyType" as NameOf<MyType>
 * 'MyComponent' as NameOf<MyComponent>
 * `boolean` as NameOf<boolean>
 * `string` as NameOf<string>
 *
 * // Invalid
 * 'WrongName' as NameOf<typeof MyClass>  // should be 'MyClass'
 * "WrongName" as NameOf<MyInterface>     // should be "MyInterface"
 * `WrongName` as NameOf<MyType>          // should be `MyType`
 * 'anything' as NameOf<boolean>          // should be `boolean`
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
        "Validates that string type casts with NameOf (using 'as' or 'satisfies') match their generic type arguments",
      recommended: true,
    },
    messages: {
      mismatch:
        'String "{{ actual }}" should be "{{ expected }}" to match the symbol name in the NameOf type argument.',
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
     * Gets the generic type argument text from a NameOf type reference
     * @param {string} typeAnnotationText - The text of the type annotation
     * @returns {string|null} The generic type text or null if not found
     */
    function getNameOfTypeText(typeAnnotationText) {
      // Look for NameOf<...> pattern
      const nameOfMatch = typeAnnotationText.match(/NameOf\s*<([^>]+)>/);
      if (!nameOfMatch) {
        return null;
      }

      return nameOfMatch[1]?.trim() || null;
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

        // Check if it's a NameOf type
        const nameOfTypeText = getNameOfTypeText(typeAnnotationText);
        if (!nameOfTypeText) {
          return;
        }

        // Extract the symbol name from the NameOf type argument
        const expectedSymbolName = extractSymbolName(nameOfTypeText);
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

        // Check if the string matches the symbol name
        if (actualString !== expectedSymbolName) {
          context.report({
            node: expression,
            messageId: "mismatch",
            data: {
              actual: String(actualString),
              expected: expectedSymbolName,
            },
            fix(fixer) {
              // Preserve the original quote style when possible
              let replacement;
              if (expression.type === "TemplateLiteral") {
                replacement = `\`${expectedSymbolName}\``;
              } else if (expression.type === "Literal") {
                const originalText = sourceCode.getText(expression);
                if (originalText.startsWith('"')) {
                  replacement = `"${expectedSymbolName}"`;
                } else {
                  replacement = `'${expectedSymbolName}'`;
                }
              } else {
                replacement = `\`${expectedSymbolName}\``;
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
