import { cachedManifestLoader, findSpriteSegment } from "#manifestRead.ts";
import * as fs from "@pinyinly/lib/fs";
import { invariant } from "@pinyinly/lib/invariant";
import type { MetroConfig } from "metro-config";
import type { CustomResolutionContext, Resolution } from "metro-resolver";
import type DependencyGraph from "metro/private/node-haste/DependencyGraph";
import crypto from "node:crypto";
import path from "node:path";

interface WithAudioSpritesOptions {
  manifestPath: string;
  cachePath: string;
}

export function withAudioSprites<T extends MetroConfig>(
  config: T,
  options: WithAudioSpritesOptions,
): T {
  const proxyDirPath = path.resolve(options.cachePath);

  const loadCachedManifest = cachedManifestLoader(options.manifestPath);

  return {
    ...config,

    resolver: {
      ...config.resolver,
      resolveRequest(context, moduleName, platform): Resolution {
        patchMetroSha1(context, proxyDirPath);

        const parentResolver =
          config.resolver?.resolveRequest ?? context.resolveRequest;

        const modulePath = path.resolve(
          path.dirname(context.originModulePath),
          moduleName,
        );

        //
        // Case 1 -- intercept require(…) from our proxy files.
        //
        if (path.dirname(context.originModulePath) === proxyDirPath) {
          //
          // Case 1.1 -- deleted sprites
          //
          // In this case all proxy files that reference the sprite should be
          // deleted so that they can be regenerated with the correct sprite.

          if (!fs.existsSync(modulePath)) {
            // The target sprite has been deleted. When a sprite is deleted it
            // picks just one "origin" module to re-perform the resolution. So
            // we need to find all the other "origin" modules (proxy files) and
            // delete them so that they are re-resolved too. They'll be
            // generated on-the-fly when they're resolved.
            for (const path of fs.grepSync(`${proxyDirPath}/*`, moduleName)) {
              // Unlinking (or renaming) the module is necessary to retrigger
              // metro resolution.
              //
              // However there's a race condition where Metro might try to hash
              // the file, so this can something cause errors. But refreshing
              // the page fixes it.
              fs.unlinkSync(path);
            }

            // Return an empty module for the deleted sprite to avoid crashing
            // the page, it's a better DX.
            return { type: `empty` };
          }

          // Otherwise allow the normal resolution to proceed.
          return parentResolver(context, moduleName, platform);
        }

        //
        // Case 2 -- Requiring an audio file e.g. `require("./shang.m4a")`
        //
        if (moduleName.endsWith(`.m4a`)) {
          // Check the manifest to see if it's part of a sprite, and if it is,
          // we need to load the sprite instead. To do this we generate a proxy
          // module that includes the timing (start/duration) information as
          // well as requiring the sprite asset.

          const manifest = loadCachedManifest();

          if (manifest != null) {
            const segment = findSpriteSegment(
              manifest,
              options.manifestPath,
              modulePath,
            );

            if (segment) {
              const proxyFilePath = writeProxyFileSync(
                segment,
                modulePath,
                proxyDirPath,
              );

              return { type: `sourceFile`, filePath: proxyFilePath };
            }
          }
        }

        return parentResolver(context, moduleName, platform);
      },
    },
  };
}

type Patchable<T, K extends keyof T> = Omit<T, K> &
  Record<K, T[K] & { __pinyinly_patch?: unknown }>;

function patchMetroSha1(
  context: CustomResolutionContext,
  proxyDirPath: string,
) {
  invariant(
    `graph` in context,
    `Metro is missing patch to expose \`DependencyGraph\` in \`resolveRequest\``,
  );
  const graph = context.graph as Patchable<DependencyGraph, `getOrComputeSha1`>;

  if (graph.getOrComputeSha1.__pinyinly_patch == null) {
    const getOrComputeSha1 = graph.getOrComputeSha1.bind(graph);

    // Metro has a crawler which looks at all the files on the filesystem and
    // then caches them in memory in the node-haste graph. When `resolveRequest`
    // returns a resolution to a module, it needs to compute the SHA1 hash of
    // the file contents to ensure that the cache is invalidated when the file
    // changes.
    //
    // However Metro trusts its internal cache and doesn't re-read the file
    // contents unless it has to. This means Metro is out of sync with the real
    // filesystem by the time it calls `getOrComputeSha1` because it only
    // updates its in-memory cache async from the filesystem events, which don't
    // happen immediately because Metro is generally synchronous.
    //
    // So this code patches the `getOrComputeSha1` function to always return a
    // new SHA1 hash for proxy files.
    graph.getOrComputeSha1 = async function (mixedPath: string) {
      if (mixedPath.startsWith(proxyDirPath)) {
        return { sha1: `${Date.now()}` };
      }
      return await getOrComputeSha1(mixedPath);
    };
    graph.getOrComputeSha1.__pinyinly_patch = true;
  }
}

function writeProxyFileSync(
  segment: NonNullable<ReturnType<typeof findSpriteSegment>>,
  modulePath: string,
  proxyDirPath: string,
): string {
  const key = crypto
    .createHash(`sha1`)
    .update(modulePath)
    .digest(`hex`)
    .slice(0, 16);

  // Instead of an opaque proxy module, include part of the original filename
  // for easier debugging.
  const debugPrefix = path.basename(modulePath, path.extname(modulePath));
  const outFilePath = path.join(proxyDirPath, `${debugPrefix}-${key}.cjs`);

  const code = `\
// auto-generated by pinyinly
module.exports = {
  start: ${JSON.stringify(segment.start)},
  duration: ${JSON.stringify(segment.duration)},
  asset: require(${JSON.stringify(path.relative(proxyDirPath, segment.spritePath))})
};`;

  // Always create the directory in case it was deleted by the developer.
  fs.mkdirSync(proxyDirPath, { recursive: true });
  fs.writeUtf8FileIfChangedSync(outFilePath, code);

  return outFilePath;
}
