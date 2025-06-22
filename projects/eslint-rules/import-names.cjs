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
 *
 * @typedef {import('eslint').Rule.RuleContext} RuleContext
 * @typedef {import('eslint').Rule.Node} Node
 * @typedef {import('estree').ImportDeclaration} ImportDeclaration
 * @typedef {import('estree').ImportSpecifier} ImportSpecifier
 * @typedef {import('estree').ImportDefaultSpecifier} ImportDefaultSpecifier
 * @typedef {import('eslint').Rule.RuleModule} RuleModule
 */

/** @type {RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce specific naming conventions for default and named imports from specified modules",
      recommended: true,
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          defaultImports: {
            type: "object",
            additionalProperties: {
              type: "string",
            },
          },
          namedImports: {
            type: "object",
            additionalProperties: {
              type: "object",
              additionalProperties: {
                type: "string",
              },
            },
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
    const defaultImportsConfig = options.defaultImports || {};
    const namedImportsConfig = options.namedImports || {};

    return {
      /**
       * @param {ImportDeclaration} node
       */
      ImportDeclaration(node) {
        const sourceValue = node.source.value;
        // TypeScript needs string assertion because node.source.value could be various types
        const moduleSource =
          typeof sourceValue === "string" ? sourceValue : String(sourceValue);
        const expectedDefaultName = defaultImportsConfig[moduleSource];
        const expectedNamedImports = namedImportsConfig[moduleSource] || {};

        // Check for namespace imports (wildcard imports) and disallow them for configured modules
        const hasConfigForThisModule =
          expectedDefaultName || Object.keys(expectedNamedImports).length > 0;

        if (hasConfigForThisModule) {
          const namespaceSpecifier = node.specifiers.find(
            (s) => s.type === "ImportNamespaceSpecifier",
          );

          if (namespaceSpecifier) {
            context.report({
              node: namespaceSpecifier,
              message: `Namespace import (import * as X) is not allowed for "${sourceValue}". Use specific named or default imports instead.`,
              // No fix provided as there's no straightforward way to convert wildcard to specific imports
            });
          }
        }

        // Check default imports
        if (expectedDefaultName) {
          const defaultSpecifier = node.specifiers.find(
            (s) => s.type === "ImportDefaultSpecifier",
          );

          if (
            defaultSpecifier &&
            defaultSpecifier.local.name !== expectedDefaultName
          ) {
            const badDefaultName = defaultSpecifier.local.name;

            context.report({
              node: defaultSpecifier,
              message: `Default import from "${sourceValue}" must be named "${expectedDefaultName}".`,
              fix(fixer) {
                const sourceCode = context.getSourceCode();
                const references = sourceCode.getDeclaredVariables(node);

                const fixes = [
                  fixer.replaceText(
                    defaultSpecifier.local,
                    expectedDefaultName,
                  ),
                ];

                references.forEach((variable) => {
                  if (variable.name === badDefaultName) {
                    variable.references.forEach((ref) => {
                      fixes.push(
                        fixer.replaceText(ref.identifier, expectedDefaultName),
                      );
                    });
                  }
                });

                return fixes;
              },
            });
          }
        }

        // Check named imports
        if (Object.keys(expectedNamedImports).length > 0) {
          node.specifiers.forEach((specifier) => {
            if (specifier.type === "ImportSpecifier") {
              // Use type assertion since imported can be either an Identifier or a string literal
              const importedIdentifier = specifier.imported;
              const importedName =
                "name" in importedIdentifier
                  ? importedIdentifier.name
                  : importedIdentifier.value &&
                      typeof importedIdentifier.value === "string"
                    ? importedIdentifier.value
                    : "";
              const localName = specifier.local.name;
              const expectedName = expectedNamedImports[importedName];

              if (expectedName && localName !== expectedName) {
                context.report({
                  node: specifier,
                  message: `Named import "${importedName}" from "${sourceValue}" must be named "${expectedName}".`,

                  // Skip fixing named imports that are already properly aliased (i.e., `import { x as y }`)
                  // This is because we can't easily detect if the import is already correctly aliased in the syntax
                  // Only fix if the local name is truly different from the expected name
                  fix: function (fixer) {
                    const sourceCode = context.getSourceCode();
                    const references = sourceCode.getDeclaredVariables(node);
                    const fixes = [];

                    // If the imported name and local name already match the pattern of `import { name as alias }`,
                    // we should be careful about modifying it
                    const importedHasName = "name" in specifier.imported;
                    if (
                      importedName === expectedName &&
                      importedHasName &&
                      importedName === specifier.local.name
                    ) {
                      // Skip fixing explicitly aliased imports that are already correct
                      return null;
                    } else {
                      // For regular named imports that need to be renamed
                      fixes.push(
                        fixer.replaceText(specifier.local, expectedName),
                      );

                      references.forEach((variable) => {
                        if (variable.name === localName) {
                          variable.references.forEach((ref) => {
                            fixes.push(
                              fixer.replaceText(ref.identifier, expectedName),
                            );
                          });
                        }
                      });

                      return fixes;
                    }
                  },
                });
              }
            }
          });
        }
      },
    };
  },
};

module.exports = rule;
