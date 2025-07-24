/**
 * @typede  meta: {
    type: "problem",
    docs: {
      description:
        "Ensures template-generated code is in sync with files in a directory, using <pyly-glob-template> comments.",
    },
    fixable: "code",
    schema: [],
  },('eslint').Rule.RuleContext} RuleContext
 * @typedef {import('eslint').Rule.Node} Node
 * @typedef {import('estree').Literal} Literal
 * @typedef {import('estree').TemplateLiteral} TemplateLiteral
 * @typedef {import('eslint').Rule.RuleModule} RuleModule
 * @typedef {import('eslint').Rule.RuleContext} RuleContext
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
        "Ensures require arrays are in sync with files in a directory, using <pyly-glob-template> comments.",
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
          // This regex needs to handle > characters within attribute values
          const openTagMatch = comment.value.match(
            /<pyly-glob-template((?:\s+[a-zA-Z0-9_-]+\s*=\s*"(?:[^"\\]|\\.)*")*)\s*>/,
          );
          if (!openTagMatch) continue;
          const attrs = (openTagMatch[1] || "").trim();
          // Parse attributes (robust, any order)
          let dir = null;
          let globPattern = null;
          let template = null;
          let attrError = false;
          if (attrs) {
            // Match all key="value" pairs, handling escaped quotes
            const attrPairs = Array.from(
              attrs.matchAll(/([a-zA-Z0-9_-]+)\s*=\s*"((?:[^"\\]|\\.)*)"/g),
            );
            const attrMap = Object.fromEntries(
              attrPairs.map(([_, k, v]) => [k, v]),
            );
            const keys = Object.keys(attrMap);
            // Remove all matched key="value" pairs from the string
            const cleanedAttrs = attrs
              .replace(/([a-zA-Z0-9_-]+)\s*=\s*"((?:[^"\\]|\\.)*)"/g, "")
              .trim();
            // Must have dir, glob, and template, no extra attributes or leftover text
            const validAttrs = ["dir", "glob", "template"];
            const hasRequiredAttrs =
              keys.includes("dir") &&
              keys.includes("glob") &&
              keys.includes("template");
            const hasValidAttrs = keys.every((key) => validAttrs.includes(key));
            const hasValues = attrMap.dir && attrMap.glob && attrMap.template;

            if (
              !hasRequiredAttrs ||
              !hasValidAttrs ||
              !hasValues ||
              cleanedAttrs.length > 0
            ) {
              attrError = true;
            } else {
              dir = attrMap.dir;
              globPattern = attrMap.glob;
              template = attrMap.template
                .replace(/\\\$/g, "$")
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'"); // Unescape dollar signs and quotes
            }
          } else {
            attrError = true;
          }
          if (attrError || !dir || !globPattern || !template) {
            context.report({
              loc: comment.loc || { line: 1, column: 0 },
              message: `<pyly-glob-template> must have dir, glob, and template attributes, e.g. <pyly-glob-template dir="./icons" glob="*.svg" template="  require('\${path}'),">. Template variables: \${path}, \${pathWithoutExt}, \${filenameWithoutExt}, \${parentDir}`,
            });
            continue;
          }

          // Find the closing comment
          let closeIdx = i + 1;
          let closeComment = null;
          while (closeIdx < comments.length) {
            if (
              comments[closeIdx] &&
              comments[closeIdx]?.value.includes("</pyly-glob-template>")
            ) {
              closeComment = comments[closeIdx];
              break;
            }
            closeIdx++;
          }
          if (!closeComment) continue;

          // Find the array node that contains this comment (optional for template use cases)
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
          // Continue even if no array node is found (for non-array use cases)

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

          // Build the expected lines using the template
          const generatedLines = files.map((f) => {
            let requirePath = dir.replace(/\/$/, "");
            requirePath = requirePath ? `${requirePath}/${f}` : f;
            // Only add ./ if not already relative (doesn't start with ./ or ../)
            if (
              !requirePath.startsWith("./") &&
              !requirePath.startsWith("../")
            ) {
              requirePath = `./${requirePath}`;
            }

            // Get filename without extension (for variable names)
            const filenameWithoutExt = path
              .basename(f)
              .replace(/\.[^/.]+$/, "");

            // Get path without extension (for $pathWithoutExt compatibility)
            const pathWithoutExt = requirePath.replace(/\.[^/.]+$/, "");

            // Get parent directory name (last directory in the path)
            const parentDir = path.basename(path.dirname(requirePath));

            // Replace template variables
            let result = template;
            result = result.replace(
              /\$\{filenameWithoutExt\}/g,
              filenameWithoutExt,
            );
            result = result.replace(/\$\{pathWithoutExt\}/g, pathWithoutExt);
            result = result.replace(/\$\{path\}/g, requirePath);
            result = result.replace(/\$\{parentDir\}/g, parentDir);
            return result;
          });

          // Find the range to replace
          if (!comment.range || !closeComment.range) continue;
          const start = comment.range[1];
          const end = closeComment.range[0];
          const between = sourceCode.text.slice(start, end);

          // Extract actual content lines from the code between comments
          const actualLines = between
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

          // Compare
          const isOutOfSync =
            actualLines.length !== generatedLines.length ||
            actualLines.some(
              (line, idx) => line !== generatedLines[idx]?.trim(),
            );

          if (isOutOfSync) {
            context.report({
              loc: comment.loc || arrayNode?.loc || { line: 1, column: 0 },
              message: `Generated code is out of sync with files in ${dir}`,
              fix: (fixer) =>
                fixer.replaceTextRange(
                  [start, end],
                  "\n" +
                    generatedLines.join("\n") +
                    (generatedLines.length ? "\n" : ""),
                ),
            });
          }
        }
      },
    };
  },
};

module.exports = rule;
