import type { Plugin } from "vite";

export function viteMockAssetPlugin(): Plugin {
  const re = /\.(m4a|mp3|wav|ogg|jpe?g|png|gif|svg)$/i;
  const prefix = `\0asset-mock:`;

  return {
    name: `vite-mock-asset`,
    enforce: `pre`,
    resolveId(id, importer = ``) {
      if (re.test(id)) {
        return prefix + importer + id;
      }
      return null;
    },
    load(id) {
      if (id.startsWith(prefix)) {
        return `export default { uri: "mock-uri" }`;
      }
      return null;
    },
  };
}
