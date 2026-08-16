/**
 * @fileoverview Restricts specific CSS classes in string literals
 */

import type { CreateOnceRule, ESTree } from "@oxlint/plugins";

interface ClassConfig {
  name: string;
  message?: string;
}

interface NoRestrictedCssClassesOptions {
  classes?: (string | ClassConfig)[];
}

type LiteralNode =
  | ESTree.BooleanLiteral
  | ESTree.NullLiteral
  | ESTree.NumericLiteral
  | ESTree.StringLiteral
  | ESTree.BigIntLiteral
  | ESTree.RegExpLiteral;

/**
 * Escape backticks, ${, and backslashes for template literals
 */
function escapeLiteral(string_: string): string {
  return JSON.stringify(string_).slice(1, -1);
}

/**
 * Escape backticks, ${, and backslashes for template literals
 */
function escapeTemplateLiteral(string_: string): string {
  return string_
    .replaceAll(`\\`, `\\\\`)
    .replaceAll(`\``, `\\\``)
    .replaceAll(`\${`, `\\\${`);
}

const rule: CreateOnceRule = {
  meta: {
    type: `problem`,
    docs: {
      description: `Restricts specific CSS classes in string literals.`,
    },
    messages: {
      disallowedClass: `CSS class "{{ className }}" is disallowed.`,
    },
    fixable: `code`,
    schema: [
      {
        type: `object`,
        properties: {
          classes: {
            type: `array`,
            items: {
              anyOf: [
                { type: `string` },
                {
                  type: `object`,
                  properties: {
                    name: { type: `string` },
                    message: { type: `string` },
                  },
                  required: [`name`],
                  additionalProperties: false,
                },
              ],
            },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },

  createOnce(context) {
    // `context.options` is only populated once the file starts linting, so
    // rebuild the disallowed classes map in `before()` rather than here.
    let disallowedClasses = new Map<string, string | undefined>();

    /**
     * Remove disallowed classes from a class string
     */
    function removeDisallowedClasses(value: string): string {
      return value
        .split(/\s+/u)
        .filter((cls) => !disallowedClasses.has(cls))
        .join(` `);
    }

    function checkString(
      value: string,
      node: LiteralNode | ESTree.TemplateLiteral,
    ): void {
      const classNames = value.split(/\s+/u);
      for (const className of classNames) {
        if (disallowedClasses.has(className)) {
          const customMessage = disallowedClasses.get(className);
          context.report({
            node,
            message: customMessage ?? `CSS class "${className}" is disallowed.`,
            fix: (fixer) => {
              // Only fix if the node is a string literal or a simple template literal
              if (node.type === `Literal` && typeof node.value === `string`) {
                const fixed = removeDisallowedClasses(node.value);
                return fixer.replaceText(node, `"${escapeLiteral(fixed)}"`);
              }
              if (
                node.type === `TemplateLiteral` &&
                node.expressions.length === 0
              ) {
                const cooked = node.quasis.map((q) => q.value.cooked).join(` `);
                const fixed = removeDisallowedClasses(cooked);
                return fixer.replaceText(
                  node,
                  `\`${escapeTemplateLiteral(fixed)}\``,
                );
              }
              return null;
            },
          });
        }
      }
    }

    return {
      before() {
        // Types claim `context.options` is never nullish, but it is `null` here at runtime.
        // oxlint-disable-next-line typescript/no-unnecessary-condition
        const options = (context.options?.[0] ??
          {}) as NoRestrictedCssClassesOptions;
        // Support both string and object for classes
        const classList: ClassConfig[] = (options.classes ?? []).map((item) =>
          typeof item === `string` ? { name: item } : item,
        );
        disallowedClasses = new Map(classList.map((c) => [c.name, c.message]));
      },
      Literal(node) {
        if (typeof node.value !== `string`) {
          return;
        }
        checkString(node.value, node);
      },
      TemplateLiteral(node) {
        if (node.expressions.length === 0) {
          checkString(node.quasis.map((q) => q.value.cooked).join(` `), node);
        }
      },
    };
  },
};

export { rule as noRestrictedCssClasses };
