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

import type { CreateOnceRule, ESTree } from "@oxlint/plugins";

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

const rule: CreateOnceRule = {
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

  createOnce(context) {
    // `context.options` is only populated once the file starts linting, so
    // rebuild the rewrite rules in `before()` rather than here.
    let rewriteRules: RewriteRule[] = [];

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
      node:
        | ESTree.ImportDeclaration
        | ESTree.ExportAllDeclaration
        | ESTree.ExportNamedDeclaration,
    ) {
      if (node.source === null || typeof node.source.value !== `string`) {
        return;
      }
      const source = node.source;

      const sourceValue = source.value;
      const rewrittenPath = processSourceValue(sourceValue);

      if (rewrittenPath !== null) {
        context.report({
          node: source,
          message: `Import path "${sourceValue}" should be rewritten to "${rewrittenPath}"`,
          fix(fixer) {
            // Get the quote character used in the original source
            const sourceCode = context.sourceCode;
            const sourceText = sourceCode.getText(source);
            const quoteChar = sourceText[0] ?? `'`; // First character is the opening quote

            return fixer.replaceText(
              source,
              `${quoteChar}${rewrittenPath}${quoteChar}`,
            );
          },
        });
      }
    }

    return {
      before() {
        // Types claim `context.options` is never nullish, but it is `null` here at runtime.
        // oxlint-disable-next-line typescript/no-unnecessary-condition
        const options = (context.options?.[0] ??
          {}) as ImportPathRewriteOptions;
        const patterns = options.patterns ?? [];

        // Convert string patterns to RegExp objects
        rewriteRules = patterns.map((pattern) => ({
          regex: new RegExp(pattern.from, `u`),
          replacement: pattern.to,
        }));
      },
      ImportDeclaration: checkSourcePath,
      ExportAllDeclaration: checkSourcePath,
      ExportNamedDeclaration: checkSourcePath,
    };
  },
};

export { rule as importPathRewrite };
