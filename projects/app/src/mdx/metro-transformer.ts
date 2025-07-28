import type { createProcessor } from "@mdx-js/mdx";
import makeDebug from "debug";
import type { PluggableList } from "unified";
import type { Node } from "unist";
import { visit } from "unist-util-visit";

const debug = makeDebug(`pinyinly:mdx:transform`);

const getTemplate = (rawMdxString: string) => {
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

interface ImageNode extends Node {
  url: string;
  alt: string;
  title: string | null;
  type: `image`;
}

export function createTransformer({
  matchFile = (props) => !!/\.mdx?$/.test(props.filename),
  matchLocalAsset = (url) => !!/^[.@]/.test(url),
  remarkPlugins = [],
}: {
  /**
   * @param props Metro transform props.
   * @returns true if the file should be transformed.
   * @default Function that matches if a file ends with `.mdx` or `.md`.
   */
  matchFile?: (props: { filename: string; src: string }) => boolean;
  /**
   * @returns true if the src reference should be converted to a local `require`.
   * @default Function that matches strings starting with `.` or `@`.
   */
  matchLocalAsset?: (url: string) => boolean;
  remarkPlugins?: PluggableList;
} = {}) {
  function expoMdxPlugin() {
    return (tree: Node) => {
      visit(tree, `image`, (node: ImageNode) => {
        if (matchLocalAsset(node.url)) {
          // Relative path should be turned into a require statement:
          node.url = `EXPO_REQUIRE__${Buffer.from(node.url, `utf-8`).toString(`base64`)}__`;
        }
      });
    };
  }

  let _compiler: ReturnType<typeof createProcessor> | undefined;

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

  const transform: MetroBabelTransformer[`transform`] = async (props) => {
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
        (_match, p1: string) => {
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

export interface MetroBabelTransformer {
  transform: (args: { filename: string; src: string }) => Promise<{
    filename: string;
    src: string;
  }>;
}
