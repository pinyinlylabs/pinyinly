import type { ConfigAPI, PluginItem, PluginPass } from "@babel/core";
import { types as t } from "@babel/core";
import { invariant } from "@pinyinly/lib/invariant";
import { LRUCache } from "lru-cache";
import type { DeepReadonly } from "ts-essentials";
import { findAudioSegment, loadManifest } from "./manifestRead.ts";
import type {
  AudioSpriteSource,
  BabelPluginOptions,
  SpriteManifest,
} from "./types.ts";

// eslint-disable-next-line import/no-default-export
export default function expoAudioSpritesPreset(
  api: ConfigAPI,
  options?: BabelPluginOptions,
) {
  api.assertVersion(7);

  invariant(options != null);
  const { manifestPath } = options;
  return {
    plugins: [[audioAssetPlugin, { manifestPath }]],
  };
}

const audioAssetPlugin = (
  _babel: unknown,
  options?: BabelPluginOptions,
): PluginItem => {
  invariant(options != null, `plugin options must be provided`);

  // Cache manifests by path with a short TTL
  const manifestCache = new LRUCache<string, CachedManifest>({
    max: 10, // Max 10 different manifest files
    ttl: 1000, // 1 second TTL

    // When the cache is getting hammered (e.g. during a build) extend the TTL of
    // the manifest cache.
    updateAgeOnGet: true,
  });

  return {
    name: `@pinyinly/expo-audio-sprites`,
    visitor: {
      CallExpression(astNodePath, { filename }: PluginPass) {
        const { node } = astNodePath;

        // Only transform require() calls
        if (!t.isIdentifier(node.callee, { name: `require` })) {
          return;
        }

        // Only transform if there's exactly one string argument
        if (
          node.arguments.length !== 1 ||
          !t.isStringLiteral(node.arguments[0])
        ) {
          return;
        }

        const requirePath = node.arguments[0].value;

        // Only transform .m4a files
        if (!requirePath.endsWith(`.m4a`)) {
          return;
        }

        // Prevent infinite recursion: check if this require() is already inside an audio sprite object
        // We do this by checking if the parent is an ObjectProperty with key "asset"
        if (
          t.isObjectProperty(astNodePath.parent) &&
          t.isIdentifier(astNodePath.parent.key, { name: `asset` })
        ) {
          return;
        }

        // Get current file path from Babel state
        invariant(filename != null, `No filename available in Babel state`);
        const manifest = getCachedManifest(manifestCache, options.manifestPath);

        // Check if manifest was loaded successfully
        if (manifest === null) {
          // No manifest found, leave require() call unchanged
          return;
        }

        // Use the extracted function to find the audio segment
        const segmentInfo = findAudioSegment(
          manifest,
          options.manifestPath,
          filename,
          requirePath,
        );

        if (segmentInfo === null) {
          // File not found in manifest or invalid, leave require() call unchanged
          return;
        }

        const { segment, spriteFilePath: normalizedSpriteFilePath } =
          segmentInfo;
        const { start: startTime, duration } = segment;

        // Create the transformed AST with data from manifest
        // Transform: require('./audio.m4a')
        // To: { kind: "audiosprite", start: <from manifest>, duration: <from manifest>, asset: require(<sprite file>) }
        const transformedNode = t.objectExpression([
          t.objectProperty(
            t.identifier(
              `type` satisfies keyof Pick<AudioSpriteSource, `type`>,
            ),
            t.stringLiteral(`audiosprite` satisfies AudioSpriteSource[`type`]),
          ),
          t.objectProperty(
            t.identifier(
              `start` satisfies keyof Pick<AudioSpriteSource, `start`>,
            ),
            t.numericLiteral(startTime),
          ),
          t.objectProperty(
            t.identifier(
              `duration` satisfies keyof Pick<AudioSpriteSource, `duration`>,
            ),
            t.numericLiteral(duration),
          ),
          t.objectProperty(
            t.identifier(
              `asset` satisfies keyof Pick<AudioSpriteSource, `asset`>,
            ),
            t.callExpression(t.identifier(`require`), [
              t.stringLiteral(normalizedSpriteFilePath),
            ]),
          ),
        ]);

        // Replace the original require() call with our transformed object
        astNodePath.replaceWith(transformedNode);
      },
    },
  };
};

interface CachedManifest {
  manifest: DeepReadonly<SpriteManifest> | null;
}

type ManifestLRUCache = LRUCache<string, CachedManifest>;

function getCachedManifest(
  cache: ManifestLRUCache,
  manifestPath: string,
): DeepReadonly<SpriteManifest> | null {
  const cached = cache.get(manifestPath);

  if (cached) {
    return cached.manifest;
  }

  // Cache miss or expired - load fresh
  const manifest = loadManifest(manifestPath);
  cache.set(manifestPath, {
    manifest,
  });

  return manifest;
}
