// @ts-check

import makeDebug from "debug";
import { walk } from "estree-walker";
import remarkFlexibleMarkers from "remark-flexible-markers";

const debug = makeDebug(`pinyinly:mdx:transform`);

/**
 * Generates template string from raw MDX string
 * @param {string} rawMdxString - The raw MDX string to transform
 * @returns {string} The templated MDX string
 */
const getTemplate = (rawMdxString) => {
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
      //   const _components = Object.create(_provideComponents(), props.components);
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
 * @typedef {import('unist').Node} Node
 * @typedef {import('unified').PluggableList} PluggableList
 * @typedef {import('@mdx-js/mdx').createProcessor} createProcessorType
 *
 * @typedef {Object} ImageNode
 * @property {string} url - The URL of the image
 * @property {string} alt - Alt text for the image
 * @property {string|null} title - Optional title for the image
 * @property {'image'} type - The type of node
 */

/**
 * Custom recma plugin for handling src attributes in JSX elements
 * @param {Object} options - Configuration options
 * @param {function(string): boolean} options.matchLocalAsset - Function to determine if an asset URL is local
 * @param {function(string): boolean} [options.matchAttributeName] - Function to determine if an attribute name is a source
 * @returns {function(import('estree').Program): void} A transformer function
 */
function jsxSrcAttributePlugin({
  matchLocalAsset,
  matchAttributeName = (name) => /(src|source)$/i.test(name),
}) {
  return (tree) => {
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
 * Creates an MDX transformer for Metro bundler
 * @param {Object} options - Configuration options
 * @param {function({filename: string, src: string}): boolean} [options.matchFile] - Function to determine if a file should be transformed
 * @param {function(string): boolean} [options.matchLocalAsset] - Function to determine if an asset URL is local
 * @param {PluggableList} [options.remarkPlugins] - List of remark plugins
 * @param {import("@mdx-js/mdx").ProcessorOptions["providerImportSource"]} [options.providerImportSource] - The import source for MDX components
 * @returns {MetroBabelTransformer} The transformer function
 */
export function createTransformer({
  matchFile = (props) => /\.mdx?$/.test(props.filename),
  matchLocalAsset = (url) => /^[.@]/.test(url),
  providerImportSource,
  remarkPlugins = [],
} = {}) {
  /** @type {ReturnType<typeof import('@mdx-js/mdx').createProcessor>|undefined} */
  let _compiler;

  /**
   * Creates or returns the cached MDX compiler
   * @returns {Promise<ReturnType<typeof import('@mdx-js/mdx').createProcessor>>} The MDX compiler
   */
  async function createCompiler() {
    if (_compiler) {
      return _compiler;
    }

    const { createProcessor } = await import(`@mdx-js/mdx`);
    _compiler = createProcessor({
      jsx: true,
      providerImportSource,
      remarkPlugins,
      recmaPlugins: [[jsxSrcAttributePlugin, { matchLocalAsset }]],
    });

    return _compiler;
  }

  /**
   * Transform function for Metro bundler
   * @type {MetroBabelTransformer}
   */
  const transform = async (props) => {
    if (!matchFile(props)) {
      return props;
    }

    const compiler = await createCompiler();

    let { value: contents } = await compiler.process({
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

export const transform = createTransformer({
  providerImportSource: `@/client/hooks/useMDXComponents`,
  remarkPlugins: [
    [remarkFlexibleMarkers, { markerClassName: `pyly-mdx-mark` }],
  ],
});

/**
 * @typedef {function({filename: string, src: string}): Promise<{filename: string, src: string}>} MetroBabelTransformer
 */
