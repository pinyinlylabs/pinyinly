/**
 * @typedef {import('eslint').Rule.RuleContext} RuleContext
 * @typedef {import('eslint').Rule.Node} Node
 * @typedef {import('estree').Literal} Literal
 * @typedef {import('estree').TemplateLiteral} TemplateLiteral
 * @typedef {import('eslint').Rule.RuleModule} RuleModule
 */

/** @type {RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Restricts specific CSS classes in string literals.",
    },
    messages: {
      disallowedClass: 'CSS class "{{ className }}" is disallowed.',
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          classes: {
            type: "array",
            items: {
              anyOf: [
                { type: "string" },
                {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    message: { type: "string" },
                  },
                  required: ["name"],
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

  /**
   * @param {RuleContext} context
   */
  create(context) {
    const options = context.options[0] || {};
    // Support both string and object for classes
    /** @type {Array<{name: string, message?: string}>} */
    const classList = (options.classes || []).map(
      /** @param {any} item */
      (item) => (typeof item === "string" ? { name: item } : item),
    );
    const disallowedClasses = new Map(
      classList.map((c) => [c.name, c.message]),
    );

    /**
     * Remove disallowed classes from a class string
     * @param {string} value
     * @returns {string}
     */
    function removeDisallowedClasses(value) {
      return value
        .split(/\s+/)
        .filter((cls) => !disallowedClasses.has(cls))
        .join(" ");
    }

    /**
     * @param {string} value
     * @param {Literal | TemplateLiteral} node
     * @returns
     */
    function checkString(value, node) {
      const classNames = value.split(/\s+/);
      for (const className of classNames) {
        if (disallowedClasses.has(className)) {
          const customMessage = disallowedClasses.get(className);
          context.report({
            node,
            message:
              customMessage || `CSS class \"${className}\" is disallowed.`,
            fix: (fixer) => {
              // Only fix if the node is a string literal or a simple template literal
              if (node.type === "Literal" && typeof node.value === "string") {
                const fixed = removeDisallowedClasses(node.value);
                return fixer.replaceText(node, `"${escapeLiteral(fixed)}"`);
              }
              if (
                node.type === "TemplateLiteral" &&
                node.expressions.length === 0
              ) {
                const cooked = node.quasis.map((q) => q.value.cooked).join(" ");
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
      /**
       * @param {Literal} node
       */
      Literal(node) {
        if (typeof node.value !== "string") return;
        checkString(node.value, node);
      },
      /**
       * @param {TemplateLiteral} node
       */
      TemplateLiteral(node) {
        if (node.expressions.length === 0) {
          checkString(node.quasis.map((q) => q.value.cooked).join(" "), node);
        }
      },
    };
  },
};

/**
 * Escape backticks, ${, and backslashes for template literals
 *
 * @param {string} str
 */
function escapeLiteral(str) {
  return JSON.stringify(str).slice(1, -1);
}

/**
 * Escape backticks, ${, and backslashes for template literals
 *
 * @param {string} str
 */
function escapeTemplateLiteral(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

module.exports = rule;
