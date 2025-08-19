import makeDebug from "debug";
import { walk } from "estree-walker";
import remarkFlexibleMarkers from "remark-flexible-markers";
import type { createProcessor } from "@mdx-js/mdx";
import type { Program } from "estree";
import type { PluggableList } from "unified";

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

export interface CreateTransformerOptions {
  /** Function to determine if a file should be transformed */
  matchFile?: (props: MetroBabelTransformerProps) => boolean;
  /** Function to determine if an asset URL is local */
  matchLocalAsset?: (url: string) => boolean;
  /** List of remark plugins */
  remarkPlugins?: PluggableList;
  /** The import source for MDX components */
  providerImportSource?: string;
}

/**
 * Creates an MDX transformer for Metro bundler
 */
export function createTransformer({
  matchFile = (props) => /\.mdx?$/.test(props.filename),
  matchLocalAsset = (url) => /^[.@]/.test(url),
  providerImportSource,
  remarkPlugins = [],
}: CreateTransformerOptions = {}): MetroBabelTransformer {
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
      providerImportSource,
      remarkPlugins,
      recmaPlugins: [[jsxSrcAttributePlugin, { matchLocalAsset }]],
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

export const transform = createTransformer({
  providerImportSource: `@/client/hooks/useMDXComponents`,
  remarkPlugins: [
    [remarkFlexibleMarkers, { markerClassName: `pyly-mdx-mark` }],
  ],
});