import type { ConfigAPI, PluginItem } from "@babel/core";
import { types as t } from "@babel/core";
import { invariant } from "@pinyinly/lib/invariant";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import nodePath from "node:path";
import type { BabelPluginOptions, SpriteManifest } from "./types.js";
import { spriteManifestSchema } from "./types.js";

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

const loadManifest = (manifestPath: string): SpriteManifest | null => {
  try {
    const manifestContent = fs.readFileSync(manifestPath, `utf-8`);
    const rawManifest = JSON.parse(manifestContent) as unknown;

    // Validate the manifest structure using Zod
    const parseResult = spriteManifestSchema.parse(rawManifest);

    return parseResult;
  } catch (error) {
    console.error(
      `Failed to load or parse sprite manifest at ${manifestPath}:`,
      error,
    );
    return {
      spriteFiles: [],
      segments: {},
    };
  }
};

export const hashFile = (filePath: string): string => {
  const fileContent = fs.readFileSync(filePath);
  return hashFileContent(fileContent);
};

export const hashFileContent = (fileContent: string | Buffer): string => {
  return crypto.createHash(`sha256`).update(fileContent).digest(`hex`);
};

const audioAssetPlugin = (
  _babel: unknown,
  options?: BabelPluginOptions,
): PluginItem => {
  invariant(options != null, `plugin options must be provided`);

  // Load the manifest once when the plugin is created
  const manifest = loadManifest(options.manifestPath);

  return {
    name: `@pinyinly/audio-sprites`,
    visitor: {
      CallExpression(path, state) {
        const { node } = path;

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
          t.isObjectProperty(path.parent) &&
          t.isIdentifier(path.parent.key, { name: `asset` })
        ) {
          return;
        }

        // Get current file path from Babel state
        const babelState = state as { filename?: string };
        const currentFilePath = babelState.filename;
        invariant(
          currentFilePath != null,
          `No filename available in Babel state`,
        );
        if (currentFilePath.length === 0) {
          console.warn(
            `No filename available in Babel state, skipping sprite lookup`,
          );
          return;
        }

        // Check if manifest was loaded successfully
        if (manifest === null) {
          // No manifest found, leave require() call unchanged
          return;
        }

        // Resolve the require path relative to the current file being transformed
        const resolvedPath = nodePath.resolve(
          nodePath.dirname(currentFilePath),
          requirePath,
        );

        // Hash the resolved file content to look up in segments
        const requireHash = hashFile(resolvedPath);
        const segmentData = manifest.segments[requireHash];

        if (segmentData === undefined) {
          // File not found in manifest, leave require() call unchanged
          return;
        }

        // Extract sprite data from the segment: [spriteIndex, startTime, duration]
        const [spriteIndex, startTime, duration] = segmentData;
        const spriteFile = manifest.spriteFiles[spriteIndex];

        if (spriteFile === undefined) {
          console.warn(
            `Invalid sprite index ${spriteIndex} for segment ${requireHash}`,
          );
          return;
        }

        // Resolve the sprite file path relative to the manifest location
        const manifestDir = nodePath.dirname(options.manifestPath);
        const absoluteSpriteFilePath = nodePath.resolve(
          manifestDir,
          spriteFile,
        );

        // Make the sprite file path relative to the current file being transformed
        const currentFileDir = nodePath.dirname(currentFilePath);
        const relativeSpriteFilePath = nodePath.relative(
          currentFileDir,
          absoluteSpriteFilePath,
        );

        // Ensure the path starts with ./ or ../ for proper require resolution
        const normalizedSpriteFilePath = relativeSpriteFilePath.startsWith(`.`)
          ? relativeSpriteFilePath
          : `./${relativeSpriteFilePath}`;

        // Create the transformed AST with data from manifest
        // Transform: require('./audio.m4a')
        // To: { type: "audiosprite", start: <from manifest>, duration: <from manifest>, asset: require(<sprite file>) }
        const transformedNode = t.objectExpression([
          t.objectProperty(
            t.identifier(`type`),
            t.stringLiteral(`audiosprite`),
          ),
          t.objectProperty(t.identifier(`start`), t.numericLiteral(startTime)),
          t.objectProperty(
            t.identifier(`duration`),
            t.numericLiteral(duration),
          ),
          t.objectProperty(
            t.identifier(`asset`),
            t.callExpression(t.identifier(`require`), [
              t.stringLiteral(normalizedSpriteFilePath),
            ]),
          ),
        ]);

        // Replace the original require() call with our transformed object
        path.replaceWith(transformedNode);
      },
    },
  };
};
