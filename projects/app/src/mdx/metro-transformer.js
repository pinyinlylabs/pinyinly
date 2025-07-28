// @ts-check

import makeDebug from "debug";
import { visit } from "unist-util-visit";

const debug = makeDebug(`pinyinly:mdx:transform`);

/**
 * Generates template string from raw MDX string
 * @param {string} rawMdxString - The raw MDX string to transform
 * @returns {string} The templated MDX string
 */
const getTemplate = (rawMdxString) => {
  return `"use client";
${rawMdxString
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
  //   const _components = {
  //     ..._provideComponents(),
  //     ...props.components
  //   };
  .replaceAll(/(const _components = \{\s+).+?(\.\.\.)/gms, `$1$2`)
  // Add a default implementation for all missing MDX components to make
  // debugging easier.
  //
  // Replace:
  //
  // if (!Example) _missingMdxReference("Example", true);
  //
  // with:
  //
  // Example ??= _makeExpoMetroProvided("Example", _components);
  .replaceAll(
    /if \(!([\w.]+)\) _missingMdxReference\("([\w.]+)", true\);/g,
    `$1 ??= _makeExpoMetroProvided("$2", _components);`,
  )}

function _makeExpoMetroProvided(name, _components) {
  return function MDXExpoMetroComponent(props) {
    console.warn("Component " + name + " was not imported, exported, or provided by MDXProvider as global scope")
    return <_components.span {...props}/>;
  };
}
`;
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
 * Creates an MDX transformer for Metro bundler
 * @param {Object} options - Configuration options
 * @param {function({filename: string, src: string}): boolean} [options.matchFile] - Function to determine if a file should be transformed
 * @param {function(string): boolean} [options.matchLocalAsset] - Function to determine if an asset URL is local
 * @param {PluggableList} [options.remarkPlugins] - List of remark plugins
 * @returns {MetroBabelTransformer} The transformer object with a transform method
 */
export function createTransformer({
  matchFile = (props) => !!/\.mdx?$/.test(props.filename),
  matchLocalAsset = (url) => !!/^[.@]/.test(url),
  remarkPlugins = [],
} = {}) {
  /**
   * Custom plugin for handling image paths in MDX
   * @returns {function(Node): void} A transformer function
   */
  function expoMdxPlugin() {
    return (tree) => {
      visit(tree, `image`, (/** @type {ImageNode} */ node) => {
        if (matchLocalAsset(node.url)) {
          // Relative path should be turned into a require statement:
          node.url = `EXPO_REQUIRE__${Buffer.from(node.url, `utf-8`).toString(`base64`)}__`;
        }
      });
    };
  }

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
      providerImportSource: `@bacons/mdx`,
      remarkPlugins: [...remarkPlugins, expoMdxPlugin],
    });

    return _compiler;
  }

  /**
   * Transform function for Metro bundler
   * @type {MetroBabelTransformer['transform']}
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

    if (typeof contents === `string`) {
      contents = contents.replaceAll(
        // Rewrite JSX attributes of `="EXPO_REQUIRE__<base64>"` to `={require(<string>)}`.
        /="EXPO_REQUIRE__(.*)__"/g,
        (_match, /** @type {string} */ p1) => {
          return `={require(${JSON.stringify(Buffer.from(p1, `base64`).toString(`utf-8`))})}`;
        },
      );
    }

    const result = {
      ...props,
      src: getTemplate(contents.toString()),
    };

    debug(`Compiled MDX file:`, result.filename, `\n`, result.src);

    return result;
  };

  return { transform };
}

export const transform = createTransformer().transform;

/**
 * @typedef {Object} MetroBabelTransformer
 * @property {function({filename: string, src: string}): Promise<{filename: string, src: string}>} transform - Transform function
 */
