import { readFile } from "@pinyinly/lib/fs";
import type { Plugin } from "vite";
import { transform } from "./metro-transformer.js";

/**
 * Vite plugin that uses the same MDX transformer as Metro for faithful testing
 */
export function viteMdxPlugin(): Plugin {
  const query = `?mdx-compiled&lang.tsx`;

  return {
    name: `vite-mdx`,
    enforce: `pre`,

    async load(id) {
      // Serve the compiled submodule
      if (id.endsWith(query)) {
        const fsPath = id.slice(0, -query.length);
        const code = await readFile(fsPath, `utf-8`);

        // Transform it using Metro transformer
        const { src } = await transform({
          filename: fsPath,
          src: code,
        });

        return src;
      }

      // Make the real .mdx file re-export its compiled submodule
      if (id.endsWith(`.mdx`)) {
        const compiled = JSON.stringify(id + query);
        return `export { default } from ${compiled}; export * from ${compiled};`;
      }

      return null;
    },
  };
}
