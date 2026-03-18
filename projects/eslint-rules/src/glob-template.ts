/**
 * @fileoverview Ensures require arrays are in sync with files in a directory, using template comments
 */

import * as fs from "@pinyinly/lib/fs";
import type { Rule } from "eslint";
import path from "node:path";

const rule: Rule.RuleModule = {
  meta: {
    type: `problem`,
    docs: {
      description: `Ensures require arrays are in sync with files in a directory, using <pyly-glob-template> comments.`,
    },
    fixable: `code`,
    schema: [],
  },

  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    return {
      Program() {
        const comments = sourceCode.getAllComments();
        for (let index = 0; index < comments.length; index++) {
          const comment = comments[index];
          if (comment === undefined) {
            continue;
          }
          // Match the opening tag and capture attributes
          // This regex needs to handle > characters within attribute values
          const openTagMatch =
            /<pyly-glob-template((?:\s+[a-zA-Z0-9_-]+\s*=\s*"(?:[^"\\]|\\.)*")*)\s*>/.exec(
              comment.value,
            );
          if (!openTagMatch) {
            continue;
          }
          const attributes = (openTagMatch[1] ?? ``).trim();
          // Parse attributes (robust, any order)
          let globPath: string | null = null;
          let template: string | null = null;
          let attributeError = false;
          if (attributes.length > 0) {
            // Match all key="value" pairs, handling escaped quotes
            const attributePairs = [
              ...attributes.matchAll(
                /([a-zA-Z0-9_-]+)\s*=\s*"((?:[^"\\]|\\.)*)"/g,
              ),
            ];
            // oxlint-disable-next-line typescript/no-unsafe-assignment
            const attributeMap = Object.fromEntries(
              attributePairs.map(([_, k, v]) => [k, v] as const),
            );
            // oxlint-disable-next-line typescript/no-unsafe-argument
            const keys = Object.keys(attributeMap);
            // Remove all matched key="value" pairs from the string
            const cleanedAttributes = attributes
              .replaceAll(/([a-zA-Z0-9_-]+)\s*=\s*"((?:[^"\\]|\\.)*)"/g, ``)
              .trim();
            // Only allow glob and template attributes
            const validAttributes = new Set([`glob`, `template`]);
            const hasValidAttributes = keys.every((key) =>
              validAttributes.has(key),
            );
            const hasGlobAttribute = keys.includes(`glob`);
            const hasTemplateAttribute = keys.includes(`template`);
            const hasRequiredAttributes =
              hasGlobAttribute && hasTemplateAttribute;

            if (
              !hasRequiredAttributes ||
              !hasValidAttributes ||
              cleanedAttributes.length > 0
            ) {
              attributeError = true;
            } else {
              // Use the glob path directly
              // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-member-access
              globPath = attributeMap.glob ?? null;

              // oxlint-disable-next-line typescript/no-unsafe-assignment
              template =
                // oxlint-disable-next-line typescript/no-unsafe-member-access
                attributeMap.template === undefined
                  ? null // Unescape dollar signs and quotes
                  : // oxlint-disable-next-line typescript/no-unsafe-member-access, typescript/no-unsafe-call
                    attributeMap.template
                      .replaceAll(String.raw`\$`, `$`)
                      // oxlint-disable-next-line typescript/no-unsafe-member-access
                      .replaceAll(String.raw`\"`, `"`)
                      // oxlint-disable-next-line typescript/no-unsafe-member-access
                      .replaceAll(String.raw`\'`, `'`);
            }
          } else {
            attributeError = true;
          }
          if (attributeError || globPath === null || template === null) {
            context.report({
              loc: comment.loc ?? { line: 1, column: 0 },
              message: `<pyly-glob-template> must have glob and template attributes, e.g. <pyly-glob-template glob="./icons/*.svg" template="  require('\${path}'),">. Available variables: \${path}, \${pathWithoutExt}, \${filenameWithoutExt}, \${parentDir}, \${relpath}, \${relpathWithoutExt}. You can also use JavaScript expressions like \${path.split('.')[0]} or \${relpath.replace(/-/g, '_')}`,
            });
            continue;
          }

          // Find the closing comment
          let closeIndex = index + 1;
          let closeComment = null;
          while (closeIndex < comments.length) {
            // oxlint-disable-next-line typescript/strict-boolean-expressions
            if (comments[closeIndex]?.value.includes(`</pyly-glob-template>`)) {
              closeComment = comments[closeIndex];
              break;
            }
            closeIndex++;
          }
          if (!closeComment) {
            continue;
          }

          // Find the array node that contains this comment (optional for template use cases)
          const tokens = sourceCode.getTokensBefore(comment, {
            includeComments: false,
            count: 10,
          });
          let arrayNode = null;
          tokens.reverse();
          for (const token of tokens) {
            if (token.type === `Punctuator` && token.value === `[`) {
              // Try to find the array node
              const node = sourceCode.getNodeByRangeIndex(token.range[0]);
              if (node?.type === `ArrayExpression`) {
                arrayNode = node;
                break;
              }
            }
          }
          // Continue even if no array node is found (for non-array use cases)

          // Get all files in the glob pattern
          const filePath = context.filename;
          const fileDir = path.dirname(filePath);
          let files: string[] = [];
          let globDir: string;
          let globPattern: string;
          try {
            // Parse the glob pattern to extract directory part and pattern

            // Handle absolute paths differently
            if (path.isAbsolute(globPath)) {
              const lastSeparatorIndex = Math.max(
                globPath.lastIndexOf(`/`),
                globPath.lastIndexOf(`\\`),
              );
              if (lastSeparatorIndex >= 0) {
                globDir = globPath.slice(0, Math.max(0, lastSeparatorIndex));
                globPattern = globPath.slice(
                  Math.max(0, lastSeparatorIndex + 1),
                );
              } else {
                globDir = `.`;
                globPattern = globPath;
              }
            } else {
              // For relative paths, find the last directory separator before any glob character
              const globIndex = Math.min(
                globPath.includes(`*`)
                  ? globPath.indexOf(`*`)
                  : Number.POSITIVE_INFINITY,
                globPath.includes(`?`)
                  ? globPath.indexOf(`?`)
                  : Number.POSITIVE_INFINITY,
                globPath.includes(`[`)
                  ? globPath.indexOf(`[`)
                  : Number.POSITIVE_INFINITY,
              );

              if (globIndex === Number.POSITIVE_INFINITY) {
                // No glob characters, treat the whole path as directory
                globDir = globPath;
                globPattern = `*`;
              } else {
                const lastSeparatorBeforeGlob = Math.max(
                  globPath.lastIndexOf(`/`, globIndex),
                  globPath.lastIndexOf(`\\`, globIndex),
                );

                if (lastSeparatorBeforeGlob === -1) {
                  globDir = `.`;
                  globPattern = globPath;
                } else {
                  globDir = globPath.slice(
                    0,
                    Math.max(0, lastSeparatorBeforeGlob),
                  );
                  globPattern = globPath.slice(
                    Math.max(0, lastSeparatorBeforeGlob + 1),
                  );
                }
              }
            }

            // Resolve the directory relative to the current file
            const targetDir = path.resolve(fileDir, globDir);

            // Store the globDir for path construction later
            // globDir is already defined

            // Verify directory exists
            if (
              !fs.existsSync(targetDir) ||
              !fs.statSync(targetDir).isDirectory()
            ) {
              throw new Error(`Not a directory`);
            }

            // Get matching files
            files = fs.globSync(globPattern, { cwd: targetDir }).sort();
          } catch (error: unknown) {
            const errorMessage =
              error !== null && typeof error === `object` && `message` in error
                ? (error as Error).message
                : String(error);
            context.report({
              loc: comment.loc ?? arrayNode?.loc ?? { line: 1, column: 0 },
              message: `Could not process glob pattern: ${globPath}. ${errorMessage}`,
            });
            continue;
          }

          // Build the expected lines using the template
          const generatedLines = files.map((f) => {
            let requirePath = globDir.replace(/\/$/, ``);
            // oxlint-disable-next-line no-negated-condition
            requirePath = requirePath !== `` ? `${requirePath}/${f}` : f;
            // Only add ./ if not already relative (doesn't start with ./ or ../)
            if (
              !requirePath.startsWith(`./`) &&
              !requirePath.startsWith(`../`)
            ) {
              requirePath = `./${requirePath}`;
            }

            // Get filename without extension (for variable names)
            const filenameWithoutExtension = path
              .basename(f)
              .replace(/\.[^/.]+$/, ``);

            // Get path without extension (for $pathWithoutExt compatibility)
            const pathWithoutExtension = requirePath.replace(/\.[^/.]+$/, ``);

            // Get parent directory name (last directory in the path)
            const parentDir = path.basename(path.dirname(requirePath));

            // Get the relative path (path without the static glob directory part)
            const relPath = f;

            // Get relative path without extension
            const relPathWithoutExt = f.replace(/\.[^/.]+$/, ``);

            // Create context for evaluating expressions
            const context = {
              filenameWithoutExt: filenameWithoutExtension,
              pathWithoutExt: pathWithoutExtension,
              path: requirePath,
              parentDir,
              relpath: relPath,
              relpathWithoutExt: relPathWithoutExt,
            };

            // Replace template variables with evaluated expressions
            let result = template;

            // First try to handle as expression evaluation (safer than eval)
            result = result.replaceAll(
              /\$\{([^}]+)\}/g,
              (match, expr: string) => {
                try {
                  // Create a function with the context variables as arguments
                  const keys = Object.keys(context);
                  const values = Object.values(context);

                  // Create a function that evaluates the expression in the given context
                  // This is safer than using eval() directly
                  // oxlint-disable-next-line typescript/no-implied-eval
                  const evaluator = new Function(...keys, `return ${expr};`);

                  // Execute the function with our context variables
                  // oxlint-disable-next-line typescript/no-unsafe-call
                  return evaluator(...values) as string;
                } catch {
                  // If evaluation fails, return the original expression
                  return match;
                }
              },
            );
            return result;
          });

          // Find the range to replace
          if (comment.range === undefined || closeComment.range === undefined) {
            continue;
          }
          const start = comment.range[1];
          const end = closeComment.range[0];
          const between = sourceCode.text.slice(start, end);

          // Extract actual content lines from the code between comments
          const actualLines = between
            .split(`\n`)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

          // Compare
          const isOutOfSync =
            actualLines.length !== generatedLines.length ||
            actualLines.some(
              (line, index) => line !== generatedLines[index]?.trim(),
            );

          if (isOutOfSync) {
            context.report({
              loc: comment.loc ?? arrayNode?.loc ?? { line: 1, column: 0 },
              message: `Generated code is out of sync with files matching ${globPath}`,
              fix: (fixer) =>
                fixer.replaceTextRange(
                  [start, end],
                  `\n` +
                    generatedLines.join(`\n`) +
                    (generatedLines.length > 0 ? `\n` : ``),
                ),
            });
          }
        }
      },
    };
  },
};

export { rule as globTemplate };
