declare module "fs/promises" {
  function glob(
    pattern: string | string[],
    options?: { cwd?: string; exclude?: (path: string) => boolean },
  ): AsyncIterable<string>;
}
