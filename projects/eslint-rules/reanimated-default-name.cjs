/**
 * @typedef {import('eslint').Rule.RuleContext} RuleContext
 * @typedef {import('eslint').Rule.Node} Node
 * @typedef {import('estree').ImportDeclaration} ImportDeclaration
 * @typedef {import('eslint').Rule.RuleModule} RuleModule
 */

/** @type {RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce default import from react-native-reanimated to be named Reanimated",
    },
    fixable: "code",
    schema: [], // no options
  },

  /**
   * @param {RuleContext} context
   */
  create(context) {
    return {
      /**
       * @param {ImportDeclaration} node
       */
      ImportDeclaration(node) {
        if (
          node.source.value === "react-native-reanimated" &&
          node.specifiers.some(
            (specifier) =>
              specifier.type === "ImportDefaultSpecifier" &&
              specifier.local.name !== "Reanimated",
          )
        ) {
          const badSpecifier = node.specifiers.find(
            (s) =>
              s.type === "ImportDefaultSpecifier" &&
              s.local.name !== "Reanimated",
          );

          if (badSpecifier) {
            context.report({
              node: badSpecifier,
              message: `Default import from "react-native-reanimated" must be named "Reanimated".`,
              fix(fixer) {
                const sourceCode = context.getSourceCode();
                const references = sourceCode.getDeclaredVariables(node);

                const fixes = [
                  fixer.replaceText(badSpecifier.local, "Reanimated"),
                ];

                references.forEach((variable) => {
                  variable.references.forEach((ref) => {
                    if (ref.identifier.name === badSpecifier.local.name) {
                      fixes.push(
                        fixer.replaceText(ref.identifier, "Reanimated"),
                      );
                    }
                  });
                });

                return fixes;
              },
            });
          }
        }
      },
    };
  },
};

module.exports = rule;
