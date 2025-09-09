import type { createProcessor } from "@mdx-js/mdx";
import makeDebug from "debug";
import type { Program } from "estree";
import { walk } from "estree-walker";
import remarkFlexibleMarkers from "remark-flexible-markers";
import remarkGfm from "remark-gfm";

const debug = makeDebug(`pinyinly:mdx:transform`);

export interface MetroBabelTransformerProps {
  filename: string;
  src: string;
}

export type MetroBabelTransformer = (
  props: MetroBabelTransformerProps,
) => Promise<MetroBabelTransformerProps>;

/**
 * Generates template string from raw MDX string
 */
const getTemplate = (rawMdxString: string): string => {
  return (
    rawMdxString
      // Remove default HTML components:
      //
      // Replace:
      //
      //   const _components = {
      //     h1: "h1",
      //     p: "p",
      //     ..._provideComponents(),
      //     ...props.components
      //   };
      //
      // With:
      //
      //   const _components = Object.assign(Object.create(_provideComponents()), props.components);
      //
      // This allows `_provideComponents()` to return a `Proxy` object and provide better
      // debugging for missing components.
      .replace(
        /const _components = \{.+?\}/ms,
        `const _components = Object.assign(Object.create(_provideComponents()), props.components)`,
      )
      // Delete all the default implement safe guards because Proxy will be used instead.
      //
      // Replace:
      //
      // if (!Example) _missingMdxReference("Example", true);
      //
      // with:
      //
      // <nothing>
      .replaceAll(
        /if \(!([\w.]+)\) _missingMdxReference\("([\w.]+)", true\);\s*/gs,
        ``,
      )
  );
};

/**
 * Custom recma plugin for handling src attributes in JSX elements
 */
function jsxSrcAttributePlugin({
  matchLocalAsset,
  matchAttributeName = (name) => /(src|source)$/i.test(name),
}: {
  matchLocalAsset: (url: string) => boolean;
  matchAttributeName?: (name: string) => boolean;
}) {
  return (tree: Program) => {
    walk(tree, {
      enter(node) {
        if (
          node.type === `JSXAttribute` &&
          node.name.type === `JSXIdentifier` &&
          matchAttributeName(node.name.name) &&
          node.value?.type === `Literal` &&
          typeof node.value.value === `string` &&
          matchLocalAsset(node.value.value)
        ) {
          // Transform the string literal into a JSX expression with require()
          node.value = {
            type: `JSXExpressionContainer`,
            expression: {
              type: `CallExpression`,
              callee: {
                type: `Identifier`,
                name: `require`,
              },
              arguments: [
                {
                  type: `Literal`,
                  value: node.value.value,
                  raw: JSON.stringify(node.value.value),
                },
              ],
              optional: false,
            },
          };
        }
      },
    });
  };
}

/**
 * Custom recma plugin to hoist require() calls to top-level imports for Vitest compatibility
 * @returns {function(import('estree').Program): void} A transformer function
 */
