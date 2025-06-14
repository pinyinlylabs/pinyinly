/**
 * @typedef {import('eslint').Rule.RuleContext} RuleContext
 * @typedef {import('eslint').Rule.Node} Node
 * @typedef {import('estree').Literal} Literal
 * @typedef {import('estree').TemplateLiteral} TemplateLiteral
 * @typedef {import('eslint').Rule.RuleModule} RuleModule
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");

/** @type {RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensures require arrays are in sync with files in a directory, using <hhh-require-glob> comments.",
    },
    fixable: "code",
    schema: [],
  },

  /**
   * @param {RuleContext} context
   */
  create(context) {
    const sourceCode = context.getSourceCode();
    return {
      Program() {
        const comments = sourceCode.getAllComments() || [];
        for (let i = 0; i < comments.length; i++) {
          const comment = comments[i];
          if (!comment) continue;
          // Match the opening tag and capture attributes
          const openTagMatch = comment.value.match(/<hhh-require-glob([^>]*)>/);
          if (!openTagMatch) continue;
          const attrs = (openTagMatch[1] || "").trim();
          // Parse attributes (robust, any order, only dir and glob allowed)
          let dir = null;
          let globPattern = null;
          let attrError = false;
          if (attrs) {
            // Match all key="value" pairs
            const attrPairs = Array.from(
              attrs.matchAll(/([a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"/g),
            );
            const attrMap = Object.fromEntries(
              attrPairs.map(([_, k, v]) => [k, v]),
            );
            const keys = Object.keys(attrMap);
            // Remove all matched key="value" pairs from the string
            const cleanedAttrs = attrs
              .replace(/([a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"/g, "")
              .trim();
            // Must have exactly dir and glob, no more, no less, and no leftover text
            if (
              keys.length !== 2 ||
              !keys.includes("dir") ||
              !keys.includes("glob") ||
              !attrMap.dir ||
              !attrMap.glob ||
              cleanedAttrs.length > 0
            ) {
              attrError = true;
            } else {
              dir = attrMap.dir;
              globPattern = attrMap.glob;
            }
          } else {
            attrError = true;
          }
          if (attrError || !dir || !globPattern) {
            context.report({
              loc: comment.loc || { line: 1, column: 0 },
              message: `<hhh-require-glob> must have both dir and glob attributes, and only those attributes, e.g. <hhh-require-glob dir=\"./icons\" glob=\"*.svg\">`,
            });
            continue;
          }

          // Find the closing comment
          let closeIdx = i + 1;
          let closeComment = null;
          while (closeIdx < comments.length) {
            if (
              comments[closeIdx] &&
              comments[closeIdx]?.value.includes("</hhh-require-glob>")
            ) {
              closeComment = comments[closeIdx];
              break;
            }
            closeIdx++;
          }
          if (!closeComment) continue;

          // Find the array node that contains this comment
          const tokens =
            sourceCode.getTokensBefore(comment, {
              includeComments: false,
              count: 10,
            }) || [];
          let arrayNode = null;
          for (const token of tokens.reverse()) {
            if (token.type === "Punctuator" && token.value === "[") {
              // Try to find the array node
              const node = sourceCode.getNodeByRangeIndex(token.range[0]);
              if (node && node.type === "ArrayExpression") {
                arrayNode = node;
                break;
              }
            }
          }
          if (!arrayNode) continue;

          // Get all files in the directory
          const filePath = context.getFilename();
          const fileDir = path.dirname(filePath);
          const targetDir = path.resolve(fileDir, dir);
          let files = [];
          try {
            // Explicitly check if targetDir exists and is a directory
            if (
              !fs.existsSync(targetDir) ||
              !fs.statSync(targetDir).isDirectory()
            ) {
              throw new Error("Not a directory");
            }
            files = glob.sync(globPattern, { cwd: targetDir }).sort();
          } catch (e) {
            context.report({
              loc: comment.loc || arrayNode?.loc || { line: 1, column: 0 },
              message: `Could not read directory: ${targetDir}`,
            });
            continue;
          }

          // Build the expected require lines
          // Use the dir parameter for the require path, converting to an alias if needed
          const requireLines = files.map((f) => {
            let requirePath = dir.replace(/\/$/, "");
            requirePath = requirePath ? `${requirePath}/${f}` : f;
            // Only add ./ if not already relative (doesn't start with ./ or ../)
            if (
              !requirePath.startsWith("./") &&
              !requirePath.startsWith("../")
            ) {
              requirePath = `./${requirePath}`;
            }
            return `  require(\`${requirePath}\`),`;
          });

          // Find the range to replace
          if (!comment.range || !closeComment.range) continue;
          const start = comment.range[1];
          const end = closeComment.range[0];
          const between = sourceCode.text.slice(start, end);
          const actualRequires = between.match(/require\([^\)]+\),?/g) || [];

          // Compare
          const isOutOfSync =
            actualRequires.length !== requireLines.length ||
            actualRequires.some(
              (line, idx) => line.trim() !== requireLines[idx]?.trim(),
            );

          if (isOutOfSync) {
            context.report({
              loc: comment.loc || arrayNode.loc || { line: 1, column: 0 },
              message: `Require array is out of sync with files in ${dir}`,
              fix: (fixer) =>
                fixer.replaceTextRange(
                  [start, end],
                  "\n" +
                    requireLines.join("\n") +
                    (requireLines.length ? "\n" : ""),
                ),
            });
          }
        }
      },
    };
  },
};

module.exports = rule;
