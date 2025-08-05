/**
 * @fileoverview Restricts specific CSS classes in string literals
 */

import type { Rule } from "eslint";
import type { Literal, TemplateLiteral } from "estree";

interface ClassConfig {
  name: string;
  message?: string;
}

interface NoRestrictedCssClassesOptions {
  classes?: (string | ClassConfig)[];
}

/**
 * Escape backticks, ${, and backslashes for template literals
 */
function escapeLiteral(str: string): string {
  return JSON.stringify(str).slice(1, -1);
}

/**
 * Escape backticks, ${, and backslashes for template literals
 */
function escapeTemplateLiteral(str: string): string {
  return str
    .replaceAll(`\\`, `\\\\`)
    .replaceAll(`\``, `\\\``)
    .replaceAll(`\${`, `\\\${`);
}

const rule: Rule.RuleModule = {
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

  create(context: Rule.RuleContext) {
    const options = (context.options[0] ?? {}) as NoRestrictedCssClassesOptions;
    // Support both string and object for classes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const classList: ClassConfig[] = (options.classes ?? []).map((item: any) =>
      typeof item === `string` ? { name: item } : item,
    );
    const disallowedClasses = new Map(
      classList.map((c) => [c.name, c.message]),
    );

    /**
     * Remove disallowed classes from a class string
     */
    function removeDisallowedClasses(value: string): string {
      return value
        .split(/\s+/)
        .filter((cls) => !disallowedClasses.has(cls))
        .join(` `);
    }

    function checkString(value: string, node: Literal | TemplateLiteral): void {
      const classNames = value.split(/\s+/);
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
      Literal(node: Literal) {
        if (typeof node.value !== `string`) {
          return;
        }
        checkString(node.value, node);
      },
      TemplateLiteral(node: TemplateLiteral) {
        if (node.expressions.length === 0) {
          checkString(node.quasis.map((q) => q.value.cooked).join(` `), node);
        }
      },
    };
  },
};

export { rule as noRestrictedCssClasses };
