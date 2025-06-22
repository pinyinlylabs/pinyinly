/**
 * @fileoverview Rewrite import paths based on patterns
 *
 * This rule allows rewriting import paths that match specified regex patterns,
 * particularly useful for converting package imports (hash prefix paths) to path aliases (@ prefix).
 *
 * @example
 *
 * Rewrite hash-prefixed imports to @ prefixed imports:
 *
 * { "import-path-rewrite": ["error", {
 *   "patterns": [
 *     { "from": "^#(.+)\\.ts$", "to": "@/$1" }
 *   ]
 * }] }
 */

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Rewrite import paths based on regex patterns",
      recommended: false,
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          patterns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from: { type: "string" },
                to: { type: "string" },
              },
              required: ["from", "to"],
              additionalProperties: false,
            },
            minItems: 1,
          },
        },
        required: ["patterns"],
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = context.options[0] || {};
    /**
     * Import patterns from options
     * @type {Array<{from: string, to: string}>}
     */
    const patterns = options.patterns || [];

    // Convert string patterns to RegExp objects
    /**
     * Maps import patterns to their corresponding regex and replacement rules.
     * @type {Array<{regex: RegExp, replacement: string}>}
     */
    const rewriteRules = patterns.map((pattern) => ({
      regex: new RegExp(pattern.from),
      replacement: pattern.to,
    }));

    // Process a source value and apply rewrite rules if it matches any pattern
    /**
     * @param {string} value - The import path to process
     * @returns {string|null} - The rewritten path or null if no rules match
     */
    function processSourceValue(value) {
      for (const rule of rewriteRules) {
        const match = value.match(rule.regex);
        if (match) {
          // Replace the matched pattern with the replacement
          const newValue = value.replace(rule.regex, rule.replacement);
          return newValue;
        }
      }
      return null;
    }

    // Check and report source paths for declarations
    /**
     * @param {import('estree').ImportDeclaration | import('estree').ExportAllDeclaration | import('estree').ExportNamedDeclaration} node - The AST node
     */
    function checkSourcePath(node) {
      if (!node.source || typeof node.source.value !== "string") {
        return;
      }

      const sourceValue = node.source.value;
      const rewrittenPath = processSourceValue(sourceValue);

      if (rewrittenPath && node.source) {
        context.report({
          node: node.source,
          message: `Import path "${sourceValue}" should be rewritten to "${rewrittenPath}"`,
          fix(fixer) {
            // Get the quote character used in the original source
            const sourceCode = context.getSourceCode();
            // Ensure node.source is defined before getting its text
            const sourceText = sourceCode.getText(node.source ?? undefined);
            const quoteChar = sourceText[0]; // First character is the opening quote

            return fixer.replaceText(
              node.source,
              `${quoteChar}${rewrittenPath}${quoteChar}`,
            );
          },
        });
      }
    }

    return {
      ImportDeclaration: checkSourcePath,
      ExportAllDeclaration: checkSourcePath,
      ExportNamedDeclaration: checkSourcePath,
    };
  },
};

module.exports = rule;
