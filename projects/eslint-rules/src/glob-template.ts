/**
 * @fileoverview Ensures require arrays are in sync with files in a directory, using template comments
 */

import type { Rule } from "eslint";
import { globSync } from "glob";
import { existsSync, statSync } from "node:fs";
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
        for (let i = 0; i < comments.length; i++) {
          const comment = comments[i];
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
          const attrs = (openTagMatch[1] ?? ``).trim();
          // Parse attributes (robust, any order)
          let globPath: string | null = null;
          let template: string | null = null;
          let attrError = false;
          if (attrs.length > 0) {
            // Match all key="value" pairs, handling escaped quotes
            const attrPairs = [
              ...attrs.matchAll(/([a-zA-Z0-9_-]+)\s*=\s*"((?:[^"\\]|\\.)*)"/g),
            ];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const attrMap = Object.fromEntries(
              attrPairs.map(([_, k, v]) => [k, v] as const),
            );
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const keys = Object.keys(attrMap);
            // Remove all matched key="value" pairs from the string
            const cleanedAttrs = attrs
              .replaceAll(/([a-zA-Z0-9_-]+)\s*=\s*"((?:[^"\\]|\\.)*)"/g, ``)
              .trim();
            // Only allow glob and template attributes
            const validAttrs = new Set([`glob`, `template`]);
            const hasValidAttrs = keys.every((key) => validAttrs.has(key));
            const hasGlobAttr = keys.includes(`glob`);
            const hasTemplateAttr = keys.includes(`template`);
            const hasRequiredAttrs = hasGlobAttr && hasTemplateAttr;

            if (
              !hasRequiredAttrs ||
              !hasValidAttrs ||
              cleanedAttrs.length > 0
            ) {
              attrError = true;
            } else {
              // Use the glob path directly
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              globPath = attrMap.glob ?? null;

              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              template =
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                attrMap.template === undefined
                  ? null // Unescape dollar signs and quotes
                  : // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    attrMap.template
                      .replaceAll(String.raw`\$`, `$`)
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                      .replaceAll(String.raw`\"`, `"`)
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                      .replaceAll(String.raw`\'`, `'`);
            }
          } else {
            attrError = true;
          }
          if (attrError || globPath === null || template === null) {
            context.report({
              loc: comment.loc ?? { line: 1, column: 0 },
              message: `<pyly-glob-template> must have glob and template attributes, e.g. <pyly-glob-template glob="./icons/*.svg" template="  require('\${path}'),">. Available variables: \${path}, \${pathWithoutExt}, \${filenameWithoutExt}, \${parentDir}, \${relpath}, \${relpathWithoutExt}. You can also use JavaScript expressions like \${path.split('.')[0]} or \${relpath.replace(/-/g, '_')}`,
            });
            continue;
          }

          // Find the closing comment
          let closeIdx = i + 1;
          let closeComment = null;
          while (closeIdx < comments.length) {
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            if (comments[closeIdx]?.value.includes(`</pyly-glob-template>`)) {
              closeComment = comments[closeIdx];
              break;
            }
            closeIdx++;
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
                const lastSepBeforeGlob = Math.max(
                  globPath.lastIndexOf(`/`, globIndex),
                  globPath.lastIndexOf(`\\`, globIndex),
                );

                if (lastSepBeforeGlob === -1) {
                  globDir = `.`;
                  globPattern = globPath;
                } else {
                  globDir = globPath.slice(0, Math.max(0, lastSepBeforeGlob));
                  globPattern = globPath.slice(
                    Math.max(0, lastSepBeforeGlob + 1),
                  );
                }
              }
            }

            // Resolve the directory relative to the current file
            const targetDir = path.resolve(fileDir, globDir);

            // Store the globDir for path construction later
            // globDir is already defined

            // Verify directory exists
            if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
              throw new Error(`Not a directory`);
            }

            // Get matching files
            files = globSync(globPattern, { cwd: targetDir }).sort();
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
            // eslint-disable-next-line unicorn/no-negated-condition
            requirePath = requirePath !== `` ? `${requirePath}/${f}` : f;
            // Only add ./ if not already relative (doesn't start with ./ or ../)
            if (
              !requirePath.startsWith(`./`) &&
              !requirePath.startsWith(`../`)
            ) {
              requirePath = `./${requirePath}`;
            }

            // Get filename without extension (for variable names)
            const filenameWithoutExt = path
              .basename(f)
              .replace(/\.[^/.]+$/, ``);

            // Get path without extension (for $pathWithoutExt compatibility)
            const pathWithoutExt = requirePath.replace(/\.[^/.]+$/, ``);

            // Get parent directory name (last directory in the path)
            const parentDir = path.basename(path.dirname(requirePath));

            // Get the relative path (path without the static glob directory part)
            const relPath = f;

            // Get relative path without extension
            const relPathWithoutExt = f.replace(/\.[^/.]+$/, ``);

            // Create context for evaluating expressions
            const context = {
              filenameWithoutExt,
              pathWithoutExt,
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
                  // eslint-disable-next-line @typescript-eslint/no-implied-eval
                  const evaluator = new Function(...keys, `return ${expr};`);

                  // Execute the function with our context variables
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
              (line, idx) => line !== generatedLines[idx]?.trim(),
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