function hoistRequiresPlugin() {
  return (tree: Program) => {
    /** Map from module path to import variable name */
    const moduleToVariable = new Map<string, string>();
    let importCounter = 0;

    /**
     * Generate a unique variable name for a module path
     * @param modulePath - The module path to import
     * @returns A unique variable name
     */
    function generateVariableName(modulePath: string): string {
      // Create a base name from the module path
      const basename = modulePath
        .replace(/^[./@]+/, ``) // Remove leading ./ @ characters
        .replace(/\.[^.]*$/, ``) // Remove file extension
        .replaceAll(/[^a-zA-Z0-9]/g, `_`) // Replace non-alphanumeric with underscore
        .replace(/^(\d)/, `_$1`) // Prefix with underscore if starts with digit
        .replaceAll(/_{2,}/g, `_`) // Collapse multiple underscores
        .replaceAll(/^_+|_+$/g, ``); // Remove leading/trailing underscores

      const candidateName = basename || `asset`;
      let variableName = `__mdx_import_${candidateName}_${importCounter++}`;

      // Ensure uniqueness (though collision is very unlikely with counter)
      while ([...moduleToVariable.values()].includes(variableName)) {
        variableName = `__mdx_import_${candidateName}_${importCounter++}`;
      }

      return variableName;
    }

    // First pass: collect all require() calls
    walk(tree, {
      enter(node) {
        if (
          node.type === `CallExpression` &&
          node.callee.type === `Identifier` &&
          node.callee.name === `require` &&
          node.arguments.length === 1
        ) {
          const firstArg = node.arguments[0];
          if (
            firstArg &&
            firstArg.type === `Literal` &&
            typeof firstArg.value === `string`
          ) {
            const modulePath = firstArg.value;
            if (!moduleToVariable.has(modulePath)) {
              const variableName = generateVariableName(modulePath);
              moduleToVariable.set(modulePath, variableName);
            }
          }
        }
      },
    });

    // Second pass: replace require() calls with variable references
    walk(tree, {
      enter(node) {
        if (
          node.type === `CallExpression` &&
          node.callee.type === `Identifier` &&
          node.callee.name === `require` &&
          node.arguments.length === 1
        ) {
          const firstArg = node.arguments[0];
          if (
            firstArg &&
            firstArg.type === `Literal` &&
            typeof firstArg.value === `string`
          ) {
            const modulePath = firstArg.value;
            const variableName = moduleToVariable.get(modulePath);
            if (variableName !== undefined) {
              // Replace the entire CallExpression with an Identifier
              Object.assign(node, {
                type: `Identifier`,
                name: variableName,
              });
            }
          }
        }
      },
    });

    // Add import declarations to the beginning of the program
    if (moduleToVariable.size > 0) {
      const importDeclarations = [];
      for (const [modulePath, variableName] of moduleToVariable.entries()) {
        importDeclarations.push({
          type: `ImportDeclaration` as const,
          specifiers: [
            {
              type: `ImportDefaultSpecifier` as const,
              local: {
                type: `Identifier` as const,
                name: variableName,
              },
            },
          ],
          source: {
            type: `Literal` as const,
            value: modulePath,
            raw: JSON.stringify(modulePath),
          },
          attributes: [], // Required property for ImportDeclaration
        });
      }

      // Insert imports after any existing imports but before other statements
      let insertIndex = 0;
      for (let i = 0; i < tree.body.length; i++) {
        if (tree.body[i]?.type === `ImportDeclaration`) {
          insertIndex = i + 1;
        } else {
          break;
        }
      }

      tree.body.splice(insertIndex, 0, ...importDeclarations);
    }
  };
}

/** Function to determine if a file should be transformed */
const matchFile = (props: MetroBabelTransformerProps) =>
  /\.mdx?$/.test(props.filename);

/** Function to determine if an asset URL is local */
const matchLocalAsset = (url: string) => /^[.@]/.test(url);

/**
 * Creates an MDX transformer for Metro bundler
 */
function createTransformer(): MetroBabelTransformer {
  /** Cached MDX compiler */
  let _compiler: Awaited<ReturnType<typeof createProcessor>> | undefined;

  /**
   * Creates or returns the cached MDX compiler
   */
  async function createCompiler() {
    if (_compiler) {
      return _compiler;
    }

    const { createProcessor } = await import(`@mdx-js/mdx`);
    _compiler = createProcessor({
      jsx: true,
      providerImportSource: `@/client/hooks/useMDXComponents`,
      remarkPlugins: [
        [remarkFlexibleMarkers, { markerClassName: `pyly-mdx-mark` }],
        [remarkGfm],
      ],
      recmaPlugins: [
        [jsxSrcAttributePlugin, { matchLocalAsset }],
        [hoistRequiresPlugin],
      ],
    });

    return _compiler;
  }

  /**
   * Transform function for Metro bundler
   */
  const transform: MetroBabelTransformer = async (props) => {
    if (!matchFile(props)) {
      return props;
    }

    const compiler = await createCompiler();

    const { value: contents } = await compiler.process({
      value: props.src,
      path: props.filename,
    });

    const result = {
      ...props,
      src: getTemplate(contents.toString()),
    };

    debug(`Compiled MDX file:`, result.filename, `\n`, result.src);

    return result;
  };

  return transform;
}

export const transform = createTransformer();
