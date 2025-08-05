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

import type { Rule } from "eslint";
import type {
  ExportAllDeclaration,
  ExportNamedDeclaration,
  ImportDeclaration,
} from "estree";

interface PatternConfig {
  from: string;
  to: string;
}

interface ImportPathRewriteOptions {
  patterns?: PatternConfig[];
}

interface RewriteRule {
  regex: RegExp;
  replacement: string;
}

const rule: Rule.RuleModule = {
  meta: {
    type: `suggestion`,
    docs: {
      description: `Rewrite import paths based on regex patterns`,
      recommended: false,
    },
    fixable: `code`,
    schema: [
      {
        type: `object`,
        properties: {
          patterns: {
            type: `array`,
            items: {
              type: `object`,
              properties: {
                from: { type: `string` },
                to: { type: `string` },
              },
              required: [`from`, `to`],
              additionalProperties: false,
            },
            minItems: 1,
          },
        },
        required: [`patterns`],
        additionalProperties: false,
      },
    ],
  },

  create(context: Rule.RuleContext) {
    const options = (context.options[0] ?? {}) as ImportPathRewriteOptions;
    const patterns = options.patterns ?? [];

    // Convert string patterns to RegExp objects
    const rewriteRules: RewriteRule[] = patterns.map((pattern) => ({
      regex: new RegExp(pattern.from),
      replacement: pattern.to,
    }));

    // Process a source value and apply rewrite rules if it matches any pattern
    function processSourceValue(value: string): string | null {
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
    function checkSourcePath(
      node: ImportDeclaration | ExportAllDeclaration | ExportNamedDeclaration,
    ) {
      if (
        node.source === null ||
        node.source === undefined ||
        typeof node.source.value !== `string`
      ) {
        return;
      }

      const sourceValue = node.source.value;
      const rewrittenPath = processSourceValue(sourceValue);

      if (rewrittenPath !== null) {
        context.report({
          node: node.source,
          message: `Import path "${sourceValue}" should be rewritten to "${rewrittenPath}"`,
          fix(fixer) {
            // Get the quote character used in the original source
            const sourceCode = context.sourceCode;
            const sourceText = sourceCode.getText(node.source ?? undefined);
            const quoteChar = sourceText[0] ?? `'`; // First character is the opening quote

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

export { rule as importPathRewrite };
