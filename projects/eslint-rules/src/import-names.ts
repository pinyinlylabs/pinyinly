/**
 * @fileoverview Enforce naming conventions for imports
 *
 * This rule allows enforcing specific naming conventions for both default imports
 * and named imports from specified modules. It is configurable through options
 * and supports auto-fixing. Configuration must be provided for the rule to enforce any naming.
 *
 * Additionally, for any module that has naming conventions configured (either default or named imports),
 * namespace imports (wildcard imports like `import * as X`) are forbidden to prevent bypass of the naming rules.
 *
 * This rule also supports TypeScript type imports, enforcing naming conventions for:
 * - import type { Something } from 'module';
 * - import type Something from 'module';
 *
 * @example
 *
 * // Enforce default import from 'react' to be named 'React'
 * // enforce: import React from 'react';
 * // disallow: import MyReact from 'react';
 * { "import-names": ["error", { "defaultImports": { "react": "React" } }] }
 *
 * // Enforce default import from 'react-native-reanimated' to be named 'Reanimated'
 * // enforce: import Reanimated from 'react-native-reanimated';
 * // disallow: import Animation from 'react-native-reanimated';
 * { "import-names": ["error", { "defaultImports": { "react-native-reanimated": "Reanimated" } }] }
 *
 * // Enforce named import 'useState' from 'react' to be named 'useState'
 * // enforce: import { useState } from 'react'; or import { useState as useState } from 'react';
 * // disallow: import { useState as useStateAlias } from 'react';
 * { "import-names": ["error", { "namedImports": { "react": { "useState": "useState" } } }] }
 */

import type { Rule } from "eslint";
import type { ImportDeclaration, ImportDefaultSpecifier } from "estree";

interface ImportNamesOptions {
  defaultImports?: Record<string, string>;
  namedImports?: Record<string, Record<string, string>>;
}

const rule: Rule.RuleModule = {
  meta: {
    type: `problem`,
    docs: {
      description: `Enforce specific naming conventions for default and named imports from specified modules`,
      recommended: true,
    },
    fixable: `code`,
    schema: [
      {
        type: `object`,
        properties: {
          defaultImports: {
            type: `object`,
            additionalProperties: {
              type: `string`,
            },
          },
          namedImports: {
            type: `object`,
            additionalProperties: {
              type: `object`,
              additionalProperties: {
                type: `string`,
              },
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context: Rule.RuleContext) {
    const options = (context.options[0] ?? {}) as ImportNamesOptions;
    const defaultImportsConfig = options.defaultImports ?? {};
    const namedImportsConfig = options.namedImports ?? {};

    return {
      ImportDeclaration(node: ImportDeclaration) {
        const sourceValue = node.source.value;
        // TypeScript needs string assertion because node.source.value could be various types
        const moduleSource =
          typeof sourceValue === `string` ? sourceValue : String(sourceValue);
        const expectedDefaultName = defaultImportsConfig[moduleSource];
        const expectedNamedImports = namedImportsConfig[moduleSource] ?? {};

        // Check for namespace imports (wildcard imports) and disallow them for configured modules
        const hasConfigForThisModule =
          Boolean(expectedDefaultName) ||
          Object.keys(expectedNamedImports).length > 0;

        if (hasConfigForThisModule) {
          const namespaceSpecifier = node.specifiers.find(
            (s) => s.type === `ImportNamespaceSpecifier`,
          );

          if (namespaceSpecifier) {
            context.report({
              node: namespaceSpecifier,
              message: `Namespace import (import * as X) is not allowed for "${String(sourceValue)}". Use specific named or default imports instead.`,
              // No fix provided as there's no straightforward way to convert wildcard to specific imports
            });
          }
        }

        // Check default imports
        if (expectedDefaultName !== undefined) {
          const defaultSpecifier = node.specifiers.find(
            (s): s is ImportDefaultSpecifier =>
              s.type === `ImportDefaultSpecifier`,
          );

          if (
            defaultSpecifier &&
            defaultSpecifier.local.name !== expectedDefaultName
          ) {
            const badDefaultName = defaultSpecifier.local.name;

            context.report({
              node: defaultSpecifier,
              message: `Default import from "${String(sourceValue)}" must be named "${expectedDefaultName}".`,
              fix(fixer) {
                const sourceCode = context.sourceCode;
                const references = sourceCode.getDeclaredVariables(node);

                const fixes = [
                  fixer.replaceText(
                    defaultSpecifier.local,
                    expectedDefaultName,
                  ),
                ];

                for (const variable of references) {
                  if (variable.name === badDefaultName) {
                    for (const ref of variable.references) {
                      fixes.push(
                        fixer.replaceText(ref.identifier, expectedDefaultName),
                      );
                    }
                  }
                }

                return fixes;
              },
            });
          }
        }

        // Check named imports
        if (Object.keys(expectedNamedImports).length > 0) {
          for (const specifier of node.specifiers) {
            if (specifier.type === `ImportSpecifier`) {
              // Use type assertion since imported can be either an Identifier or a string literal
              const importedIdentifier = specifier.imported;
              const importedName =
                `name` in importedIdentifier
                  ? importedIdentifier.name
                  : Boolean(importedIdentifier.value) &&
                      typeof importedIdentifier.value === `string`
                    ? importedIdentifier.value
                    : ``;
              const localName = specifier.local.name;
              const expectedName = expectedNamedImports[importedName];

              if (expectedName !== undefined && localName !== expectedName) {
                context.report({
                  node: specifier,
                  message: `Named import "${importedName}" from "${String(sourceValue)}" must be named "${expectedName}".`,

                  // Skip fixing named imports that are already properly aliased (i.e., `import { x as y }`)
                  // This is because we can't easily detect if the import is already correctly aliased in the syntax
                  // Only fix if the local name is truly different from the expected name
                  fix(fixer) {
                    const sourceCode = context.sourceCode;
                    const scope = sourceCode.getScope(node);
                    const fixes = [];

                    // For named imports, we need to update both the import specifier and all references
                    fixes.push(
                      fixer.replaceText(specifier.local, expectedName),
                    );

                    // Find all references to the local variable name
                    const variable = scope.set.get(localName);
                    if (variable) {
                      for (const ref of variable.references) {
                        if (ref.identifier !== specifier.local) {
                          fixes.push(
                            fixer.replaceText(ref.identifier, expectedName),
                          );
                        }
                      }
                    }

                    return fixes;
                  },
                });
              }
            }
          }
        }
      },
    };
  },
};

export { rule as importNames };
